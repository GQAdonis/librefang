#!/usr/bin/env node

// Package only the native BossFang executable. The Rust build embeds the
// dashboard; its source asset digest remains in the manifest for provenance.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const target = process.argv[2];
const hosts = {
  "aarch64-apple-darwin": { platform: "darwin", arch: "arm64", binary: "bossfang" },
  "x86_64-pc-windows-msvc": { platform: "win32", arch: "x64", binary: "bossfang.exe" },
};
const host = hosts[target];
if (!host || process.platform !== host.platform || process.arch !== host.arch) {
  throw new Error(`Unsupported or nonnative BossFang payload target: ${target}`);
}

const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (!/^[0-9a-f]{40}$/.test(process.env.SOURCE_SHA ?? "") || process.env.SOURCE_SHA !== sourceCommit) {
  throw new Error("SOURCE_SHA must equal the checked-out 40-character source commit");
}

const root = resolve(import.meta.dirname, "..");
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
for (const path of dashboardFiles) {
  assetHash.update(relative(dashboard, path).replaceAll("\\", "/"));
  assetHash.update("\0");
  assetHash.update(await hashFile(path));
  assetHash.update("\n");
}

const binarySource = join(root, "target", target, "release", host.binary);
const binaryStat = await stat(binarySource);
if (!binaryStat.isFile() || binaryStat.size === 0) throw new Error("BossFang binary is missing or empty");
const output = join(root, "dist/bossfang-sidecar", target);
await mkdir(output, { recursive: true });
await copyFile(binarySource, join(output, host.binary));
const binarySha256 = await hashFile(binarySource);
const manifest = {
  schemaVersion: 1,
  sourceCommit,
  target,
  executable: host.binary,
  bytes: binaryStat.size,
  sha256: binarySha256,
  dashboard: {
    basePath: "/dashboard/",
    embedded: true,
    assetCount: dashboardFiles.length,
    sourceAssetsSha256: assetHash.digest("hex"),
  },
  features: ["telemetry", "surreal-backend", "uar-driver"],
};
await writeFile(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(join(output, `${host.binary}.sha256`), `${binarySha256}  ${host.binary}\n`);
console.log(`Packaged ${target} BossFang from ${sourceCommit}: ${binaryStat.size} bytes, sha256 ${binarySha256}`);
