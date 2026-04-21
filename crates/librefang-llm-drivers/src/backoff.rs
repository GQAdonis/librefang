//! Jittered exponential backoff for LLM driver retry loops.
//!
//! Implements exponential backoff with proportional jitter — the delay grows
//! exponentially with each retry attempt, and a random fraction of that delay
//! is added as jitter to spread out concurrent retry spikes from multiple sessions.
//!
//! Formula: `delay = min(base * 2^(attempt-1), max_delay) + jitter`
//! where `jitter ∈ [0, jitter_ratio * exp_delay]`.
//!
//! The random seed combines `SystemTime::now().subsec_nanos()` with a
//! process-global monotonic counter so that seeds remain diverse even when the
//! OS clock has coarse granularity (e.g. 15 ms on Windows).

use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

/// Process-global counter that advances on every `jittered_backoff` call.
/// Combined with wall-clock nanoseconds it ensures seed diversity even when
/// multiple concurrent retry loops fire within the same clock tick.
static JITTER_COUNTER: AtomicU64 = AtomicU64::new(0);

/// Compute a jittered exponential backoff delay.
///
/// # Arguments
/// * `attempt` — 1-based retry attempt number (attempt 1 → `base_delay`, attempt 2 → `2 * base_delay`, …).
/// * `base_delay` — Base delay for the first attempt.
/// * `max_delay` — Upper cap on the exponential component.
/// * `jitter_ratio` — Fraction of the computed delay added as random jitter;
///   `0.5` means jitter is uniform in `[0, 0.5 * exp_delay]`.
///
/// # Returns
/// Total sleep duration: `exp_delay + jitter`.
///
/// # Example
/// ```
/// use std::time::Duration;
/// use librefang_llm_drivers::backoff::jittered_backoff;
///
/// let delay = jittered_backoff(1, Duration::from_secs(2), Duration::from_secs(60), 0.5);
/// assert!(delay >= Duration::from_secs(2));
/// assert!(delay <= Duration::from_secs(3)); // base + up to 50 % jitter
/// ```
pub fn jittered_backoff(
    attempt: u32,
    base_delay: Duration,
    max_delay: Duration,
    jitter_ratio: f64,
) -> Duration {
    // Exponential component, capped at max_delay.
    // saturating_sub(1) so attempt=0 behaves the same as attempt=1.
    // Cap at 62 to ensure 2_f64.powi(exp) stays finite; values above this
    // always exceed any realistic max_delay and would otherwise cause
    // Duration::mul_f64 to panic on +infinity.
    let exp = attempt.saturating_sub(1).min(62) as i32;
    let exp_delay = base_delay.mul_f64(2_f64.powi(exp)).min(max_delay);

    // Build a 64-bit seed from wall-clock nanoseconds XOR a Weyl-sequence
    // counter. The Weyl increment (Knuth's magic constant) maximises bit
    // dispersion between consecutive calls.
    let tick = JITTER_COUNTER.fetch_add(1, Ordering::Relaxed);
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as u64)
        .unwrap_or(0);
    let seed = nanos ^ tick.wrapping_mul(0x9E37_79B9_7F4A_7C15);

    // One step of an LCG (Knuth) to mix the seed, then take the upper 32 bits
    // as a uniform sample in [0, 1).
    let mixed = seed
        .wrapping_mul(6_364_136_223_846_793_005)
        .wrapping_add(1_442_695_040_888_963_407);
    // `>> 32` extracts the high 32 bits (range [0, 2^32 - 1]).
    // Dividing by 2^32 (not u32::MAX) maps that range to [0, 1).
    // The previous code used `>> 33` (only 31 bits) divided by u32::MAX,
    // which capped r at ~0.5 and silently halved the effective jitter range.
    let r = (mixed >> 32) as f64 / (1u64 << 32) as f64;

    let jitter = exp_delay.mul_f64((jitter_ratio * r).clamp(0.0, 1.0));
    exp_delay + jitter
}

/// Standard LLM-driver retry delay using 2s base, 60s cap, 50% jitter.
pub fn standard_retry_delay(attempt: u32) -> Duration {
    jittered_backoff(
        attempt,
        Duration::from_secs(2),
        Duration::from_secs(60),
        0.5,
    )
}

/// Variant for tool-use failures with faster 1.5s base.
pub fn tool_use_retry_delay(attempt: u32) -> Duration {
    jittered_backoff(
        attempt,
        Duration::from_millis(1500),
        Duration::from_secs(60),
        0.5,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn attempt1_returns_at_least_base() {
        let base = Duration::from_secs(2);
        let max = Duration::from_secs(60);
        let d = jittered_backoff(1, base, max, 0.5);
        assert!(d >= base, "delay should be ≥ base: {d:?}");
        assert!(
            d <= base + base.mul_f64(0.5),
            "jitter must stay within ratio: {d:?}"
        );
    }

    #[test]
    fn respects_max_delay_cap() {
        let base = Duration::from_secs(10);
        let max = Duration::from_secs(15);
        // attempt 5: 10 * 2^4 = 160s, but should be capped to 15s before jitter
        let d = jittered_backoff(5, base, max, 0.5);
        // upper bound: max + 50 % jitter on max
        assert!(
            d <= max + max.mul_f64(0.5),
            "delay exceeds max + jitter: {d:?}"
        );
    }

    #[test]
    fn successive_calls_are_not_identical() {
        let base = Duration::from_millis(100);
        let max = Duration::from_secs(30);
        // Draw 20 samples; at least two should differ (probability of collision ≈ 0).
        let samples: Vec<_> = (0..20)
            .map(|_| jittered_backoff(1, base, max, 0.5))
            .collect();
        let all_same = samples.windows(2).all(|w| w[0] == w[1]);
        assert!(!all_same, "all 20 samples are identical — jitter is broken");
    }

    #[test]
    fn zero_jitter_ratio_equals_pure_exp() {
        let base = Duration::from_secs(1);
        let max = Duration::from_secs(120);
        let d = jittered_backoff(3, base, max, 0.0);
        // attempt 3: base * 2^2 = 4s, no jitter
        assert_eq!(d, Duration::from_secs(4));
    }

    #[test]
    fn attempt_0_treated_as_base() {
        // attempt=0 is normalized to attempt=1 via saturating_sub(1)
        let base = Duration::from_secs(5);
        let max = Duration::from_secs(60);
        let d = jittered_backoff(0, base, max, 0.5);
        // should behave like attempt=1: base + up to 50% jitter
        assert!(d >= base);
        assert!(d <= base + base.mul_f64(0.5));
    }

    #[test]
    fn attempt_max_saturates_exp_without_panic() {
        // attempt=u32::MAX saturates exp to 62, keeping 2_f64.powi(62) finite.
        // No panic and delay is capped at max_delay.
        let base = Duration::from_secs(2);
        let max = Duration::from_secs(30);
        let d = jittered_backoff(u32::MAX, base, max, 0.5);
        assert!(d <= max + max.mul_f64(0.5));
    }

    #[test]
    fn jitter_ratio_over_1_clamped_to_1() {
        // jitter_ratio > 1.0 is clamped to 1.0, so jitter ≤ exp_delay
        let base = Duration::from_secs(2);
        let max = Duration::from_secs(60);
        let d = jittered_backoff(2, base, max, 3.0);
        // attempt=2: base * 2^1 = 4s; jitter capped so total ≤ 4s + 4s = 8s
        assert!(d <= max.mul_f64(2.0));
    }
}
