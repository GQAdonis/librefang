use std::process::Command;

fn main() {
    // Ensure the dashboard embed directory exists so `include_dir!` never
    // fails on fresh clones/worktrees.
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let dashboard_dir = manifest_dir.join("static").join("react");
    if !dashboard_dir.exists() {
        std::fs::create_dir_all(&dashboard_dir)
            .expect("failed to create static/react placeholder directory");
    }

    // --- Dashboard frontend build ---
    //
    // Rerun ONLY when dashboard source changes, not on every Rust-side change.
    // Granular directives prevent unnecessary pnpm invocations so that touching
    // a .rs file does not trigger a ~60s frontend rebuild.
    println!("cargo:rerun-if-changed=dashboard/src");
    println!("cargo:rerun-if-changed=dashboard/package.json");
    println!("cargo:rerun-if-changed=dashboard/pnpm-lock.yaml");
    println!("cargo:rerun-if-changed=dashboard/vite.config.ts");
    println!("cargo:rerun-if-changed=dashboard/tsconfig.json");
    println!("cargo:rerun-if-changed=dashboard/index.html");

    // Escape hatch: set SKIP_DASHBOARD_BUILD=1 in CI jobs that pre-build
    // the dashboard in a separate step, or for `cargo check` workflows.
    if std::env::var("SKIP_DASHBOARD_BUILD").as_deref() != Ok("1") {
        let dashboard_src = manifest_dir.join("dashboard");

        // Set CI=true so pnpm never prompts for TTY confirmation when it needs
        // to purge the node_modules directory (e.g. after a lockfile change).
        // The build script always runs in a non-interactive subprocess.
        let status = Command::new("pnpm")
            .args([
                "--dir",
                dashboard_src.to_str().unwrap(),
                "install",
                "--frozen-lockfile",
            ])
            .env("CI", "true")
            .status()
            .expect("pnpm not found — install Node.js and pnpm");
        assert!(status.success(), "pnpm install failed");

        let status = Command::new("pnpm")
            .args(["--dir", dashboard_src.to_str().unwrap(), "run", "build"])
            .status()
            .expect("pnpm run build failed");
        assert!(status.success(), "pnpm run build failed");
    }
    // --------------------------------

    // Capture git commit hash at build time.
    let git_sha = Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string());
    println!("cargo:rustc-env=GIT_SHA={git_sha}");

    // Capture build date (UTC, date only).
    let build_date = Command::new("date")
        .args(["-u", "+%Y-%m-%d"])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string());
    println!("cargo:rustc-env=BUILD_DATE={build_date}");

    // Capture rustc version.
    let rustc_ver = Command::new("rustc")
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else {
                None
            }
        })
        .unwrap_or_else(|| "unknown".to_string());
    println!("cargo:rustc-env=RUSTC_VERSION={rustc_ver}");
}
