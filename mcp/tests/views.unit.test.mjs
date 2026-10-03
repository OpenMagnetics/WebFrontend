// The two views' pure logic (src/coilView.js, src/resultView.js, src/widgetDom.js) under
// node:test, on payloads captured from the real engine (tests/fixtures/coil_*, result_*).
//
//   node --test tests/views.unit.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./widgetHarness.mjs";
import { CoilDataError, coilTables, readCoilResult } from "../src/coilView.js";
import { ResultDataError, curveRequest, readQuantityResult } from "../src/resultView.js";
import { formatQuantity } from "../src/widgetDom.js";

const TRANSFORMER = fixture("coil_transformer").structuredContent;
const SECTIONS = fixture("coil_wind_by_sections").structuredContent;
const CORE = fixture("result_core_losses").structuredContent;

test("formatting writes a number, it does not change it", () => {
  assert.equal(formatQuantity(0.05659264345800508, "W"), "56.59 mW");
  assert.equal(formatQuantity(9.75557854622089e-7, "H"), "975.6 nH");
  assert.equal(formatQuantity(100000, "Hz"), "100 kHz");
  assert.equal(formatQuantity(80.38627, "degC"), "80.39 °C");
  assert.equal(formatQuantity(0.5, "1"), "0.5");
  assert.equal(formatQuantity(0, "H"), "0 H");
  assert.throws(() => formatQuantity(NaN, "W"), /not a finite number/);
  assert.throws(() => formatQuantity(null, "W"), /not a finite number/);
});

test("coil tables count each section's layers and turns from the wound coil", () => {
  const t = coilTables(TRANSFORMER.document);
  const doc = TRANSFORMER.document;
  assert.equal(t.sections.length, doc.sectionsDescription.length);
  assert.equal(t.sections.reduce((n, s) => n + s.turns, 0), doc.turnsDescription.length);
  assert.equal(t.layers.reduce((n, l) => n + l.turns, 0), doc.turnsDescription.length);
  assert.deepEqual(t.windings.map((w) => [w.name, w.numberTurns, w.turnsPlaced]),
    doc.functionalDescription.map((w) => [w.name, w.numberTurns, w.numberTurns]));
  assert.equal(t.sections[0].fillingFactor, doc.sectionsDescription[0].fillingFactor);
});

test("a coil wound only to sections has no layer or turn counts, not zero ones", () => {
  const t = coilTables(SECTIONS.document);
  assert.equal(t.layers, null);
  assert.ok(t.sections.every((s) => s.layers === null && s.turns === null));
  assert.deepEqual(t.counts, { sections: SECTIONS.document.sectionsDescription.length, layers: null, turns: null });
});

test("the coil reader refuses what it cannot draw honestly", () => {
  assert.throws(() => readCoilResult({ ...TRANSFORMER, mode: "curves" }), CoilDataError);
  assert.throws(() => readCoilResult({ ...TRANSFORMER, schema: { name: "TAS" } }), /schema is "TAS"/);
  const unnamed = structuredClone(TRANSFORMER);
  delete unnamed.document.layersDescription[1].name;
  assert.throws(() => readCoilResult(unnamed), /layersDescription\[1\] has no name/);
  const anonymous = structuredClone(TRANSFORMER);
  delete anonymous.companions.crossSection.document.painter;
  assert.throws(() => readCoilResult(anonymous), /does not name the painter/);
});

test("the quantity reader keeps the engine's order and refuses a value with no unit", () => {
  const m = readQuantityResult(CORE);
  assert.deepEqual(m.quantities.map((q) => q.key), Object.keys(CORE.quantities));
  const bad = structuredClone(CORE);
  bad.quantities.coreLosses.breakdown = { a: "1" };
  assert.throws(() => readQuantityResult(bad), ResultDataError);
  const empty = structuredClone(CORE);
  empty.quantities.coreLosses = { value: null, unit: "W" };
  assert.throws(() => readQuantityResult(empty), /no value and no breakdown/);
});

test("only losses get a curve, and it names the sweep and the frequency", () => {
  const m = readQuantityResult(CORE);
  assert.equal(curveRequest(m, "core_losses").tool, "sweep_core_losses");
  assert.match(curveRequest(m, "core_losses").text, /around 100 kHz/);
  assert.equal(curveRequest(m, "leakage_inductance"), null);
  assert.equal(curveRequest(m, undefined), null);
});
