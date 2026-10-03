/**
 * The wound-coil view behind ui://openmagnetics/coil.html (ABT #653).
 *
 * wind_coil, wind_by_turns, wind_by_sections, wind_by_layers and wind_planar return the wound
 * coil as a `document` result under the Moebius pipeline contract, with MKF's own Painter
 * cross-section beside it as `companions.crossSection` (an SVG the server got from
 * PyOpenMagnetics plot_magnetic / plot_layers / plot_sections). This view draws THAT picture —
 * it never draws geometry of its own — and tabulates the windings, sections and layers read
 * from the coil document: names, what each holds, counts of the layers and turns the engine
 * placed in it, and the engine's own filling factor and dimensions.
 *
 * When there is no picture the result says why in `diagnostics` (no core given, the Painter
 * refused), and that reason is shown where the picture would be. No placeholder drawing.
 */
import { absent, assertTheme, h } from "./widgetDom.js";

export class CoilDataError extends Error {
  constructor(message) {
    super(message);
    this.name = "CoilDataError";
  }
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

function requireList(coil, key, { required = false } = {}) {
  const list = coil[key];
  if (list === undefined || list === null) {
    if (required) throw new CoilDataError(`the coil carries no ${key}: nothing has been wound`);
    return null;
  }
  if (!Array.isArray(list)) throw new CoilDataError(`the coil's ${key} is not a list`);
  if (required && !list.length) throw new CoilDataError(`the coil's ${key} is empty: nothing has been wound`);
  list.forEach((item, i) => {
    if (!isObject(item) || typeof item.name !== "string" || !item.name) {
      throw new CoilDataError(`${key}[${i}] has no name`);
    }
  });
  return list;
}

const windingsOf = (item) => (Array.isArray(item.partialWindings)
  ? item.partialWindings.map((pw) => pw?.winding).filter(Boolean) : []);

const mm = (dims, i) => (Array.isArray(dims) && isNumber(dims[i]) ? dims[i] * 1e3 : null);

function wireName(wire) {
  if (typeof wire === "string") return wire;
  if (isObject(wire) && typeof wire.name === "string") return wire.name;
  return null;
}

/** The rows the tables show, read from the coil. Counting and unit scaling only. */
export function coilTables(coil) {
  if (!isObject(coil)) throw new CoilDataError("the result's document is not a coil object");
  const windings = coil.functionalDescription;
  if (!Array.isArray(windings) || !windings.length) {
    throw new CoilDataError("the coil has no functionalDescription: it names no windings");
  }
  const sections = requireList(coil, "sectionsDescription", { required: true });
  const layers = requireList(coil, "layersDescription");
  const turns = requireList(coil, "turnsDescription");
  const countIn = (list, key, name) => (list ? list.filter((x) => x[key] === name).length : null);

  return {
    windings: windings.map((w, i) => {
      if (!isObject(w) || typeof w.name !== "string") throw new CoilDataError(`functionalDescription[${i}] has no name`);
      return {
        name: w.name,
        numberTurns: isNumber(w.numberTurns) ? w.numberTurns : null,
        numberParallels: isNumber(w.numberParallels) ? w.numberParallels : null,
        isolationSide: typeof w.isolationSide === "string" ? w.isolationSide : null,
        wire: wireName(w.wire),
        turnsPlaced: turns ? turns.filter((t) => t.winding === w.name).length : null,
      };
    }),
    sections: sections.map((s) => ({
      name: s.name,
      type: typeof s.type === "string" ? s.type : null,
      windings: windingsOf(s).join(", ") || null,
      layers: countIn(layers, "section", s.name),
      turns: countIn(turns, "section", s.name),
      fillingFactor: isNumber(s.fillingFactor) ? s.fillingFactor : null,
      width_mm: mm(s.dimensions, 0),
      height_mm: mm(s.dimensions, 1),
    })),
    layers: layers && layers.map((l) => ({
      name: l.name,
      section: typeof l.section === "string" ? l.section : null,
      type: typeof l.type === "string" ? l.type : null,
      windings: windingsOf(l).join(", ") || null,
      turns: countIn(turns, "layer", l.name),
      fillingFactor: isNumber(l.fillingFactor) ? l.fillingFactor : null,
    })),
    counts: { sections: sections.length, layers: layers ? layers.length : null, turns: turns ? turns.length : null },
  };
}

/** A tool result's structuredContent, checked, as the view's model. Throws CoilDataError. */
export function readCoilResult(payload) {
  if (!isObject(payload)) throw new CoilDataError("the tool result carries no structured content object");
  if (payload.mode !== "document") {
    throw new CoilDataError(`this view draws a wound coil (a "document" result); the tool sent mode "${payload.mode}"`);
  }
  if (payload.schema?.name !== "MAS") {
    throw new CoilDataError(`this view draws a MAS coil; the document's schema is "${payload.schema?.name}"`);
  }
  const tables = coilTables(payload.document);
  const diagnostics = payload.diagnostics ?? [];
  if (!Array.isArray(diagnostics) || !diagnostics.every((d) => typeof d === "string")) {
    throw new CoilDataError("diagnostics is not a list of strings");
  }
  const companion = payload.companions?.crossSection;
  let drawing = null;
  if (companion !== undefined) {
    if (!isObject(companion) || companion.schema?.name !== "SVG" || !isObject(companion.document)) {
      throw new CoilDataError("companions.crossSection is not an SVG companion document");
    }
    const { svg, painter, level, shows } = companion.document;
    if (typeof svg !== "string" || !svg.includes("<svg")) {
      throw new CoilDataError("companions.crossSection carries no SVG");
    }
    if (typeof painter !== "string" || !painter) {
      throw new CoilDataError("companions.crossSection does not name the painter that drew it");
    }
    drawing = { svg, painter, level: level ?? null, shows: shows ?? null, subject: companion.subject ?? null };
  }
  if (!drawing && !diagnostics.length) {
    throw new CoilDataError("the result carries no cross-section and no diagnostic saying why");
  }
  return {
    subject: typeof payload.subject === "string" ? payload.subject : null,
    changed: Array.isArray(payload.changed) ? payload.changed : [],
    diagnostics,
    drawing,
    ...tables,
  };
}

// Elements and attributes an SVG from a painter has no business carrying into this page.
const FORBIDDEN = ["script", "foreignObject", "iframe", "object", "embed", "image", "use", "a"];

/**
 * Parse the Painter's SVG and strip anything executable or fetching. The Painter is our own
 * engine, but the text arrives through a tool result, and a view that injects markup it was
 * handed should not also run it.
 */
export function sanitizeSvg(text, doc = document) {
  const parsed = new DOMParser().parseFromString(text, "image/svg+xml");
  const error = parsed.querySelector("parsererror");
  if (error) throw new CoilDataError(`the Painter's SVG does not parse: ${error.textContent.trim().slice(0, 200)}`);
  const svg = parsed.documentElement;
  if (svg.localName !== "svg") throw new CoilDataError(`the Painter's output is a <${svg.localName}>, not an <svg>`);
  for (const tag of FORBIDDEN) for (const node of [...svg.getElementsByTagName(tag)]) node.remove();
  for (const node of [svg, ...svg.querySelectorAll("*")]) {
    for (const attr of [...node.attributes]) {
      const value = attr.value.trim().toLowerCase();
      if (attr.name.toLowerCase().startsWith("on") || /href$/i.test(attr.name)
          || value.startsWith("javascript:") || value.includes("url(http")) {
        node.removeAttribute(attr.name);
      }
    }
  }
  // Sized by the view, not by the Painter's pixel attributes; the viewBox keeps the geometry.
  if (!svg.getAttribute("viewBox")) {
    throw new CoilDataError("the Painter's SVG has no viewBox, so it cannot be scaled to the view");
  }
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  return doc.importNode(svg, true);
}

// --- rendering -------------------------------------------------------------------------------

const num = (v, digits = 3) => (v === null ? absent() : String(Number(v.toPrecision(digits))));
const text = (v) => (v === null || v === "" ? absent() : v);

function table(columns, rows) {
  return h("div", { class: "w-table-wrap" }, h("table", { class: "w-table" },
    h("thead", {}, h("tr", {}, columns.map(([label, , numeric]) => h("th", { class: numeric ? "w-num" : null }, label)))),
    h("tbody", {}, rows.map((row) => h("tr", {}, columns.map(([, cell, numeric]) => h("td", { class: numeric ? "w-num" : null }, cell(row))))))));
}

const notWound = (level) => absent(`not wound to ${level} yet`);

function drawingBlock(model) {
  if (!model.drawing) {
    return h("div", { class: "w-error cg-no-drawing", role: "alert" }, model.diagnostics.join("\n"));
  }
  const host = h("div", { class: "cg-drawing", "data-level": model.drawing.level ?? "" });
  // A shadow root, because the Painter's SVG ships a <style> of global class names (.copper,
  // .bobbin, generated ids): scoped here they cannot restyle the tables beside it.
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = ":host{display:block} svg{display:block;width:100%;height:auto;max-height:440px}";
  shadow.append(style, sanitizeSvg(model.drawing.svg));
  return host;
}

export function renderCoil(model) {
  const { counts } = model;
  const countText = [
    `${counts.sections} section${counts.sections === 1 ? "" : "s"}`,
    counts.layers === null ? null : `${counts.layers} layer${counts.layers === 1 ? "" : "s"}`,
    counts.turns === null ? null : `${counts.turns} turn${counts.turns === 1 ? "" : "s"}`,
  ].filter(Boolean).join(" · ");
  const drawn = model.drawing
    ? `${model.drawing.painter}${model.drawing.shows ? `: ${model.drawing.shows}` : ""}` : null;
  const otherDiagnostics = model.drawing ? model.diagnostics : [];
  return h("div", { class: "w-root cg-root" },
    h("div", { class: "cg-head" },
      h("h1", { class: "w-title" }, "Wound coil", model.subject ? ` on ${model.subject}` : ""),
      h("div", { class: "w-sub cg-counts" }, countText),
      drawn && h("div", { class: "w-sub cg-painter" }, drawn)),
    drawingBlock(model),
    otherDiagnostics.map((d) => h("div", { class: "w-note" }, d)),
    model.changed.map((c) => h("div", { class: "w-sub cg-changed" }, `${c.ref}: ${c.change}`)),
    h("h2", { class: "w-h2" }, "Windings"),
    table([
      ["winding", (r) => r.name],
      ["turns", (r) => num(r.numberTurns), true],
      ["parallels", (r) => num(r.numberParallels), true],
      ["turns placed", (r) => (r.turnsPlaced === null ? notWound("turns") : String(r.turnsPlaced)), true],
      ["wire", (r) => text(r.wire)],
      ["isolation side", (r) => text(r.isolationSide)],
    ], model.windings),
    h("h2", { class: "w-h2" }, "Sections"),
    h("div", { class: "cg-sections" }, table([
      ["section", (r) => r.name],
      ["type", (r) => text(r.type)],
      ["windings", (r) => text(r.windings)],
      ["layers", (r) => (r.layers === null ? notWound("layers") : String(r.layers)), true],
      ["turns", (r) => (r.turns === null ? notWound("turns") : String(r.turns)), true],
      ["filling factor", (r) => num(r.fillingFactor), true],
      ["width (mm)", (r) => num(r.width_mm), true],
      ["height (mm)", (r) => num(r.height_mm), true],
    ], model.sections)),
    model.layers && h("h2", { class: "w-h2" }, "Layers"),
    model.layers && h("div", { class: "cg-layers" }, table([
      ["layer", (r) => r.name],
      ["section", (r) => text(r.section)],
      ["type", (r) => text(r.type)],
      ["windings", (r) => text(r.windings)],
      ["turns", (r) => (r.turns === null ? notWound("turns") : String(r.turns)), true],
      ["filling factor", (r) => num(r.fillingFactor), true],
    ], model.layers)));
}

/** Mount the view in `root`. Returns setPayload / setError for the host wiring. */
export function createCoilView(root) {
  assertTheme(root);
  const show = (node) => root.replaceChildren(node);
  show(h("div", { class: "w-root" }, h("div", { class: "w-waiting" }, "Waiting for the wound coil…")));
  const setError = (message) => show(h("div", { class: "w-root" },
    h("h1", { class: "w-title" }, "Wound coil"),
    h("div", { class: "w-error", role: "alert" }, message)));
  return {
    setError,
    setPayload(payload) {
      try {
        show(renderCoil(readCoilResult(payload)));
      } catch (error) {
        setError(error instanceof CoilDataError ? error.message : `The view failed: ${error.message}`);
        if (!(error instanceof CoilDataError)) throw error;
      }
    },
  };
}
