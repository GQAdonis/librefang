use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::routing::{get, post};
use axum::{Json, Router};
use librefang_testing::{MockKernelBuilder, TestAppState};
use serde_json::{json, Value};
use tower::ServiceExt;

async fn fake_uar() -> String {
    async fn completion(Json(_request): Json<Value>) -> Json<Value> {
        Json(json!({
            "id": "fake-completion",
            "object": "chat.completion",
            "model": "openai/test-model",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "BossFang UAR is ready."
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 5,
                "completion_tokens": 6
            }
        }))
    }

    let app = Router::new()
        .route("/healthz", get(|| async { Json(json!({"status": "ok"})) }))
        .route(
            "/readyz",
            get(|| async { Json(json!({"status": "ready"})) }),
        )
        .route(
            "/api/openapi.json",
            get(|| async {
                Json(json!({
                    "openapi": "3.1.0",
                    "info": {
                        "title": "Universal Agent Runtime",
                        "version": "0.1.0"
                    },
                    "paths": {
                        "/api/chat/completion": { "post": {} }
                    },
                    "components": {
                        "schemas": {
                            "ChatCompletionRequest": {
                                "properties": {
                                    "stream": { "type": "boolean" },
                                    "stream_mode": { "type": "string" }
                                }
                            }
                        }
                    }
                }))
            }),
        )
        .route(
            "/api/models",
            get(|| async {
                Json(json!({
                    "openai": {
                        "display_name": "OpenAI",
                        "configured": true,
                        "models": {
                            "test-model": { "name": "Test Model" }
                        }
                    }
                }))
            }),
        )
        .route("/api/chat/completion", post(completion));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let endpoint = format!("http://{}", listener.local_addr().unwrap());
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    endpoint
}

async fn request(app: &Router, method: &str, path: &str, body: &str) -> (StatusCode, Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    (status, serde_json::from_slice(&bytes).unwrap())
}

#[cfg(unix)]
fn executable_sidecar(dir: &tempfile::TempDir, stopped: &std::path::Path) -> std::path::PathBuf {
    use std::os::unix::fs::PermissionsExt;

    let path = dir.path().join("fake-uar-sidecar");
    let body = format!(
        r#"#!/usr/bin/env python3
import http.server, sys, threading
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
    def log_message(self, format, *args):
        pass
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
print(f"READY:{{server.server_port}}", flush=True)
threading.Thread(target=server.serve_forever, daemon=True).start()
sys.stdin.read()
server.shutdown()
open({stopped:?}, "w").write("stopped")
"#
    );
    std::fs::write(&path, body).unwrap();
    let mut permissions = std::fs::metadata(&path).unwrap().permissions();
    permissions.set_mode(0o755);
    std::fs::set_permissions(&path, permissions).unwrap();
    path
}

#[cfg(unix)]
#[tokio::test(flavor = "multi_thread")]
async fn operator_routes_spawn_ready_and_stop_a_fake_sidecar() {
    let dir = tempfile::tempdir().unwrap();
    let stopped = dir.path().join("stopped");
    let command = executable_sidecar(&dir, &stopped);
    let home = dir.path().to_path_buf();
    let test = TestAppState::with_builder(MockKernelBuilder::new().with_config(move |config| {
        config.home_dir = home;
        config.uar = Some(librefang_types::config::UarConfig {
            model: "openai/test-model".to_string(),
            sidecar: librefang_types::config::UarSidecarConfig {
                enabled: true,
                command: command.to_string_lossy().into_owned(),
                restart: false,
                ready_timeout_ms: 3_000,
                shutdown_grace_secs: 3,
                ..Default::default()
            },
            ..Default::default()
        });
    }));
    let app = test.router();

    let (status, snapshot) = request(&app, "POST", "/api/uar/start", "{}").await;
    assert_eq!(status, StatusCode::OK, "{snapshot}");
    let (status, snapshot) = request(&app, "GET", "/api/uar/status", "").await;
    assert_eq!(status, StatusCode::OK, "{snapshot}");
    assert_eq!(snapshot["state"], "healthy");
    assert!(snapshot["port"].as_u64().is_some());

    let (status, snapshot) = request(&app, "POST", "/api/uar/stop", "{}").await;
    assert_eq!(status, StatusCode::OK, "{snapshot}");
    assert_eq!(snapshot["state"], "stopped");
    assert!(stopped.exists(), "fake sidecar did not observe stdin EOF");
}

#[tokio::test(flavor = "multi_thread")]
async fn operator_routes_start_report_proxy_models_and_stop_endpoint_mode() {
    let endpoint = fake_uar().await;
    let test = TestAppState::with_builder(MockKernelBuilder::new().with_config(move |config| {
        config.uar = Some(librefang_types::config::UarConfig {
            model: "openai/test-model".to_string(),
            sidecar: librefang_types::config::UarSidecarConfig {
                enabled: true,
                endpoint: Some(endpoint),
                ..Default::default()
            },
            ..Default::default()
        });
    }));
    let app = test.router();

    let (status, start) = request(&app, "POST", "/api/uar/start", "{}").await;
    assert_eq!(status, StatusCode::OK, "{start}");
    assert_eq!(start["state"], "healthy");
    assert!(start["resolved_path"].is_null());

    let (status, snapshot) = request(&app, "GET", "/api/uar/status", "").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(snapshot["state"], "healthy");

    let (status, restarted) = request(&app, "POST", "/api/uar/restart", "{}").await;
    assert_eq!(status, StatusCode::OK, "{restarted}");
    assert_eq!(restarted["state"], "healthy");

    let (status, models) = request(&app, "GET", "/api/uar/models", "").await;
    assert_eq!(status, StatusCode::OK, "{models}");
    assert_eq!(
        models["openai"]["models"]["test-model"]["name"],
        "Test Model"
    );

    let (status, stopped) = request(&app, "POST", "/api/uar/stop", "{}").await;
    assert_eq!(status, StatusCode::OK, "{stopped}");
    assert_eq!(stopped["state"], "stopped");
}

#[tokio::test(flavor = "multi_thread")]
async fn operator_routes_surface_actionable_missing_binary_diagnostics() {
    let dir = tempfile::tempdir().unwrap();
    let home = dir.path().to_path_buf();
    let test = TestAppState::with_builder(MockKernelBuilder::new().with_config(move |config| {
        config.home_dir = home;
        config.uar = Some(librefang_types::config::UarConfig {
            sidecar: librefang_types::config::UarSidecarConfig {
                enabled: true,
                command: "uar-sidecar".to_string(),
                restart: false,
                ..Default::default()
            },
            ..Default::default()
        });
    }));
    let app = test.router();

    let (status, failure) = request(&app, "POST", "/api/uar/start", "{}").await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{failure}");
    let error = failure["error"].as_str().unwrap();
    assert!(error.contains("Searched:"), "{error}");
    assert!(error.contains("bin/uar-sidecar"), "{error}");
    assert!(error.contains("$PATH"), "{error}");
    assert!(error.contains("set the sidecar's `command`"), "{error}");

    let (status, snapshot) = request(&app, "GET", "/api/uar/status", "").await;
    assert_eq!(status, StatusCode::OK, "{snapshot}");
    assert_eq!(snapshot["state"], "crash_looping");
    assert!(snapshot["last_error"]
        .as_str()
        .is_some_and(|value| value.contains("Searched:")));
}

#[cfg(feature = "uar-driver")]
#[tokio::test(flavor = "multi_thread")]
async fn test_route_issues_completion_through_http_driver() {
    let endpoint = fake_uar().await;
    let test = TestAppState::with_builder(MockKernelBuilder::new().with_config(move |config| {
        config.uar = Some(librefang_types::config::UarConfig {
            model: "openai/test-model".to_string(),
            sidecar: librefang_types::config::UarSidecarConfig {
                enabled: true,
                endpoint: Some(endpoint),
                ..Default::default()
            },
            ..Default::default()
        });
    }));
    let app = test.router();
    let (start_status, start) = request(&app, "POST", "/api/uar/start", "{}").await;
    assert_eq!(start_status, StatusCode::OK, "{start}");

    let (status, result) = request(&app, "POST", "/api/uar/test", "{}").await;
    assert_eq!(status, StatusCode::OK, "{result}");
    assert_eq!(result["ok"], true);
    assert_eq!(result["reply"], "BossFang UAR is ready.");
    assert!(result["latency_ms"].as_u64().is_some());
}

#[cfg(not(feature = "uar-driver"))]
#[tokio::test(flavor = "multi_thread")]
async fn test_route_reports_disabled_feature_in_minimal_builds() {
    let app = TestAppState::new().router();
    let (status, result) = request(&app, "POST", "/api/uar/test", "{}").await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{result}");
    assert_eq!(result["ok"], false);
    assert!(result["error"]
        .as_str()
        .is_some_and(|value| value.contains("without the uar-driver feature")));
}
