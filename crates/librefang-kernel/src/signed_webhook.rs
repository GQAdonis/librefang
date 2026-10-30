//! Outbound [Standard Webhooks](https://www.standardwebhooks.com/) delivery.
//!
//! Two producers use it: a cron job whose action is [`CronAction::SignedWebhook`](librefang_types::scheduler::CronAction::SignedWebhook), and the skill-workshop publish hook that announces a human approval.
//! Both resolve a named `[[signed_webhooks.targets]]` entry from `config.toml`, serialize the body once, and POST those exact bytes with three headers:
//!
//! * `webhook-id` — one id per logical event (per cron fire, per approval), reused unchanged on every retry so the receiver can deduplicate;
//! * `webhook-timestamp` — Unix seconds of *this attempt*, so a retry minutes later still falls inside a receiver's replay tolerance;
//! * `webhook-signature` — `v1,` + base64(HMAC-SHA256(key, "{id}.{timestamp}.{body}")), where `key` is the base64-decoded secret after its `whsec_` prefix.
//!
//! Network errors, timeouts and HTTP 408 / 409 / 429 / 5xx are retried after [`RETRY_DELAYS`]; any other non-2xx is final.
//! Retries live in memory: a daemon restart drops an in-flight retry sequence (a re-fire of the same cron due time reuses the same `webhook-id`).
//!
//! The spec is implemented here rather than through the `standardwebhooks` crate: its last release (1.0.1) is from 2024-03 and pulls a second `base64` major plus `time` and `hmac-sha256`, while signing is one HMAC over workspace dependencies.
//! The tests pin the spec's published reference vectors.

use std::time::Duration;

use base64::Engine as _;
use chrono::{DateTime, SecondsFormat, Utc};
use hmac::{Hmac, Mac};
use librefang_types::config::SignedWebhooksConfig;
use librefang_types::principal::Principal;
use librefang_types::scheduler::{CronJobId, SIGNED_WEBHOOK_RESERVED_KEYS};
use sha2::{Digest, Sha256};
use tracing::warn;

/// Header carrying the event id, constant across retries.
pub const HEADER_ID: &str = "webhook-id";
/// Header carrying the attempt's Unix timestamp in seconds.
pub const HEADER_TIMESTAMP: &str = "webhook-timestamp";
/// Header carrying `v1,<base64 signature>`.
pub const HEADER_SIGNATURE: &str = "webhook-signature";

const SECRET_PREFIX: &str = "whsec_";

/// Waits before the 2nd..6th attempt: 5 s, 30 s, 2 min, 10 min, 30 min.
/// Six attempts span about 43 minutes, far inside a receiver's multi-day idempotency window.
pub const RETRY_DELAYS: &[Duration] = &[
    Duration::from_secs(5),
    Duration::from_secs(30),
    Duration::from_secs(120),
    Duration::from_secs(600),
    Duration::from_secs(1800),
];

/// A target resolved from config, ready to sign with.
#[derive(Debug)]
pub struct ResolvedTarget {
    pub name: String,
    pub url: String,
    key: Vec<u8>,
    pub owner: Option<Principal>,
}

impl ResolvedTarget {
    /// The decoded signing key.
    pub fn key(&self) -> &[u8] {
        &self.key
    }
}

/// Decode a Standard Webhooks secret: optional `whsec_` prefix, then standard base64 of a non-empty key.
pub fn decode_secret(secret: &str) -> Result<Vec<u8>, String> {
    let encoded = secret.trim();
    let encoded = encoded.strip_prefix(SECRET_PREFIX).unwrap_or(encoded);
    let key = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|e| format!("signing secret is not base64 after the whsec_ prefix: {e}"))?;
    if key.is_empty() {
        return Err("signing secret is empty".to_string());
    }
    Ok(key)
}

/// Compute the `webhook-signature` header value for one attempt.
pub fn sign(key: &[u8], msg_id: &str, timestamp: i64, body: &[u8]) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(key).expect("HMAC accepts any key size");
    mac.update(msg_id.as_bytes());
    mac.update(b".");
    mac.update(timestamp.to_string().as_bytes());
    mac.update(b".");
    mac.update(body);
    let sig = base64::engine::general_purpose::STANDARD.encode(mac.finalize().into_bytes());
    format!("v1,{sig}")
}

/// Look up `name` in `[signed_webhooks]`, read its secret from the environment and parse its owner.
pub fn resolve_target(cfg: &SignedWebhooksConfig, name: &str) -> Result<ResolvedTarget, String> {
    let target = cfg
        .targets
        .iter()
        .find(|t| t.name == name)
        .ok_or_else(|| format!("signed webhook target '{name}' is not configured"))?;
    let url = reqwest::Url::parse(&target.url)
        .map_err(|e| format!("signed webhook target '{name}': url is not parseable: {e}"))?;
    if !matches!(url.scheme(), "http" | "https") {
        return Err(format!(
            "signed webhook target '{name}': url scheme must be http or https"
        ));
    }
    let secret = std::env::var(&target.secret_env).map_err(|_| {
        format!(
            "signed webhook target '{name}': environment variable {} is not set",
            target.secret_env
        )
    })?;
    let key = decode_secret(&secret).map_err(|e| format!("signed webhook target '{name}': {e}"))?;
    let owner = target
        .owner
        .as_deref()
        .map(Principal::from_spec)
        .transpose()
        .map_err(|e| format!("signed webhook target '{name}': owner is not a principal: {e}"))?;
    Ok(ResolvedTarget {
        name: target.name.clone(),
        url: target.url.clone(),
        key,
        owner,
    })
}

/// A cron job may send only to a target whose owner is exactly the job's owner.
/// An unowned target accepts no job, and an unowned job may use no target.
pub fn check_job_owner(
    target: &ResolvedTarget,
    job_owner: Option<Principal>,
) -> Result<(), String> {
    let name = &target.name;
    match (target.owner, job_owner) {
        (Some(t), Some(j)) if t == j => Ok(()),
        (None, _) => Err(format!(
            "signed webhook target '{name}' declares no owner, so no cron job may send to it"
        )),
        (Some(_), None) => Err(format!(
            "cron job has no owner and may not send to signed webhook target '{name}'"
        )),
        (Some(t), Some(j)) => Err(format!(
            "cron job owner {j} does not own signed webhook target '{name}' (owner {t})"
        )),
    }
}

/// `webhook-id` of one cron fire: stable for the job and its scheduled due time.
pub fn cron_fire_message_id(job_id: CronJobId, due_at: DateTime<Utc>) -> String {
    format!("msg_{}_{}", job_id.0.simple(), due_at.timestamp())
}

/// Body of one cron fire: the job's `data` plus the stamped `type`, `bossTaskId` and `dueAt`.
/// The stamped fields are written last, so they win even over a `data` that bypassed validation.
pub fn cron_fire_body(
    event_type: &str,
    data: &serde_json::Map<String, serde_json::Value>,
    job_id: CronJobId,
    due_at: DateTime<Utc>,
) -> Result<Vec<u8>, String> {
    let mut body = data.clone();
    for key in SIGNED_WEBHOOK_RESERVED_KEYS {
        body.remove(*key);
    }
    body.insert("type".into(), event_type.into());
    body.insert("bossTaskId".into(), job_id.to_string().into());
    body.insert(
        "dueAt".into(),
        due_at.to_rfc3339_opts(SecondsFormat::Secs, true).into(),
    );
    serde_json::to_vec(&serde_json::Value::Object(body))
        .map_err(|e| format!("signed webhook body did not serialize: {e}"))
}

/// The approved skill announced by the skill-workshop publish hook.
pub struct SkillPublication<'a> {
    pub event_type: &'a str,
    pub slug: &'a str,
    pub version: Option<&'a str>,
    pub summary: &'a str,
    pub content: &'a str,
    pub approved_by: &'a str,
    pub approved_at: DateTime<Utc>,
    pub target_agent_ids: &'a [String],
}

/// Body of a skill-publish event. `contentSha256` is the lowercase hex SHA-256 of `content`'s UTF-8 bytes.
pub fn skill_published_body(p: &SkillPublication<'_>) -> Result<Vec<u8>, String> {
    let digest = hex::encode(Sha256::digest(p.content.as_bytes()));
    let mut body = serde_json::json!({
        "type": p.event_type,
        "slug": p.slug,
        "version": p.version,
        "summary": p.summary,
        "content": p.content,
        "contentSha256": digest,
        "approvedBy": p.approved_by,
        "approvedAt": p.approved_at.to_rfc3339_opts(SecondsFormat::Secs, true),
    });
    if !p.target_agent_ids.is_empty() {
        body["targetAgentIds"] = serde_json::json!(p.target_agent_ids);
    }
    serde_json::to_vec(&body).map_err(|e| format!("skill publish body did not serialize: {e}"))
}

enum AttemptError {
    Retryable(String),
    Final(String),
}

async fn attempt(
    http: &reqwest::Client,
    target: &ResolvedTarget,
    msg_id: &str,
    body: &[u8],
) -> Result<(), AttemptError> {
    let timestamp = Utc::now().timestamp();
    let signature = sign(target.key(), msg_id, timestamp, body);
    let resp = http
        .post(&target.url)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .header(HEADER_ID, msg_id)
        .header(HEADER_TIMESTAMP, timestamp.to_string())
        .header(HEADER_SIGNATURE, signature)
        .body(body.to_vec())
        .send()
        .await
        .map_err(|e| AttemptError::Retryable(format!("send failed: {e}")))?;
    let status = resp.status();
    if status.is_success() {
        return Ok(());
    }
    let msg = format!("HTTP {status}");
    if status.is_server_error() || matches!(status.as_u16(), 408 | 409 | 429) {
        Err(AttemptError::Retryable(msg))
    } else {
        Err(AttemptError::Final(msg))
    }
}

/// POST `body` to `target`, retrying transient failures after each of `delays` with the same `msg_id` and body bytes.
/// Returns the number of attempts made on success.
pub async fn deliver(
    http: &reqwest::Client,
    target: &ResolvedTarget,
    msg_id: &str,
    body: &[u8],
    delays: &[Duration],
) -> Result<usize, String> {
    let mut attempts = 0;
    loop {
        attempts += 1;
        match attempt(http, target, msg_id, body).await {
            Ok(()) => return Ok(attempts),
            Err(AttemptError::Final(e)) => {
                return Err(format!(
                    "signed webhook '{}' {msg_id}: {e} (attempt {attempts}, not retried)",
                    target.name
                ))
            }
            Err(AttemptError::Retryable(e)) => {
                let Some(delay) = delays.get(attempts - 1) else {
                    return Err(format!(
                        "signed webhook '{}' {msg_id}: {e} (gave up after {attempts} attempts)",
                        target.name
                    ));
                };
                warn!(target = %target.name, %msg_id, attempt = attempts, error = %e, retry_in_secs = delay.as_secs(), "signed webhook attempt failed; retrying");
                tokio::time::sleep(*delay).await;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use librefang_types::config::SignedWebhookTargetConfig;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    /// Reference vector from the Standard Webhooks Rust library (`libraries/rust/src/lib.rs`, `test_sign`).
    #[test]
    fn sign_matches_rust_reference_vector() {
        let key = decode_secret("whsec_C2FVsBQIhrscChlQIMV+b5sSYspob7oD").unwrap();
        assert_eq!(
            sign(
                &key,
                "msg_27UH4WbU6Z5A5EzD8u03UvzRbpk",
                1649367553,
                br#"{"email":"test@example.com","username":"test_user"}"#
            ),
            "v1,tZ1I4/hDygAJgO5TYxiSd6Sd0kDW6hPenDe+bTa3Kkw="
        );
    }

    /// Reference vector shared by the Java / Python / Go Standard Webhooks libraries (`TestScenario.validSigned`).
    #[test]
    fn sign_matches_cross_library_reference_vector() {
        let key = decode_secret("whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw").unwrap();
        assert_eq!(
            sign(
                &key,
                "msg_p5jXN8AQM9LWM0D4loKWxJek",
                1614265330,
                br#"{"test": 2432232314}"#
            ),
            "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE="
        );
        // The bare base64 form (no prefix) is the same key.
        assert_eq!(
            decode_secret("MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw").unwrap(),
            key
        );
    }

    #[test]
    fn decode_secret_rejects_garbage_and_empty() {
        assert!(decode_secret("whsec_***").is_err());
        assert!(decode_secret("whsec_").is_err());
    }

    fn target(url: &str, owner: Option<&str>) -> ResolvedTarget {
        ResolvedTarget {
            name: "t".into(),
            url: url.into(),
            key: decode_secret("whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw").unwrap(),
            owner: owner.map(|o| Principal::from_spec(o).unwrap()),
        }
    }

    #[test]
    fn owner_check_requires_exact_match() {
        let alice = Principal::from_spec("user:alice").unwrap();
        let bob = Principal::from_spec("user:bob").unwrap();
        assert!(check_job_owner(&target("http://x", Some("user:alice")), Some(alice)).is_ok());
        assert!(check_job_owner(&target("http://x", Some("user:alice")), Some(bob)).is_err());
        assert!(check_job_owner(&target("http://x", Some("user:alice")), None).is_err());
        assert!(check_job_owner(&target("http://x", None), Some(alice)).is_err());
    }

    #[test]
    fn resolve_target_reads_secret_from_env_and_parses_owner() {
        let var = "LIBREFANG_TEST_SIGNED_WEBHOOK_SECRET_RESOLVE";
        std::env::set_var(var, "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw");
        let cfg = SignedWebhooksConfig {
            targets: vec![SignedWebhookTargetConfig {
                name: "wake".into(),
                url: "https://example.test/hook".into(),
                secret_env: var.into(),
                owner: Some("user:alice".into()),
            }],
            skill_publish: None,
        };
        let t = resolve_target(&cfg, "wake").unwrap();
        assert_eq!(t.owner, Some(Principal::from_spec("user:alice").unwrap()));
        assert!(resolve_target(&cfg, "missing")
            .unwrap_err()
            .contains("not configured"));
        std::env::remove_var(var);
        assert!(resolve_target(&cfg, "wake").unwrap_err().contains(var));
    }

    #[test]
    fn cron_body_stamps_identity_fields_over_data() {
        let job_id = CronJobId::new();
        let due = DateTime::parse_from_rfc3339("2026-10-30T07:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let data =
            serde_json::json!({"kind": "routine", "subjectId": "r1", "bossTaskId": "forged"});
        let body =
            cron_fire_body("openduet.wake.v1", data.as_object().unwrap(), job_id, due).unwrap();
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            v,
            serde_json::json!({
                "type": "openduet.wake.v1",
                "kind": "routine",
                "subjectId": "r1",
                "bossTaskId": job_id.to_string(),
                "dueAt": "2026-10-30T07:00:00Z",
            })
        );
        assert_eq!(
            cron_fire_message_id(job_id, due),
            cron_fire_message_id(job_id, due),
            "one fire, one id"
        );
    }

    #[test]
    fn skill_body_carries_digest_and_approval() {
        let at = DateTime::parse_from_rfc3339("2026-10-30T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let ids = vec!["bot-1".to_string()];
        let body = skill_published_body(&SkillPublication {
            event_type: "openduet.skill.published.v1",
            slug: "weekly_digest",
            version: Some("0.1.0"),
            summary: "Summarise the week",
            content: "abc",
            approved_by: "alice",
            approved_at: at,
            target_agent_ids: &ids,
        })
        .unwrap();
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(v["type"], "openduet.skill.published.v1");
        assert_eq!(v["slug"], "weekly_digest");
        assert_eq!(
            v["contentSha256"],
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(v["approvedBy"], "alice");
        assert_eq!(v["approvedAt"], "2026-10-30T08:00:00Z");
        assert_eq!(v["targetAgentIds"], serde_json::json!(["bot-1"]));
    }

    fn header<'a>(req: &'a wiremock::Request, name: &str) -> &'a str {
        req.headers.get(name).unwrap().to_str().unwrap()
    }

    #[tokio::test]
    async fn retries_reuse_id_and_body_and_every_attempt_verifies() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/hook"))
            .respond_with(ResponseTemplate::new(503))
            .up_to_n_times(2)
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/hook"))
            .respond_with(ResponseTemplate::new(202))
            .mount(&server)
            .await;
        let t = target(&format!("{}/hook", server.uri()), None);
        let body = br#"{"type":"x"}"#;
        let attempts = deliver(
            &reqwest::Client::new(),
            &t,
            "msg_fire_1",
            body,
            &[Duration::from_millis(10), Duration::from_millis(10)],
        )
        .await
        .unwrap();
        assert_eq!(attempts, 3);

        let reqs = server.received_requests().await.unwrap();
        assert_eq!(reqs.len(), 3);
        for req in &reqs {
            assert_eq!(header(req, HEADER_ID), "msg_fire_1");
            assert_eq!(req.body, body);
            let ts: i64 = header(req, HEADER_TIMESTAMP).parse().unwrap();
            assert!((Utc::now().timestamp() - ts).abs() < 300);
            assert_eq!(
                header(req, HEADER_SIGNATURE),
                sign(t.key(), "msg_fire_1", ts, body),
                "each attempt is signed over its own timestamp"
            );
        }
    }

    #[tokio::test]
    async fn client_errors_are_final_and_exhaustion_gives_up() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/bad"))
            .respond_with(ResponseTemplate::new(422))
            .mount(&server)
            .await;
        Mock::given(method("POST"))
            .and(path("/down"))
            .respond_with(ResponseTemplate::new(500))
            .mount(&server)
            .await;
        let http = reqwest::Client::new();
        let delays = [Duration::from_millis(5)];

        let bad = target(&format!("{}/bad", server.uri()), None);
        let err = deliver(&http, &bad, "m1", b"{}", &delays)
            .await
            .unwrap_err();
        assert!(err.contains("422") && err.contains("not retried"), "{err}");

        let down = target(&format!("{}/down", server.uri()), None);
        let err = deliver(&http, &down, "m2", b"{}", &delays)
            .await
            .unwrap_err();
        assert!(err.contains("gave up after 2 attempts"), "{err}");
        assert_eq!(server.received_requests().await.unwrap().len(), 3);
    }
}
