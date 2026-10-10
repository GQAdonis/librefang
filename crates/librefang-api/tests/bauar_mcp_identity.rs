//! SOURCE ONLY: one isolated real-router scenario; execution is coordinator-gated.
//! Launch in a private process with LIBREFANG_ALLOW_NO_AUTH=1 and the synthetic
//! LIBREFANG_STATE_SECRET below and BAUAR_MCP_MODEL_KEY=MODEL; remove
//! API/dashboard credential overrides.
//! Local RSA/JWKS verifies existing signature/audience/role behavior, not issuer
//! binding, external IdP conformance, delegated identity, or remote MCP receivers.
//! Admin/Owner retain existing access to every registered agent; User/Viewer
//! denial is native MCP RBAC, not a claim of Admin cross-owner isolation.
//! Existing MCP wire version 2024-11-05 is unchanged; _meta is an extension.
//! UAR is explicitly absent here: configured UAR connections are not certified.
#![cfg(feature = "surreal-backend")]

use argon2::password_hash::rand_core::OsRng;
use axum::{extract::State, response::IntoResponse, routing::{get, post}, Router};
use base64::Engine;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use librefang_api::{password_hash, routes::AppState, server};
use librefang_kernel::{audit::AuditLog, LibreFangKernel};
use librefang_storage::StorageConfig;
use librefang_types::{agent::{AgentManifest, UserId}, config::{DefaultModelConfig,
    ExternalAuthConfig, KernelConfig, OidcProvider}, user_policy::UserToolPolicy};
use reqwest::{Client, StatusCode};
use rsa::{pkcs8::EncodePrivateKey, traits::PublicKeyParts, RsaPrivateKey};
use serde_json::{json, Value};
use std::{collections::BTreeMap, io::Write, net::SocketAddr, path::PathBuf,
    sync::{Arc, Mutex}, time::{Duration, SystemTime, UNIX_EPOCH}};

const MODEL: &str = "bauar-private-model-canary-3c79";
const MASTER: &str = "bauar-master-canary-8b41";
const ADMIN: &str = "bauar-admin-canary-928a";
const USER: &str = "bauar-user-canary-612c";
const VIEWER: &str = "bauar-viewer-canary-e16f";
const PASSWORD: &str = "bauar-dashboard-canary-62af";
const DASHBOARD: &str = "bauar-dashboard-owner";
const META: &str = "ai.bossfang/mcp-attribution";
const AUDIENCE: &str = "bauar-mcp-client";
const FORGED: &str = "bauar-forged-authority-canary-450c";

#[derive(Clone)]
struct TraceWriter(Arc<Mutex<Vec<u8>>>);
impl Write for TraceWriter {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        self.0.lock().unwrap().extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> std::io::Result<()> { Ok(()) }
}

struct Key { signing: EncodingKey, jwks: Value }
impl Key {
    fn new() -> Self {
        let key = RsaPrivateKey::new(&mut OsRng, 2048).unwrap();
        let public = key.to_public_key();
        let b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD;
        let pem = key.to_pkcs8_pem(rsa::pkcs8::LineEnding::LF).unwrap();
        Self { signing: EncodingKey::from_rsa_pem(pem.as_bytes()).unwrap(),
            jwks: json!({"keys":[{"kty":"RSA","kid":"bauar-key","use":"sig",
                "alg":"RS256","n":b64.encode(public.n().to_bytes_be()),
                "e":b64.encode(public.e().to_bytes_be())}]}) }
    }
    fn token(&self, role: &str, audience: &str) -> String {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        let mut header = Header::new(Algorithm::RS256);
        header.kid = Some("bauar-key".into());
        encode(&header, &json!({"sub":"verified-subject","email":"display@fixture.invalid",
            "name":"Display Is Not Subject","email_verified":true,"roles":[role],
            "iss":"fixture","aud":audience,"iat":now,"exp":now+300}), &self.signing).unwrap()
    }
}

struct Fixture {
    home: tempfile::TempDir, state: Arc<AppState>, task: tokio::task::JoinHandle<()>,
    client: Client, url: String, workspace: PathBuf, config_path: PathBuf,
    dashboard_hash: String, model_task: tokio::task::JoinHandle<()>,
}
impl Drop for Fixture {
    fn drop(&mut self) { self.task.abort(); self.model_task.abort(); self.state.kernel.shutdown(); }
}
impl Fixture {
    async fn boot(bind: &str, credentials: bool, proxy: bool, jwks: Option<&str>) -> Self {
        // Approval of a routed MCP call can wake its agent. Keep that real
        // continuation on a private deterministic model endpoint, with no tools.
        async fn model(headers: axum::http::HeaderMap, axum::Json(body): axum::Json<Value>) -> axum::response::Response {
            assert!(headers.get("authorization").and_then(|v|v.to_str().ok())
                == Some(format!("Bearer {MODEL}").as_str()), "private model bearer must match fixture credential");
            let model = body["model"].as_str().unwrap_or("fixture");
            if body["stream"] == true {
                let chunk = json!({"id":"fixture-completion","object":"chat.completion.chunk",
                    "model":model,"choices":[{"index":0,"delta":{"role":"assistant",
                    "content":"Approved action completed."},"finish_reason":null}]});
                let end = json!({"id":"fixture-completion","object":"chat.completion.chunk",
                    "model":model,"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]});
                ([("content-type","text/event-stream")],
                    format!("data: {chunk}\n\ndata: {end}\n\ndata: [DONE]\n\n")).into_response()
            } else {
                axum::Json(json!({"id":"fixture-completion","object":"chat.completion",
                    "model":model,"choices":[{"index":0,"message":{"role":"assistant",
                    "content":"Approved action completed."},"finish_reason":"stop"}],
                    "usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}})).into_response()
            }
        }
        let model_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let model_url = format!("http://{}/v1", model_listener.local_addr().unwrap());
        let model_task = tokio::spawn(async move {
            axum::serve(model_listener, Router::new().route("/v1/chat/completions", post(model)))
                .await.unwrap();
        });
        let home = tempfile::tempdir().unwrap();
        librefang_kernel::registry_sync::seed_registry_fixture_for_tests(home.path());
        let workspace = home.path().join("workspaces").join("effect-workspace");
        std::fs::create_dir_all(&workspace).unwrap();
        let dashboard_hash = if credentials { password_hash::hash_password(PASSWORD).unwrap() }
            else { String::new() };
        let mut config = KernelConfig {
            home_dir: home.path().into(), data_dir: home.path().join("data"),
            storage: StorageConfig::embedded_default(home.path().join("operational")),
            api_key: String::new(), api_key_hash: if credentials {
                password_hash::hash_device_token(MASTER) } else { String::new() },
            dashboard_user: if credentials { DASHBOARD.into() } else { String::new() },
            dashboard_pass: String::new(), dashboard_pass_hash: dashboard_hash.clone(),
            external_auth_proxy: proxy, uar: None,
            provider_api_keys: [("openai".into(),"BAUAR_MCP_MODEL_KEY".into())].into_iter().collect(),
            default_model: DefaultModelConfig { provider:"openai".into(), model:"gpt-4o-mini".into(),
                api_key_env:"BAUAR_MCP_MODEL_KEY".into(), base_url:Some(model_url),
                message_timeout_secs:300, extra_params:BTreeMap::new(), cli_profile_dirs:vec![] },
            ..KernelConfig::default()
        };
        config.memory.sqlite_path = Some(home.path().join("memory.sqlite"));
        config.approval.require_approval.clear();
        config.mcp_servers = vec![serde_json::from_value(json!({"name":"application-owned-mcp",
            "transport":null,"timeout_secs":30,"env":[],"headers":[],"taint_scanning":true})).unwrap()];
        if credentials {
            config.users = [("fixture-admin","admin",ADMIN), ("fixture-user","user",USER),
                ("fixture-viewer","viewer",VIEWER)].into_iter().map(|(name,role,key)| {
                let mut user: librefang_types::config::UserConfig = serde_json::from_value(json!({
                    "name":name,"role":role,"api_key_hash":password_hash::hash_device_token(key)})).unwrap();
                user.tool_policy = Some(UserToolPolicy { allowed_tools:vec!["file_write".into()],
                    denied_tools:vec!["shell_exec".into()] });
                user
            }).collect();
        }
        if let Some(uri) = jwks {
            config.external_auth = ExternalAuthConfig { enabled:true, require_email_verified:true,
                role_map:[("admin","admin"),("user","user"),("viewer","viewer")].into_iter()
                    .map(|(a,b)|(a.into(),b.into())).collect(),
                providers:vec![OidcProvider { id:"fixture".into(), display_name:"Fixture".into(),
                    issuer_url:String::new(), auth_url:"https://fixture.invalid/authorize".into(),
                    token_url:"https://fixture.invalid/token".into(), userinfo_url:String::new(),
                    jwks_uri:uri.into(), client_id:AUDIENCE.into(), audience:AUDIENCE.into(),
                    client_secret_env:"BAUAR_MCP_UNUSED_OIDC_SECRET".into(),
                    redirect_url:"http://127.0.0.1/api/auth/callback".into(), scopes:vec!["openid".into()],
                    allowed_domains:vec![], require_email_verified:None }], ..Default::default() };
        }
        let config_path = home.path().join("config.toml");
        std::fs::write(&config_path, toml::to_string(&config).unwrap()).unwrap();
        let kernel = Arc::new(LibreFangKernel::boot_with_config_at(Some(config_path.clone()), config).unwrap());
        kernel.set_self_handle();
        let listener = tokio::net::TcpListener::bind(bind).await.unwrap();
        let addr = listener.local_addr().unwrap();
        let (app, state) = server::build_router(kernel, addr).await;
        let task = tokio::spawn(async move {
            axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await.unwrap();
        });
        Self { home, state, task, client:Client::builder().no_proxy()
            .timeout(Duration::from_secs(20)).build().unwrap(),
            url:format!("http://127.0.0.1:{}", addr.port()), workspace, config_path, dashboard_hash, model_task }
    }
    async fn agent(&self, credential: Option<&str>) -> String {
        let manifest = AgentManifest { name:"mcp-effect-agent".into(), author:"fixture-user".into(),
            workspace:Some(self.workspace.clone()), tool_allowlist:vec!["file_write".into()],
            ..Default::default() };
        let mut request = self.client.post(format!("{}/api/agents",self.url))
            .json(&json!({"manifest_toml":toml::to_string(&manifest).unwrap()}));
        if let Some(key) = credential { request = request.bearer_auth(key); }
        let response = request.send().await.unwrap();
        assert_eq!(response.status(),StatusCode::CREATED);
        let id = response.json::<Value>().await.unwrap()["agent_id"].as_str().unwrap().to_owned();
        let entry = self.state.kernel.agent_registry().get(id.parse().unwrap())
            .expect("created agent must exist in actual registry");
        assert!(entry.manifest.workspace.as_deref() == Some(self.workspace.as_path()),
            "stored workspace must equal the private effect workspace");
        id
    }
    async fn call(&self, credential: Option<&str>, agent: &str, content: &str,
        headers: &[(&str,&str)]) -> (StatusCode, Value) {
        let mut request = self.client.post(format!("{}/mcp",self.url))
            .header("x-librefang-agent-id",agent).json(&json!({"jsonrpc":"2.0","id":1,
                "method":"tools/call","params":{"name":"file_write",
                    "arguments":{"path":"counter.txt","content":content}}}));
        if let Some(key) = credential { request = request.bearer_auth(key); }
        for (name,value) in headers { request = request.header(*name,*value); }
        let response = request.send().await.unwrap();
        let status = response.status();
        let text = response.text().await.unwrap();
        let body = serde_json::from_str(&text).unwrap_or_else(|_|json!({"text":text}));
        (status,body)
    }
    async fn complete_effect(&self, body: &Value, agent: &str, content: &str) {
        assert!(body["result"]["isError"] == false, "permitted MCP call must not be denied");
        let text = body["result"]["content"][0]["text"].as_str().unwrap_or("");
        if let Some(rest) = text.strip_prefix("Tool 'file_write' requires human approval. Request submitted (ID: ") {
            let (id, _) = rest.split_once("). Continue with other tasks")
                .expect("native pending receipt must bind its original approval ID");
            let id = uuid::Uuid::parse_str(id).expect("native approval ID must be a UUID");
            let mut request = self.client.get(format!("{}/api/approvals/{id}",self.url));
            if !self.dashboard_hash.is_empty() { request = request.bearer_auth(MASTER); }
            let response = request.send().await.unwrap();
            assert_eq!(response.status(),StatusCode::OK);
            let pending: Value = response.json().await.unwrap();
            assert!(pending["id"] == id.to_string() && pending["agent_id"] == agent
                && pending["tool_name"] == "file_write" && pending["status"] == "pending",
                "approval must bind the original agent, tool and pending request");
            let summary = pending["action_summary"].as_str().unwrap_or("");
            let input: Value = serde_json::from_str(summary.strip_prefix("file_write: ")
                .expect("original approval tool summary")).expect("original approval input");
            assert!(input == json!({"path":"counter.txt","content":content}),
                "approval must bind the exact private fixture write");
            assert!(std::fs::read_to_string(self.workspace.join("counter.txt")).ok().as_deref()
                != Some(content), "pending request must not have performed its new effect");
            let mut request = self.client.post(format!("{}/api/approvals/{id}/approve",self.url))
                .json(&json!({}));
            if !self.dashboard_hash.is_empty() { request = request.bearer_auth(MASTER); }
            let response = request.send().await.unwrap();
            assert_eq!(response.status(),StatusCode::OK);
            let approved: Value = response.json().await.unwrap();
            assert!(approved["id"] == id.to_string() && approved["status"] == "approved",
                "approval response must acknowledge the same original request");
        } else {
            assert!(text.starts_with("Successfully wrote "), "unknown native write outcome category");
        }
        let deadline = tokio::time::Instant::now() + Duration::from_secs(20);
        while std::fs::read_to_string(self.workspace.join("counter.txt")).ok().as_deref() != Some(content) {
            assert!(tokio::time::Instant::now() < deadline, "approved native effect was not observed");
            tokio::time::sleep(Duration::from_millis(25)).await;
        }
        assert_eq!(self.effect(),content);
    }
    fn effect(&self) -> String { std::fs::read_to_string(self.workspace.join("counter.txt")).unwrap() }
    fn reloaded_audit(&self) -> Value {
        let reader = AuditLog::with_db(self.state.kernel.memory_substrate().pool());
        serde_json::to_value(reader.recent(5000)).unwrap()
    }
    async fn read(&self, path: &str) -> String {
        let response = self.client.get(format!("{}{path}",self.url)).bearer_auth(MASTER).send().await.unwrap();
        assert_eq!(response.status(),StatusCode::OK);
        response.text().await.unwrap()
    }
    async fn snapshot(&self) -> Vec<Value> {
        let mut values = vec![Value::String(self.read("/api/config/export").await)];
        for path in ["/api/mcp/servers","/api/mcp/catalog","/api/users",
            "/api/authz/effective/fixture-admin"] {
            values.push(serde_json::from_str(&self.read(path).await).unwrap());
        }
        values
    }
}

#[track_caller]
fn clean(value: &str, canaries: &[String]) {
    for (index, canary) in canaries.iter().enumerate() {
        assert!(!value.contains(canary), "inspection data contains canary index {index}");
    }
}
fn produced(body: &Value, agent: &str, mode: &str, source: &str, subject: Option<&str>) -> Value {
    assert_eq!(body["result"]["isError"],false);
    let record = body["result"]["_meta"][META].clone();
    assert_eq!(record,json!({"mode":mode,"authenticated_subject":subject,"verified_tenant":null,
        "verified_actor":null,"authorized_agent_id":agent,"authn_source":source,
        "policy_revision":"bossfang.mcp-inbound-policy/1"}));
    record
}
fn assert_audited(rows: &Value, records: &[Value]) {
    let rows = rows.as_array().unwrap();
    assert!(!rows.is_empty());
    let mut outcomes: Vec<Value> = rows.iter().filter(|row| row["action"]=="AuthAttempt"
        && row["channel"]=="mcp" && row["detail"]=="mcp")
        .filter_map(|row|row["outcome"].as_str().and_then(|outcome|
            serde_json::from_str::<Value>(outcome).ok())).collect();
    for record in records {
        let index = outcomes.iter().position(|outcome|outcome==record)
            .expect("produced MCP attribution missing from actual audit history");
        outcomes.remove(index);
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn actual_mcp_identity_admission_effect_attribution_and_preservation() {
    // No unsafe environment mutation after a runtime starts; the coordinator
    // supplies only synthetic settings to this dedicated fixture process.
    assert_eq!(std::env::var("LIBREFANG_ALLOW_NO_AUTH").ok().as_deref(),Some("1"));
    assert_eq!(std::env::var("LIBREFANG_STATE_SECRET").ok().as_deref(),
        Some("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="));
    for name in ["LIBREFANG_API_KEY","LIBREFANG_DASHBOARD_USER","LIBREFANG_DASHBOARD_PASS"] {
        assert!(std::env::var_os(name).is_none(),"credential override must be absent");
    }
    assert!(std::env::var("BAUAR_MCP_MODEL_KEY").ok().as_deref() == Some(MODEL),
        "dedicated fixture process requires its synthetic private model credential");
    let traces = Arc::new(Mutex::new(Vec::new()));
    let writer = TraceWriter(traces.clone());
    // This dedicated test process has one entry. Capture actual boot and router
    // worker logs through the same subscriber without changing application setup.
    let subscriber = tracing_subscriber::fmt().without_time().with_ansi(false)
        .with_max_level(tracing::Level::DEBUG).with_writer(move||writer.clone()).finish();
    tracing::subscriber::set_global_default(subscriber)
        .expect("dedicated MCP fixture installs its capture subscriber once");
    let mut canaries = [MASTER,ADMIN,USER,VIEWER,PASSWORD,FORGED,MODEL].map(str::to_owned).to_vec();
    canaries.extend([MASTER,ADMIN,USER,VIEWER].map(password_hash::hash_device_token));

    let local = Fixture::boot("127.0.0.1:0",false,false,None).await;
    let local_agent = local.agent(None).await;
    let (status,body) = local.call(None,&local_agent,"local",&[]).await;
    assert_eq!(status,StatusCode::OK);
    local.complete_effect(&body,&local_agent,"local").await;
    let local_record = produced(&body,&local_agent,"trusted_local","local_transport",None);
    assert_eq!(local.effect(),"local");
    let local_rows = local.reloaded_audit();
    assert_audited(&local_rows,&[local_record]);
    clean(&body.to_string(),&canaries); clean(&local_rows.to_string(),&canaries);
    drop(local);

    for (bind,proxy) in [("0.0.0.0:0",false),("127.0.0.1:0",true)] {
        let remote = Fixture::boot(bind,false,proxy,None).await;
        let agent = remote.agent(None).await;
        std::fs::write(remote.workspace.join("counter.txt"),"unchanged").unwrap();
        let (status,body) = remote.call(None,&agent,"forbidden",&[
            ("x-forwarded-for","127.0.0.1"),("forwarded","for=127.0.0.1"),
            ("x-bossfang-mcp-mode","trusted_local")]).await;
        assert_eq!(status,StatusCode::UNAUTHORIZED);
        assert_eq!(remote.effect(),"unchanged"); clean(&body.to_string(),&canaries);
        // The legacy opt-out still admits an unrelated real application route.
        let response = remote.client.get(format!("{}/api/agents",remote.url)).send().await.unwrap();
        assert_eq!(response.status(),StatusCode::OK);
    }

    let key = Key::new();
    let jwks_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let jwks_uri = format!("http://{}/.well-known/jwks.json",jwks_listener.local_addr().unwrap());
    async fn jwks(State(value): State<Value>) -> axum::Json<Value> { axum::Json(value) }
    let jwks_app = Router::new().route("/.well-known/jwks.json",get(jwks)).with_state(key.jwks.clone());
    let jwks_task = tokio::spawn(async move { axum::serve(jwks_listener,jwks_app).await.unwrap(); });
    let fixture = Fixture::boot("127.0.0.1:0",true,false,Some(&jwks_uri)).await;
    let agent = fixture.agent(Some(MASTER)).await;
    let before = fixture.snapshot().await;
    assert!(before[1]["configured"].as_array().unwrap().iter()
        .any(|entry|entry["name"]=="application-owned-mcp"));
    assert!(!before[2].is_null());
    assert_eq!(before[4]["role"],"admin");
    assert_eq!(before[4]["tool_policy"]["denied_tools"],json!(["shell_exec"]));
    assert!(fixture.state.kernel.config_ref().uar.is_none());
    let config_before = std::fs::read(&fixture.config_path).unwrap();
    assert_eq!(before[0],Value::String(String::from_utf8(config_before.clone()).unwrap()));
    canaries.push(fixture.dashboard_hash.clone());
    let login = fixture.client.post(format!("{}/api/auth/dashboard-login",fixture.url))
        .json(&json!({"username":DASHBOARD,"password":PASSWORD})).send().await.unwrap();
    assert_eq!(login.status(),StatusCode::OK);
    let session = login.json::<Value>().await.unwrap()["token"].as_str().unwrap().to_owned();
    #[allow(deprecated)]
    let legacy = password_hash::derive_dashboard_session_token(DASHBOARD,"",&fixture.dashboard_hash).unwrap();
    let oidc = key.token("admin",AUDIENCE);
    let admin_subject = format!("user:{}",UserId::from_name("fixture-admin"));
    let dashboard_subject = format!("user:{}",UserId::from_name(DASHBOARD));
    canaries.extend([session.clone(),legacy.clone(),oidc.clone()]);
    let mut records = Vec::new();
    for (token,mode,source,subject,value) in [
        (MASTER,"service","master_api_key","service:master-api-key","master"),
        (ADMIN,"authenticated_user","user_api_key",admin_subject.as_str(),"admin"),
        (session.as_str(),"authenticated_user","dashboard_session",dashboard_subject.as_str(),"session"),
        (legacy.as_str(),"service","dashboard_session","dashboard:legacy-session","legacy"),
        (oidc.as_str(),"authenticated_user","oidc","oidc:fixture:verified-subject","oidc")]
    {
        let (status,body) = fixture.call(Some(token),&agent,value,&[
            ("x-librefang-current-peer-jid",FORGED),("x-librefang-current-channel","fixture"),
            ("x-librefang-current-chat-id",FORGED),("x-librefang-current-account-id",FORGED)]).await;
        assert_eq!(status,StatusCode::OK);
        fixture.complete_effect(&body,&agent,value).await;
        records.push(produced(&body,&agent,mode,source,Some(subject)));
        assert_eq!(fixture.effect(),value); clean(&body.to_string(),&canaries);
    }
    for token in [USER.to_owned(),VIEWER.to_owned(),key.token("user",AUDIENCE),key.token("viewer",AUDIENCE)] {
        canaries.push(token.clone());
        let (status,body) = fixture.call(Some(&token),&agent,"denied",&[
            ("x-bossfang-mcp-authn-source","master_api_key")]).await;
        assert_eq!(status,StatusCode::FORBIDDEN);
        assert_eq!(fixture.effect(),"oidc"); clean(&body.to_string(),&canaries);
    }
    for token in [Key::new().token("admin",AUDIENCE),key.token("admin","wrong-audience")] {
        canaries.push(token.clone());
        let (status,body) = fixture.call(Some(&token),&agent,"denied",&[]).await;
        assert_eq!(status,StatusCode::UNAUTHORIZED);
        assert_eq!(fixture.effect(),"oidc"); clean(&body.to_string(),&canaries);
    }
    for (name,value) in [("x-bossfang-mcp-subject",FORGED),("x-bossfang-mcp-tenant",FORGED),
        ("x-bossfang-mcp-actor",FORGED),("x-bossfang-mcp-authn-source",FORGED),
        ("x-bossfang-mcp-mode","delegated_user")] {
        let (status,body) = fixture.call(Some(ADMIN),&agent,"denied",&[(name,value)]).await;
        assert_eq!(status,StatusCode::OK); assert_eq!(body["error"]["code"],-32001);
        assert!(body.get("result").is_none()); assert_eq!(fixture.effect(),"oidc");
        clean(&body.to_string(),&canaries);
    }
    for invalid in ["malformed", "00000000-0000-0000-0000-000000000001"] {
        let (status,body) = fixture.call(Some(ADMIN),invalid,"denied",&[]).await;
        assert_eq!(status,StatusCode::OK); assert_eq!(body["error"]["code"],-32001);
        assert_eq!(fixture.effect(),"oidc"); clean(&body.to_string(),&canaries);
    }
    // Refusals do not poison subsequent genuine authority or change arguments.
    let (status,body) = fixture.call(Some(ADMIN),&agent,"after-denials",&[]).await;
    assert_eq!(status,StatusCode::OK);
    fixture.complete_effect(&body,&agent,"after-denials").await;
    records.push(produced(&body,&agent,"authenticated_user","user_api_key",Some(&admin_subject)));
    assert_eq!(fixture.effect(),"after-denials"); clean(&body.to_string(),&canaries);
    let audit: Value = serde_json::from_str(&fixture.read(
        "/api/audit/query?action=AuthAttempt&channel=mcp&limit=5000").await).unwrap();
    assert_audited(&audit["items"],&records);
    let reloaded = fixture.reloaded_audit();
    assert_audited(&reloaded,&records);
    clean(&audit.to_string(),&canaries); clean(&reloaded.to_string(),&canaries);
    assert_eq!(fixture.snapshot().await,before);
    assert_eq!(std::fs::read(&fixture.config_path).unwrap(),config_before);
    assert!(fixture.home.path().exists());
    drop(fixture); jwks_task.abort();
    let captured = String::from_utf8(traces.lock().unwrap().clone()).unwrap();
    assert!(!captured.is_empty(),"actual boot/router tracing must be observed");
    clean(&captured,&canaries);
}
