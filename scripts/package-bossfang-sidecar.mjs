#!/usr/bin/env node

// Package only the native BossFang executable. The Rust build embeds the
// dashboard; its source asset digest remains in the manifest for provenance.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { machine, release } from "node:os";

const target = process.argv[2];
const hosts = {
  "aarch64-apple-darwin": { platform: "darwin", arch: "arm64", binary: "bossfang" },
  "x86_64-apple-darwin": { platform: "darwin", arch: "x64", binary: "bossfang" },
  "x86_64-pc-windows-msvc": { platform: "win32", arch: "x64", binary: "bossfang.exe" },
  "aarch64-pc-windows-msvc": { platform: "win32", arch: "arm64", binary: "bossfang.exe" },
};
const host = hosts[target];
if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("BossFang packaging requires Node.js 22+");
if (!host || process.platform !== host.platform || process.arch !== host.arch) {
  throw new Error(`Unsupported or nonnative BossFang payload target: ${target}`);
}
const nativeMachine = machine().toLowerCase();
const machineArch = ["arm64", "aarch64"].includes(nativeMachine) ? "arm64"
  : ["x86_64", "x64", "amd64"].includes(nativeMachine) ? "x64" : null;
if (machineArch !== host.arch) throw new Error(`Native host machine differs from target: ${nativeMachine}`);

const root = resolve(import.meta.dirname, "..");
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/.test(process.env.SOURCE_SHA ?? "") || process.env.SOURCE_SHA !== sourceCommit) {
  throw new Error("SOURCE_SHA must equal the checked-out 40-character source commit");
}

if (process.argv[3] === "--verify-host") {
  console.log(`Native ${process.platform}-${process.arch} host ${nativeMachine} for ${target}, source ${sourceCommit}`);
  process.exit(0);
}
const dashboard = join(root, "crates/librefang-api/static/react");
const shell = await readFile(join(dashboard, "index.html"), "utf8");
if (!shell.includes("/dashboard/")) {
  throw new Error("Built BossFang dashboard shell has the wrong base path");
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

const dashboardFiles = (await filesBelow(dashboard)).sort();
if (!dashboardFiles.some((path) => path.endsWith(".js")) || !dashboardFiles.some((path) => path.endsWith(".css"))) {
  throw new Error("Built BossFang dashboard lacks JavaScript or CSS assets");
}
const assetHash = createHash("sha256");
const inventory = [];
for (const path of dashboardFiles) {
  const file = { path: relative(dashboard, path).replaceAll("\\", "/"), size: (await stat(path)).size, sha256: await hashFile(path) };
  inventory.push(file);
  assetHash.update(file.path);
  assetHash.update("\0");
  assetHash.update(file.sha256);
  assetHash.update("\n");
}

const binarySource = join(root, "target", target, "release", host.binary);
const binaryStat = await stat(binarySource);
if (!binaryStat.isFile() || binaryStat.size === 0) throw new Error("BossFang binary is missing or empty");
const binaryBytes = await readFile(binarySource);
if (host.platform === "darwin") {
  const cpu = host.arch === "arm64" ? 0x0100000c : 0x01000007;
  if (binaryBytes.length < 8 || binaryBytes.readUInt32LE(0) !== 0xfeedfacf || binaryBytes.readUInt32LE(4) !== cpu)
    throw new Error("BossFang executable Mach-O architecture differs from native target");
} else {
  const pe = binaryBytes.length >= 64 ? binaryBytes.readUInt32LE(0x3c) : -1;
  const cpu = host.arch === "arm64" ? 0xaa64 : 0x8664;
  if (pe < 0 || pe + 6 > binaryBytes.length || binaryBytes.readUInt16LE(0) !== 0x5a4d
    || binaryBytes.readUInt32LE(pe) !== 0x00004550 || binaryBytes.readUInt16LE(pe + 4) !== cpu)
    throw new Error("BossFang executable PE architecture differs from native target");
}
// webchat.rs uses include_dir! without compression. Inspect the shipped bytes
// rather than claiming that the filesystem inventory proves embedding.
for (const path of dashboardFiles) {
  const bytes = await readFile(path);
  if (bytes.length && !binaryBytes.includes(bytes)) throw new Error(`BossFang executable lacks embedded dashboard asset: ${relative(dashboard, path)}`);
}
const output = join(root, "dist/bossfang-sidecar", target);
await mkdir(output, { recursive: true });
const binarySha256 = await hashFile(binarySource);
const platform = `${host.platform}-${host.arch}`;
const asset = `bossfang-${platform}${host.platform === "win32" ? ".exe" : ""}`;
await copyFile(binarySource, join(output, asset));
const sourceFiles = ["Cargo.lock", "rust-toolchain.toml", "crates/librefang-api/build.rs",
  "crates/librefang-api/src/webchat.rs", "crates/librefang-api/dashboard/pnpm-lock.yaml",
  "crates/librefang-api/dashboard/vite.config.ts", ".github/workflows/bossfang-sidecar-payload.yml",
  "scripts/package-bossfang-sidecar.mjs"];
const provenanceFiles = [];
for (const path of sourceFiles) provenanceFiles.push({ path, sha256: await hashFile(join(root, path)) });
const manifest = {
  schemaVersion: 1,
  sourceCommit,
  target,
  executable: host.binary,
  asset,
  bytes: binaryStat.size,
  sha256: binarySha256,
  dashboard: {
    basePath: "/dashboard/",
    embedded: true,
    assetCount: dashboardFiles.length,
    sourceAssetsSha256: assetHash.digest("hex"),
    files: inventory,
    embeddingEvidence: "all-nonempty-asset-bytes-present-in-native-executable",
  },
  features: ["telemetry", "surreal-backend", "uar-driver"],
  uarLifecycle: "connection-only",
  provenance: {
    host: { platform: process.platform, arch: process.arch, machine: nativeMachine, release: release(), node: process.version },
    rustc: execFileSync("rustc", ["--version"], { cwd: root, encoding: "utf8" }).trim(),
    cargo: execFileSync("cargo", ["--version"], { cwd: root, encoding: "utf8" }).trim(),
    build: { package: "librefang-cli", binary: "bossfang", profile: "release", locked: true,
      requestedFeatures: ["telemetry", "surreal-backend", "uar-driver"],
      lto: process.env.CARGO_PROFILE_RELEASE_LTO ?? "workspace-default",
      codegenUnits: process.env.CARGO_PROFILE_RELEASE_CODEGEN_UNITS ?? "workspace-default",
      debug: process.env.CARGO_PROFILE_RELEASE_DEBUG ?? "workspace-default" },
    sourceFiles: provenanceFiles,
  },
};
await writeFile(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(output, `${asset}.sha256`), `${binarySha256}  ${asset}\n`);
console.log(`Packaged ${target} BossFang from ${sourceCommit}: ${binaryStat.size} bytes, sha256 ${binarySha256}`);
