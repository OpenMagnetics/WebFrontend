// The BUILT design picker (dist/picker.html) driven through a real MCP Apps host bridge.
//
// tests/host/ is a minimal host on the official AppBridge; it loads dist/picker.html in an
// iframe, sends a tool result captured from this server's advise_magnetics, and records the
// ui/update-model-context requests the widget makes. Headless Chromium only.
//
//   npm run build && node --test tests/picker.widget.test.mjs
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const HERE = dirname(fileURLToPath(import.meta.url));
const MCP = join(HERE, "..");
const ORIGIN = "http://picker.test";
const FAST = JSON.parse(readFileSync(join(HERE, "fixtures/advise_magnetics_fast.json"))).structuredContent;
const FULL_CAPS = { updateModelContext: { text: {} } };

let browser, hostDir, widgetHtml, hostHtml;

before(async () => {
  const bundle = join(MCP, "dist", "picker.html");
  if (!existsSync(bundle)) throw new Error(`${bundle} is missing: run npm run build first`);
  widgetHtml = readFileSync(bundle, "utf8");
  hostDir = mkdtempSync(join(tmpdir(), "om-picker-host-"));
  await build({
    configFile: false, root: join(HERE, "host"), logLevel: "error", plugins: [viteSingleFile()],
    build: { outDir: hostDir, emptyOutDir: true, rollupOptions: { input: join(HERE, "host", "host.html") } },
  });
  hostHtml = readFileSync(join(hostDir, "host.html"), "utf8");
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (hostDir) rmSync(hostDir, { recursive: true, force: true });
});

/** A fresh page with the host loaded and the widget fed `result`. */
async function open({ result, capabilities = FULL_CAPS, toolName = "advise_magnetics", refuseContext = false }) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/" || path === "/host.html") return route.fulfill({ contentType: "text/html", body: hostHtml });
    if (path === "/picker.html") return route.fulfill({ contentType: "text/html", body: widgetHtml });
    return route.fulfill({ status: 404, body: `no ${path}` });
  });
  await page.goto(`${ORIGIN}/host.html`);
  await page.evaluate((opts) => window.startHost(opts), { result, capabilities, toolName, refuseContext });
  await page.waitForFunction(() => window.__host.initialized);
  const view = page.frameLocator("#view");
  return { page, view, consoleErrors };
}

const toolResult = (structuredContent) => ({ content: [{ type: "text", text: "digest" }], structuredContent });

async function columnValues(view, key) {
  const headers = await view.locator("thead th").allInnerTexts();
  const index = headers.findIndex((h) => h.replace(/[▴▾]/g, "").trim() === key);
  assert.ok(index >= 0, `no column ${key} in ${headers}`);
  return view.locator("tr.cp-row").evaluateAll(
    (rows, i) => rows.map((r) => r.children[i].textContent.trim()), index);
}

test("renders one row per design with the digest columns and the caveat", async () => {
  const { page, view, consoleErrors } = await open({ result: toolResult(FAST) });
  await view.locator("tr.cp-row").first().waitFor();
  assert.equal(await view.locator("tr.cp-row").count(), FAST.designs.length);
  assert.equal(await view.locator(".cp-title").innerText(), "magnetic designs");
  const labels = await view.locator("tr.cp-row .cp-label").allInnerTexts();
  assert.deepEqual(labels, FAST.designs.map((d) => d.label));
  assert.ok((await view.locator(".cp-caveat").innerText()).includes("fast designs"));
  assert.deepEqual(consoleErrors, []);
  await page.close();
});

test("clicking a header sorts on it, and again reverses", async () => {
  const { page, view } = await open({ result: toolResult(FAST) });
  await view.locator("tr.cp-row").first().waitFor();
  const expected = FAST.designs.map((d) => d.properties.effective_area_mm2).sort((a, b) => a - b);
  await view.locator('button.cp-sort[data-col="effective_area_mm2"]').click();
  const asc = (await columnValues(view, "effective_area_mm2")).map(Number);
  assert.deepEqual(asc, expected);
  await view.locator('button.cp-sort[data-col="effective_area_mm2"]').click();
  const desc = (await columnValues(view, "effective_area_mm2")).map(Number);
  assert.deepEqual(desc, [...expected].reverse());
  await page.close();
});

test("the column filter narrows the table and reports a malformed bound", async () => {
  const { page, view } = await open({ result: toolResult(FAST) });
  await view.locator("tr.cp-row").first().waitFor();
  await view.locator("select.cp-filter-col").selectOption("gap_mm");
  await view.locator("input.cp-filter-text").fill(">=0.3");
  const want = FAST.designs.filter((d) => d.properties.gap_mm >= 0.3).length;
  assert.ok(want > 0 && want < FAST.designs.length, "fixture must split on this bound");
  assert.equal(await view.locator("tr.cp-row").count(), want);
  await view.locator("input.cp-filter-text").fill(">x");
  assert.match(await view.locator(".cp-filter-error").innerText(), /needs a number/);
  await page.close();
});

test("a row opens its detail: why-ranked line, every field, the handle", async () => {
  const { page, view } = await open({ result: toolResult(FAST) });
  await view.locator("tr.cp-row").nth(1).click();
  const detail = view.locator("tr.cp-detail");
  await detail.waitFor();
  const text = await detail.innerText();
  assert.match(text, /#2 of 4/);
  assert.ok(text.includes(FAST.tiebreaker));
  assert.ok(text.includes(FAST.designs[1].ref));
  assert.ok(text.includes("winding_losses_w"), text);
  await page.close();
});

test("'use this' sends the chosen design's handle to the host through updateModelContext", async () => {
  const { page, view } = await open({ result: toolResult(FAST) });
  const row = view.locator("tr.cp-row").nth(2);
  await row.locator("button.cp-use").click();
  await page.waitForFunction(() => window.__host.contexts.length === 1);
  const [ctx] = await page.evaluate(() => window.__host.contexts);
  assert.equal(ctx.structuredContent.selected.ref, FAST.designs[2].ref);
  assert.equal(ctx.structuredContent.selected.rank, 3);
  assert.equal(ctx.structuredContent.context.source, "advise_magnetics");
  const text = ctx.content[0].text;
  assert.ok(text.includes(FAST.designs[2].ref), text);
  assert.ok(text.includes("fetch_design"), text);
  await assert.doesNotReject(row.locator("button.cp-use", { hasText: "selected" }).waitFor());
  await page.close();
});

test("a host without updateModelContext gets a visible error, not a silent no-op", async () => {
  const { page, view } = await open({ result: toolResult(FAST), capabilities: {} });
  await view.locator("tr.cp-row button.cp-use").first().click();
  const alert = view.locator(".cp-error");
  await alert.waitFor();
  assert.match(await alert.innerText(), /no updateModelContext capability/);
  assert.equal(await page.evaluate(() => window.__host.contexts.length), 0);
  assert.equal(await view.locator("button.cp-use", { hasText: "selected" }).count(), 0);
  await page.close();
});

test("a host that rejects the update is reported, and nothing is marked selected", async () => {
  const { page, view } = await open({ result: toolResult(FAST), refuseContext: true });
  await view.locator("tr.cp-row button.cp-use").first().click();
  const alert = view.locator(".cp-error");
  await alert.waitFor();
  assert.match(await alert.innerText(), /did not reach the assistant/);
  assert.equal(await view.locator("button.cp-use", { hasText: "selected" }).count(), 0);
  await page.close();
});

test("a payload of another shape, or a failed tool, is shown as its specific error", async () => {
  for (const [result, pattern] of [
    [toolResult({ mode: "curves", series: [] }), /mode "curves"/],
    [toolResult({ mode: "design", designs: [] }), /kind is required/],
    [{ content: [{ type: "text", text: "the adviser returned no designs" }], isError: true }, /The tool failed: the adviser returned no designs/],
    [{ content: [{ type: "text", text: "x" }] }, /no structured content/],
  ]) {
    const { page, view } = await open({ result });
    const alert = view.locator(".cp-error");
    await alert.waitFor();
    assert.match(await alert.innerText(), pattern);
    await page.close();
  }
});
