const {
  After,
  AfterAll,
  Before,
  BeforeAll,
  Given,
  Then,
  When,
  setDefaultTimeout,
} = require("@cucumber/cucumber");
const { chromium, request } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

setDefaultTimeout(120_000);

const baseURL = process.env.BOSSFANG_BASE_URL || "http://127.0.0.1:4545";
const artifactsDir =
  process.env.BOSSFANG_BDD_ARTIFACTS || path.resolve("test-results/uar-sidecar");
const videosDir = path.join(artifactsDir, "videos");
const screenshotsDir = path.join(artifactsDir, "screenshots");
const expectedReply = "4";
const apiKey = process.env.BOSSFANG_API_KEY;
const proofModel = process.env.BOSSFANG_UAR_MODEL;
const proofAgentName = `uar-video-proof-${process.pid}-${Date.now()}`;
let browser;

BeforeAll(async function () {
  if (!apiKey) {
    throw new Error("BOSSFANG_API_KEY is required for the operator-only UAR proof");
  }
  if (!proofModel) {
    throw new Error("BOSSFANG_UAR_MODEL is required for the UAR proof");
  }
  fs.mkdirSync(videosDir, { recursive: true });
  fs.mkdirSync(screenshotsDir, { recursive: true });
  browser = await chromium.launch({ headless: true });
});

AfterAll(async function () {
  await browser?.close();
});

Before(async function () {
  this.context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: videosDir, size: { width: 1440, height: 900 } },
  });
  await this.context.addInitScript((token) => {
    sessionStorage.setItem("bossfang-api-key", token);
  }, apiKey);
  this.page = await this.context.newPage();
  this.api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { Authorization: `Bearer ${apiKey}` },
  });
});

After(async function ({ pickle, result }) {
  const slug = pickle.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (result?.status !== "PASSED") {
    await this.page
      ?.screenshot({
        path: path.join(screenshotsDir, `${slug}-failure.png`),
        fullPage: true,
      })
      .catch(() => {});
  }
  await this.context?.close();
  if (this.agentId) {
    await this.api?.delete(`/api/agents/${encodeURIComponent(this.agentId)}`).catch(() => {});
  }
  await this.api?.dispose();
});

Given("BossFang is connected to a healthy UAR endpoint", async function () {
  const statusResponse = await this.api.get("/api/uar/status");
  if (!statusResponse.ok()) {
    throw new Error(`UAR status returned HTTP ${statusResponse.status()}`);
  }
  const status = await statusResponse.json();
  if (status.state !== "healthy") {
    throw new Error(`UAR supervisor is ${status.state}: ${status.last_error || "no detail"}`);
  }

  const manifest = [
    `name = "${proofAgentName}"`,
    'version = "0.1.0"',
    'description = "Browser certification agent for the supervised UAR sidecar."',
    'module = "builtin:chat"',
    'session_mode = "new"',
    "",
    "[model]",
    'provider = "uar"',
    `model = "${proofModel}"`,
    "context_window = 128000",
    "max_tokens = 64",
    'system_prompt = "Follow the user response-format instruction exactly. Do not call tools."',
    "",
    "[capabilities]",
    "tools = []",
    "memory_read = []",
    "memory_write = []",
    "agent_spawn = false",
  ].join("\n");

  const spawnResponse = await this.api.post("/api/agents", {
    data: { manifest_toml: manifest },
  });
  if (spawnResponse.status() !== 201) {
    throw new Error(
      `UAR proof agent spawn returned HTTP ${spawnResponse.status()}: ${await spawnResponse.text()}`,
    );
  }
  this.agentId = (await spawnResponse.json()).agent_id;
});

When("I open the UAR provider controls", async function () {
  await this.page.goto("/dashboard/providers");
  const panel = this.page.getByTestId("uar-control-panel");
  await panel.waitFor({ state: "visible" });
  await panel.getByText("healthy", { exact: true }).waitFor({ state: "visible" });
  await this.page.screenshot({
    path: path.join(screenshotsDir, "01-uar-healthy.png"),
    fullPage: true,
  });
});

When("I complete a UAR provider test", async function () {
  const panel = this.page.getByTestId("uar-control-panel");
  await panel.getByLabel("Test model").fill(proofModel);
  await panel.getByRole("button", { name: "Test the UAR" }).click();
  await panel.getByTestId("uar-test-result").waitFor({ state: "visible" });
  await this.page.screenshot({
    path: path.join(screenshotsDir, "02-uar-provider-test.png"),
    fullPage: true,
  });
});

When("I send a prompt from the UAR-backed agent chat", async function () {
  await this.page.goto(`/dashboard/chat?agentId=${encodeURIComponent(this.agentId)}`);
  const input = this.page.locator("textarea").last();
  await input.waitFor({ state: "visible" });
  await input.fill("What is 2 + 2? Reply with only the numeral.");
  await input.press("Enter");
});

Then("the chat shows the UAR completion", async function () {
  await this.page.getByText(expectedReply, { exact: true }).waitFor({
    state: "visible",
    timeout: 90_000,
  });
  await this.page.screenshot({
    path: path.join(screenshotsDir, "03-uar-chat-completion.png"),
    fullPage: true,
  });
});
