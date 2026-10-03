// The BUILT wound-coil view (dist/coil.html, ABT #653) driven through a real MCP Apps host
// bridge, fed tool results captured from this server's wind_* tools on the real engine
// (tests/fixtures/coil_*.json). Headless Chromium only.
//
//   npm run build && node --test tests/coil.widget.test.mjs
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { fixture, startHarness, toolResult } from "./widgetHarness.mjs";

const WOUND = fixture("coil_wind_coil").structuredContent;
const SECTIONS = fixture("coil_wind_by_sections").structuredContent;
const NO_CORE = fixture("coil_no_core").structuredContent;
const TRANSFORMER = fixture("coil_transformer").structuredContent;

let harness;
before(async () => { harness = await startHarness(["coil.html"]); });
after(async () => { await harness?.stop(); });

const open = (structuredContent, extra = {}) =>
  harness.open("coil.html", { result: toolResult(structuredContent), toolName: "wind_coil", ...extra });

/** Circles and polygons in the drawing, counted inside its shadow root. */
const shapes = (view) => view.locator(".cg-drawing").evaluate((host) => ({
  circles: host.shadowRoot.querySelectorAll("svg circle").length,
  polygons: host.shadowRoot.querySelectorAll("svg polygon").length,
  scripts: host.shadowRoot.querySelectorAll("script").length,
}));

test("draws the Painter's own SVG, one circle per turn, with the painter named", async () => {
  const { page, view, pageErrors } = await open(WOUND);
  await view.locator(".cg-drawing").waitFor();
  const turns = WOUND.document.turnsDescription.length;
  const svgCircles = (WOUND.companions.crossSection.document.svg.match(/<circle/g) ?? []).length;
  const drawn = await shapes(view);
  assert.equal(drawn.circles, svgCircles, "every circle of the Painter's SVG is in the view");
  assert.ok(drawn.circles >= turns, `${drawn.circles} circles for ${turns} turns`);
  assert.ok(drawn.polygons > 0);
  assert.match(await view.locator(".cg-painter").innerText(), /MKF Painter \(plot_magnetic\)/);
  assert.equal(await view.locator(".cg-drawing").getAttribute("data-level"), "turns");
  assert.match(await view.locator(".w-title").innerText(), new RegExp(WOUND.subject.replace(/[/.]/g, "\\$&")));
  // The drawing is sized by the view: wide, and not the Painter's fixed pixel width.
  const box = await view.locator(".cg-drawing").boundingBox();
  assert.ok(box.width > 500 && box.height > 100, JSON.stringify(box));
  assert.deepEqual(pageErrors, []);
  await page.close();
});

test("the section and layer tables count what the engine placed", async () => {
  const { page, view } = await open(TRANSFORMER);
  await view.locator(".cg-sections tbody tr").first().waitFor();
  const doc = TRANSFORMER.document;
  assert.equal(await view.locator(".cg-sections tbody tr").count(), doc.sectionsDescription.length);
  assert.equal(await view.locator(".cg-layers tbody tr").count(), doc.layersDescription.length);
  const rows = await view.locator(".cg-sections tbody tr").evaluateAll((trs) => trs.map((tr) =>
    [...tr.children].map((td) => td.textContent.trim())));
  doc.sectionsDescription.forEach((s, i) => {
    assert.equal(rows[i][0], s.name);
    assert.equal(rows[i][3], String(doc.layersDescription.filter((l) => l.section === s.name).length));
    assert.equal(rows[i][4], String(doc.turnsDescription.filter((t) => t.section === s.name).length));
  });
  const windings = await view.locator("table").first().locator("tbody tr").evaluateAll((trs) =>
    trs.map((tr) => [tr.children[0].textContent, tr.children[3].textContent]));
  assert.deepEqual(windings, doc.functionalDescription.map((w) =>
    [w.name, String(doc.turnsDescription.filter((t) => t.winding === w.name).length)]));
  await page.close();
});

test("a coil wound only to sections draws the sections and marks layers and turns as not wound", async () => {
  const { page, view } = await open(SECTIONS);
  await view.locator(".cg-drawing").waitFor();
  assert.equal(await view.locator(".cg-drawing").getAttribute("data-level"), "sections");
  assert.match(await view.locator(".cg-painter").innerText(), /plot_sections/);
  assert.equal(await view.locator(".cg-layers").count(), 0);
  const notWound = view.locator('.cg-sections td span[title="not wound to turns yet"]');
  assert.equal(await notWound.count(), SECTIONS.document.sectionsDescription.length);
  await page.close();
});

test("no core: the engine's reason stands where the drawing would, and the tables still render", async () => {
  const { page, view } = await open(NO_CORE);
  const alert = view.locator(".cg-no-drawing");
  await alert.waitFor();
  assert.match(await alert.innerText(), /no core was given/);
  assert.equal(await view.locator(".cg-drawing").count(), 0);
  assert.equal(await view.locator(".cg-sections tbody tr").count(), NO_CORE.document.sectionsDescription.length);
  await page.close();
});

test("markup that could run is stripped from the SVG before it is shown", async () => {
  const doc = structuredClone(WOUND);
  doc.companions.crossSection.document.svg = doc.companions.crossSection.document.svg.replace(
    "</svg>", '<script>window.parent.__pwned = 1</script><circle r="1" onclick="alert(1)"/></svg>');
  const { page, view } = await open(doc);
  await view.locator(".cg-drawing").waitFor();
  const drawn = await shapes(view);
  assert.equal(drawn.scripts, 0);
  const handlers = await view.locator(".cg-drawing").evaluate((host) =>
    [...host.shadowRoot.querySelectorAll("*")].filter((n) => n.hasAttribute("onclick")).length);
  assert.equal(handlers, 0);
  assert.equal(await page.evaluate(() => window.__pwned), undefined);
  await page.close();
});

test("a malformed or foreign payload is shown as its specific error", async () => {
  const noSvg = structuredClone(WOUND);
  delete noSvg.companions.crossSection.document.svg;
  const silent = structuredClone(NO_CORE);
  delete silent.diagnostics;
  const unwound = structuredClone(WOUND);
  delete unwound.document.sectionsDescription;
  const broken = structuredClone(WOUND);
  broken.companions.crossSection.document.svg = "<svg viewBox='0 0 1 1'><g></svg>";
  for (const [result, pattern] of [
    [toolResult({ mode: "quantity", subject: "x", model: "y", quantities: {} }), /mode "quantity"/],
    [toolResult(noSvg), /carries no SVG/],
    [toolResult(silent), /no cross-section and no diagnostic/],
    [toolResult(unwound), /no sectionsDescription: nothing has been wound/],
    [toolResult(broken), /does not parse/],
    [{ content: [{ type: "text", text: "Coil has not been processed" }], isError: true }, /The tool failed: Coil has not been processed/],
    [{ content: [{ type: "text", text: "x" }] }, /no structured content/],
  ]) {
    const { page, view } = await harness.open("coil.html", { result, toolName: "wind_coil" });
    const alert = view.locator(".w-error");
    await alert.waitFor();
    assert.match(await alert.innerText(), pattern);
    await page.close();
  }
});

test("follows the host theme: dark context, dark tokens", async () => {
  const light = await open(WOUND);
  const dark = await open(WOUND, { theme: "dark" });
  const bg = (v) => v.locator(".cg-root").evaluate((n) => getComputedStyle(n).backgroundColor);
  await light.view.locator(".cg-root").waitFor();
  await dark.view.locator(".cg-root").waitFor();
  assert.notEqual(await bg(light.view), await bg(dark.view));
  await light.page.close();
  await dark.page.close();
});
