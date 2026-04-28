//! SurrealDB-backed [`crate::storage_backends::TotpUsedCodesBackend`].
//!
//! Persists TOTP replay-prevention code hashes through the shared
//! [`librefang_storage::SurrealSession`]. The schema lives in migration
//! `015_totp_used_codes` (see `librefang-storage::migrations`).

use librefang_storage::SurrealSession;
use surrealdb::{engine::any::Any, Surreal};
use tokio::runtime::Handle;

use crate::storage_backends::TotpUsedCodesBackend;

/// SurrealDB-backed implementation of [`TotpUsedCodesBackend`].
pub struct SurrealTotpUsedCodesBackend {
    db: Surreal<Any>,
}

impl SurrealTotpUsedCodesBackend {
    pub fn open(session: &SurrealSession) -> Self {
        Self {
            db: session.client().clone(),
        }
    }

    fn block_on<F: std::future::Future>(&self, f: F) -> F::Output {
        match Handle::try_current() {
            Ok(handle) => tokio::task::block_in_place(|| handle.block_on(f)),
            Err(_) => tokio::runtime::Runtime::new()
                .expect("tokio runtime")
                .block_on(f),
        }
    }
}

impl TotpUsedCodesBackend for SurrealTotpUsedCodesBackend {
    fn is_code_used(&self, code_hash: &str, window_start_secs: i64) -> bool {
        let hash = code_hash.to_string();
        self.block_on(async {
            let mut res = match self
                .db
                .query(
                    "SELECT count() AS n FROM totp_used_codes \
                     WHERE code_hash = $hash AND used_at >= $window GROUP ALL",
                )
                .bind(("hash", hash))
                .bind(("window", window_start_secs))
                .await
            {
                Ok(r) => r,
                Err(_) => return false,
            };
            let row: Option<serde_json::Value> = res.take(0).unwrap_or(None);
            row.and_then(|v| v.get("n").and_then(|n| n.as_i64()))
                .unwrap_or(0)
                > 0
        })
    }

    fn mark_code_used(&self, code_hash: &str, used_at_secs: i64) {
        let hash = code_hash.to_string();
        self.block_on(async {
            let _ = self
                .db
                .query(
                    "UPSERT totp_used_codes SET code_hash = $hash, used_at = $ts \
                     WHERE code_hash = $hash",
                )
                .bind(("hash", hash))
                .bind(("ts", used_at_secs))
                .await;
        })
    }

    fn prune_old_codes(&self, cutoff_secs: i64) {
        self.block_on(async {
            let _ = self
                .db
                .query("DELETE totp_used_codes WHERE used_at < $cutoff")
                .bind(("cutoff", cutoff_secs))
                .await;
        })
    }
}
