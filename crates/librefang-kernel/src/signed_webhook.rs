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
use sha2::Sha256;
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

/// Body of one cron fire, in the Standard Webhooks envelope shape:
/// `{"type": event_type, "timestamp": fired_at, "data": {..job data.., "bossTaskId": job id, "dueAt": due time}}`.
/// Nothing else is added at either level. The stamped `data` fields are written last, so they win even over a `data` that bypassed validation.
/// `fired_at` is fixed when the body is built, so every retry sends identical bytes.
pub fn cron_fire_body(
    event_type: &str,
    data: &serde_json::Map<String, serde_json::Value>,
    job_id: CronJobId,
    due_at: DateTime<Utc>,
    fired_at: DateTime<Utc>,
) -> Result<Vec<u8>, String> {
    let mut inner = data.clone();
    for key in SIGNED_WEBHOOK_RESERVED_KEYS {
        inner.remove(*key);
    }
    inner.insert("bossTaskId".into(), job_id.to_string().into());
    inner.insert("dueAt".into(), rfc3339(due_at).into());
    let body = serde_json::json!({
        "type": event_type,
        "timestamp": rfc3339(fired_at),
        "data": inner,
    });
    serde_json::to_vec(&body).map_err(|e| format!("signed webhook body did not serialize: {e}"))
}

fn rfc3339(t: DateTime<Utc>) -> String {
    t.to_rfc3339_opts(SecondsFormat::Secs, true)
}

/// The approved skill announced by the skill-workshop publish hook.
pub struct SkillPublication<'a> {
    pub event_type: &'a str,
    pub slug: &'a str,
    pub title: &'a str,
    pub summary: &'a str,
    pub instructions: &'a str,
    pub approved_by: &'a str,
    pub approved_at: DateTime<Utc>,
    pub target_agent_ids: &'a [String],
}

/// Receiver limits for a published skill (`openduet.skill.published.v1`): a body outside them would be refused, so it is not sent.
const SKILL_TITLE_MAX: usize = 160;
const SKILL_SUMMARY_MAX: usize = 300;
const SKILL_INSTRUCTIONS_MAX: usize = 20_000;
const SKILL_APPROVER_MAX: usize = 200;
const SKILL_TARGET_ID_MAX: usize = 128;
const SKILL_TARGETS_MAX: usize = 50;

/// `^[a-z0-9][a-z0-9_-]{0,62}[a-z0-9]$`: BossFang skill names are sent as-is, never rewritten.
fn is_publishable_slug(slug: &str) -> bool {
    let b = slug.as_bytes();
    let edge = |c: &u8| c.is_ascii_lowercase() || c.is_ascii_digit();
    (2..=64).contains(&b.len())
        && edge(&b[0])
        && edge(&b[b.len() - 1])
        && b.iter().all(|c| edge(c) || *c == b'-' || *c == b'_')
}

/// Trimmed length is 1..=max characters.
fn check_text(field: &str, value: &str, max: usize) -> Result<(), String> {
    let n = value.trim().chars().count();
    if n == 0 || n > max {
        return Err(format!("{field} must be 1..={max} characters, got {n}"));
    }
    Ok(())
}

/// Body of a skill-publish event, in the Standard Webhooks envelope shape:
/// `{"type", "timestamp", "data": {"slug", "title", "summary", "instructions", "approvedBy", "approvedAt", "targetAgentIds"?}}`.
/// Returns `Err` with the reason when a field falls outside the receiver's limits; the caller then skips the publish rather than send a body that would be refused.
pub fn skill_published_body(p: &SkillPublication<'_>) -> Result<Vec<u8>, String> {
    if !is_publishable_slug(p.slug) {
        return Err(format!(
            "slug '{}' does not match ^[a-z0-9][a-z0-9_-]{{0,62}}[a-z0-9]$",
            p.slug
        ));
    }
    check_text("title", p.title, SKILL_TITLE_MAX)?;
    check_text("summary", p.summary, SKILL_SUMMARY_MAX)?;
    check_text("instructions", p.instructions, SKILL_INSTRUCTIONS_MAX)?;
    check_text("approvedBy", p.approved_by, SKILL_APPROVER_MAX)?;
    if p.target_agent_ids.len() > SKILL_TARGETS_MAX {
        return Err(format!(
            "targetAgentIds has {} entries, max {SKILL_TARGETS_MAX}",
            p.target_agent_ids.len()
        ));
    }
    for id in p.target_agent_ids {
        check_text("targetAgentIds entry", id, SKILL_TARGET_ID_MAX)?;
    }
    let approved_at = rfc3339(p.approved_at);
    let mut data = serde_json::json!({
        "slug": p.slug,
        "title": p.title,
        "summary": p.summary,
        "instructions": p.instructions,
        "approvedBy": p.approved_by,
        "approvedAt": approved_at,
    });
    if !p.target_agent_ids.is_empty() {
        data["targetAgentIds"] = serde_json::json!(p.target_agent_ids);
    }
    let body = serde_json::json!({
        "type": p.event_type,
        "timestamp": approved_at,
        "data": data,
    });
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
    fn cron_body_is_the_wake_envelope() {
        let job_id = CronJobId::new();
        let due = DateTime::parse_from_rfc3339("2026-10-30T07:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let fired = DateTime::parse_from_rfc3339("2026-10-30T07:00:12Z")
            .unwrap()
            .with_timezone(&Utc);
        let data =
            serde_json::json!({"kind": "routine", "subjectId": "r1", "bossTaskId": "forged"});
        let body = cron_fire_body(
            "openduet.wake.v1",
            data.as_object().unwrap(),
            job_id,
            due,
            fired,
        )
        .unwrap();
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            v,
            serde_json::json!({
                "type": "openduet.wake.v1",
                "timestamp": "2026-10-30T07:00:12Z",
                "data": {
                    "kind": "routine",
                    "subjectId": "r1",
                    "bossTaskId": job_id.to_string(),
                    "dueAt": "2026-10-30T07:00:00Z",
                },
            })
        );
        assert_eq!(
            cron_fire_message_id(job_id, due),
            cron_fire_message_id(job_id, due),
            "one fire, one id"
        );
    }

    fn publication<'a>(slug: &'a str, ids: &'a [String]) -> SkillPublication<'a> {
        SkillPublication {
            event_type: "openduet.skill.published.v1",
            slug,
            title: "weekly-digest",
            summary: "Summarise the week",
            instructions: "abc",
            approved_by: "alice",
            approved_at: DateTime::parse_from_rfc3339("2026-10-30T08:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            target_agent_ids: ids,
        }
    }

    #[test]
    fn skill_body_is_the_published_envelope() {
        let ids = vec!["bot-1".to_string()];
        let body = skill_published_body(&publication("weekly-digest", &ids)).unwrap();
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            v,
            serde_json::json!({
                "type": "openduet.skill.published.v1",
                "timestamp": "2026-10-30T08:00:00Z",
                "data": {
                    "slug": "weekly-digest",
                    "title": "weekly-digest",
                    "summary": "Summarise the week",
                    "instructions": "abc",
                    "approvedBy": "alice",
                    "approvedAt": "2026-10-30T08:00:00Z",
                    "targetAgentIds": ["bot-1"],
                },
            })
        );
        let body = skill_published_body(&publication("weekly-digest", &[])).unwrap();
        let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(
            v["data"].get("targetAgentIds").is_none(),
            "empty optional omitted"
        );
    }

    #[test]
    fn skill_body_refuses_what_the_receiver_would_refuse() {
        for slug in [
            "a",
            "-ab",
            "_ab",
            "ab-",
            "ab_",
            "Ab",
            "a.b",
            &"a".repeat(65),
        ] {
            assert!(
                skill_published_body(&publication(slug, &[])).is_err(),
                "slug {slug:?} must not be sent"
            );
        }
        for slug in ["ab", "weekly_digest", "fmt-before_commit", &"a".repeat(64)] {
            assert!(
                skill_published_body(&publication(slug, &[])).is_ok(),
                "slug {slug:?} must be sent"
            );
        }
        let mut p = publication("ok-slug", &[]);
        p.summary = "  ";
        assert!(skill_published_body(&p).unwrap_err().contains("summary"));
        let too_many: Vec<String> = (0..51).map(|i| format!("b{i}")).collect();
        assert!(skill_published_body(&publication("ok-slug", &too_many)).is_err());
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
