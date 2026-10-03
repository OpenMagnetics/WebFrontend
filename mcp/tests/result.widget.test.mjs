// The BUILT result panel (dist/result.html, ABT #654) driven through a real MCP Apps host
// bridge, fed tool results captured from this server's analysis tools on the real engine
// (tests/fixtures/result_*.json). Headless Chromium only.
//
//   npm run build && node --test tests/result.widget.test.mjs
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { fixture, startHarness, toolResult } from "./widgetHarness.mjs";

const CORE = fixture("result_core_losses").structuredContent;
const WINDING = fixture("result_winding_losses_transformer").structuredContent;
const LEAKAGE = fixture("result_leakage_transformer").structuredContent;
const PEAK = fixture("result_peak_winding_current").structuredContent;
const TEMPERATURE = fixture("result_core_temperature").structuredContent;
const MESSAGE_CAPS = { message: { text: {} } };

let harness;
before(async () => { harness = await startHarness(["result.html"]); });
after(async () => { await harness?.stop(); });

const open = (structuredContent, toolName, extra = {}) =>
  harness.open("result.html", { result: toolResult(structuredContent), toolName, ...extra });

const cellTexts = (locator) => locator.evaluateAll((trs) => trs.map((tr) =>
  [...tr.children].map((td) => td.textContent.trim())));

test("core losses: the number, the model, every engine figure and the operating point", async () => {
  const { page, view, pageErrors } = await open(CORE, "core_losses");
  await view.locator(".rp-headline").waitFor();
  assert.equal(await view.locator(".w-title").innerText(), "Core losses");
  assert.equal(await view.locator(".rp-headline .rp-value").innerText(), "56.59 mW");
  assert.equal(await view.locator(".rp-model-name").innerText(), CORE.model);
  const shown = await view.locator(".rp-quantity").evaluateAll((ns) => ns.map((n) => n.dataset.quantity));
  assert.deepEqual(shown, Object.keys(CORE.quantities));
  const conditions = await view.locator(".rp-conditions tr").evaluateAll((trs) => trs.map((tr) => tr.dataset.condition));
  assert.deepEqual(conditions, Object.keys(CORE.conditions));
  assert.equal(await view.locator('tr[data-condition="primary.frequency"] td').nth(1).innerText(), "100 kHz");
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("winding losses: DC / skin / proximity, each split per winding exactly as the engine reported", async () => {
  const { page, view } = await open(WINDING, "winding_losses");
  await view.locator(".rp-headline").waitFor();
  for (const key of ["ohmicLosses", "skinEffectLosses", "proximityEffectLosses", "dcResistancePerWinding"]) {
    const rows = await cellTexts(view.locator(`table.rp-breakdown[data-quantity="${key}"] tbody tr`));
    assert.deepEqual(rows.map((r) => r[0]), Object.keys(WINDING.quantities[key].breakdown), key);
  }
  const ohmic = await cellTexts(view.locator('table.rp-breakdown[data-quantity="ohmicLosses"] tbody tr'));
  assert.deepEqual(ohmic, [["primary", "780.4 mW"], ["secondary", "410.5 mW"]]);
  // DC resistance has no single value: shown as stated-absent, not as a sum nobody computed.
  const resistance = view.locator('.rp-quantity[data-quantity="dcResistancePerWinding"] .rp-value span');
  assert.equal(await resistance.getAttribute("title"), "no single value: the parts below do not add to one");
  await page.close();
});

test("leakage inductance renders as the matrix, in its unit", async () => {
  const { page, view } = await open(LEAKAGE, "leakage_inductance");
  await view.locator("table.rp-matrix").waitFor();
  const rows = await cellTexts(view.locator("table.rp-matrix tbody tr"));
  assert.deepEqual(rows, [["1", "0 H", "975.6 nH"], ["2", "243.9 nH", "0 H"]]);
  assert.match(await view.locator(".rp-headline .rp-label").innerText(), /primary, secondary/);
  await page.close();
});

test("peak current and core temperature: scalar results with their conditions", async () => {
  for (const [payload, tool, title, value] of [
    [PEAK, "peak_winding_current", "Peak magnetizing current", "1.596 A"],
    [TEMPERATURE, "core_temperature", "Core temperature", "35.63 °C"],
  ]) {
    const { page, view } = await open(payload, tool);
    await view.locator(".rp-headline").waitFor();
    assert.equal(await view.locator(".w-title").innerText(), title);
    assert.equal(await view.locator(".rp-headline .rp-value").innerText(), value);
    assert.equal(await view.locator(".rp-conditions tr").count(), Object.keys(payload.conditions).length);
    assert.equal(await view.locator(".rp-curve").count(), 0, `${tool} has no curve to offer`);
    await page.close();
  }
});

test("where a curve means something, the panel asks for the sweep that the curves widget draws", async () => {
  const { page, view } = await open(CORE, "core_losses", { capabilities: MESSAGE_CAPS });
  const button = view.locator("button.rp-curve-button");
  await button.click();
  await page.waitForFunction(() => window.__host.messages.length === 1);
  const [message] = await page.evaluate(() => window.__host.messages);
  assert.equal(message.role, "user");
  assert.match(message.content[0].text, /call sweep_core_losses with the same magnetic and operating point/);
  assert.match(message.content[0].text, /around 100 kHz/);
  assert.equal(await view.locator(".rp-curve-status").innerText(), "asked for sweep_core_losses");
  await page.close();
});

test("a host without ui/message gets the sweep named, not a dead button", async () => {
  const { page, view } = await open(WINDING, "winding_losses");
  await view.locator(".rp-curve").waitFor();
  assert.equal(await view.locator("button.rp-curve-button").count(), 0);
  assert.match(await view.locator(".rp-curve").innerText(), /sweep_winding_losses/);
  await page.close();
});

test("a host that refuses the message is reported", async () => {
  const { page, view } = await open(CORE, "core_losses", { capabilities: MESSAGE_CAPS, refuseMessage: true });
  await view.locator("button.rp-curve-button").click();
  const status = view.locator(".rp-curve-status.rp-curve-error");
  await status.waitFor();
  assert.match(await status.innerText(), /did not reach the assistant/);
  await page.close();
});

test("a malformed or foreign payload is shown as its specific error", async () => {
  const noUnit = structuredClone(CORE);
  delete noUnit.quantities.coreLosses.unit;
  const noModel = structuredClone(CORE);
  delete noModel.model;
  const badMatrix = structuredClone(LEAKAGE);
  badMatrix.quantities.leakageInductance.matrix = [[1, 2]];
  for (const [result, pattern] of [
    [toolResult({ mode: "design", designs: [] }), /mode "design"/],
    [toolResult(noUnit), /coreLosses: a number must state its unit/],
    [toolResult(noModel), /does not name the model/],
    [toolResult(badMatrix), /not a square matrix/],
    [toolResult({ ...CORE, quantities: undefined, statistics: {} }), /statistics result/],
    [{ content: [{ type: "text", text: "Energy cannot be nan" }], isError: true }, /The tool failed: Energy cannot be nan/],
  ]) {
    const { page, view } = await harness.open("result.html", { result, toolName: "core_losses" });
    const alert = view.locator(".w-error");
    await alert.waitFor();
    assert.match(await alert.innerText(), pattern);
    await page.close();
  }
});
