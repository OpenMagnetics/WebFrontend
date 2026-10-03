// The shared picker's pure logic (WebSharedComponents/mcpApps/candidatePicker.js), run under
// node:test on REAL adviser payloads captured from this server (tests/fixtures/*.json), plus
// the ranked-parts shape the other servers send.
//
//   node --test tests/candidatePicker.unit.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PickerDataError, normalisePayload, columnsFor, valueOf, sortRows, filterRows, parseQuery,
  whyRanked, buildSelection, formatValue,
} from "../../WebSharedComponents/mcpApps/candidatePicker.js";

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url))).structuredContent;
const FAST = fixture("advise_magnetics_fast");
const FULL = fixture("advise_magnetics_full");

test("a real fast-adviser payload becomes one row per design, in rank order", () => {
  const model = normalisePayload(FAST);
  assert.equal(model.mode, "design");
  assert.equal(model.rows.length, FAST.designs.length);
  assert.deepEqual(model.rows.map((r) => r.rank), FAST.designs.map((d) => d.rank));
  assert.ok(model.rows.every((r) => r.ref.startsWith("mas://")));
});

test("digest keys become columns verbatim, objects never do", () => {
  const { columns } = columnsFor(normalisePayload(FULL), 20);
  const labels = columns.map((c) => c.label);
  for (const k of ["shape", "material", "gap_mm", "effective_area_mm2", "turns", "wire",
                   "core_losses_w", "winding_losses_w"]) {
    assert.ok(labels.includes(k), `column ${k} missing from ${labels}`);
  }
  assert.ok(labels.includes("score"));
});

test("the column cap holds fields back and says which", () => {
  const { columns, hidden } = columnsFor(normalisePayload(FULL), 3);
  assert.equal(columns.filter((c) => c.kind === "spec").length, 3);
  assert.ok(hidden.length > 0);
  assert.ok(hidden.includes("winding_losses_w"));
});

test("sorting is numeric and absent values sink in both directions", () => {
  const payload = structuredClone(FAST);
  delete payload.designs[1].properties.gap_mm;                 // one design states no gap
  const model = normalisePayload(payload);
  const col = columnsFor(model, 20).columns.find((c) => c.key === "gap_mm");
  const asc = sortRows(model.rows, col, "asc").map((r) => valueOf(r, col));
  const desc = sortRows(model.rows, col, "desc").map((r) => valueOf(r, col));
  assert.equal(asc.at(-1), undefined);
  assert.equal(desc.at(-1), undefined);
  const stated = asc.slice(0, -1);
  assert.deepEqual(stated, [...stated].sort((a, b) => a - b));
  assert.deepEqual(desc.slice(0, -1), [...stated].reverse());
});

test("filters: substring, numeric bound, list values, and a malformed bound throws", () => {
  const model = normalisePayload(FAST);
  const { columns } = columnsFor(model, 20);
  const n = (key, q) => filterRows(model.rows, columns, key, q).length;
  const ferroxcube = FAST.designs.filter((d) => d.properties.manufacturer === "Ferroxcube").length;
  assert.equal(n("manufacturer", "ferrox"), ferroxcube);
  const lowGap = FAST.designs.filter((d) => d.properties.gap_mm <= 0.3).length;
  assert.equal(n("gap_mm", "<=0.3"), lowGap);
  const many = FAST.designs.filter((d) => d.properties.turns.some((t) => t > 8)).length;
  assert.equal(n("turns", ">8"), many);
  assert.equal(n("*", ""), model.rows.length);
  assert.throws(() => parseQuery(">abc"), PickerDataError);
});

test("why-ranked states the score, its distance to #1, and the payload's tiebreaker", () => {
  const model = normalisePayload(FULL);
  const line = whyRanked(model, model.rows[1]);
  assert.match(line, /^#2 of 3/);
  assert.match(line, /vs #1/);
  assert.ok(line.includes(FULL.tiebreaker));
});

test("selection carries the handle and restates the decision and the caveat", () => {
  const model = normalisePayload(FAST);
  const sel = buildSelection(model, model.rows[2], { note: "[next] go", source: "advise_magnetics" });
  assert.equal(sel.structuredContent.selected.ref, FAST.designs[2].ref);
  assert.equal(sel.structuredContent.selected.rank, 3);
  assert.equal(sel.structuredContent.context.source, "advise_magnetics");
  assert.ok(sel.text.includes(FAST.designs[2].ref));
  assert.ok(sel.text.includes(FAST.caveat));
  assert.ok(sel.text.endsWith("[next] go"));
  assert.equal(sel.structuredContent.selected.document, undefined);
});

test("a design with neither handle nor document cannot be chosen", () => {
  const payload = structuredClone(FAST);
  delete payload.designs[0].ref;
  const model = normalisePayload(payload);
  assert.throws(() => buildSelection(model, model.rows[0]), PickerDataError);
});

test("malformed payloads throw, naming the field — no defaults", () => {
  const bad = (mutate) => { const p = structuredClone(FAST); mutate(p); return p; };
  assert.throws(() => normalisePayload(null), PickerDataError);
  assert.throws(() => normalisePayload({ mode: "curves" }), /mode "curves"/);
  assert.throws(() => normalisePayload(bad((p) => { delete p.kind; })), /kind is required/);
  assert.throws(() => normalisePayload(bad((p) => { p.designs[0].rank = 0; })), /designs\[0\]: rank/);
  assert.throws(() => normalisePayload(bad((p) => { p.designs[1].score = "high"; })), /designs\[1\]\.score/);
  assert.throws(() => normalisePayload(bad((p) => { p.designs[1].ref = p.designs[0].ref; })), /duplicate/);
  // The contract's own names only: an alias is refused, not guessed at.
  assert.throws(() => normalisePayload({ mode: "search", family: "mosfet", ranked: [] }), /candidates must be a list/);
});

test("ranked parts: identity, underscore fields hidden, unverified kept distinct", () => {
  const model = normalisePayload({
    mode: "crossref", family: "mosfet", tiebreaker: "penalty",
    original: { mpn: "STP60NF06" }, originalSpecs: { vds: 60, rds_on: 0.016 },
    candidates: [
      { mpn: "IRFZ44N", manufacturer: "Infineon", status: "recommended", penalty: 0.1,
        specs: { vds: 55, rds_on: 0.0175, _key: "x" }, params: [{ name: "vds", verdict: "unverified" }] },
      { mpn: "IRFZ44N", manufacturer: "Vishay", status: "partial", penalty: 0.4, specs: { vds: 60 } },
    ],
  });
  assert.equal(model.rows.length, 2);                          // same MPN, two vendors
  const labels = columnsFor(model).columns.map((c) => c.label);
  assert.ok(!labels.includes("_key"));
  assert.ok(labels.includes("verdict") && labels.includes("penalty"));
  assert.equal(model.rows[0].params[0].verdict, "unverified");
  assert.equal(formatValue(undefined), "—");
  const sel = buildSelection(model, model.rows[1]);
  assert.equal(sel.structuredContent.selected.manufacturer, "Vishay");
  assert.equal(sel.structuredContent.context.original, "STP60NF06");
});
