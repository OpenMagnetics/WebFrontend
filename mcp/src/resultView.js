/**
 * The result panel behind ui://openmagnetics/result.html (ABT #654).
 *
 * core_losses, winding_losses, leakage_inductance, peak_winding_current and core_temperature
 * answer as a `quantity` result under the Moebius pipeline contract: named values each with
 * its unit, an optional per-part `breakdown` in that unit, a `matrix` where the quantity is
 * one, the `model` that computed them and the `conditions` (operating point) they hold at.
 * This panel shows exactly those fields. It computes nothing: a breakdown the engine did not
 * report is not shown, not reconstructed.
 *
 * Where a curve means something — losses against frequency around this operating point — the
 * curve is the sweep tool's, drawn by the existing sweeps widget (ui://openmagnetics/curves.html).
 * The panel asks the assistant to run that sweep rather than drawing a second chart of its own.
 */
import { absent, assertTheme, formatQuantity, h, unitSymbol } from "./widgetDom.js";

export class ResultDataError extends Error {
  constructor(message) {
    super(message);
    this.name = "ResultDataError";
  }
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNumber = (v) => typeof v === "number" && Number.isFinite(v);

export const TOOL_TITLES = {
  core_losses: "Core losses",
  winding_losses: "Winding losses",
  leakage_inductance: "Leakage inductance",
  peak_winding_current: "Peak magnetizing current",
  core_temperature: "Core temperature",
};

/** The tools whose number has a meaningful curve, and the sweep that draws it. */
export const CURVE_FOR = {
  core_losses: { tool: "sweep_core_losses", what: "core losses against frequency" },
  winding_losses: { tool: "sweep_winding_losses", what: "winding losses against frequency" },
};

function readQuantity(key, q) {
  if (!isObject(q)) throw new ResultDataError(`quantity ${key} is not an object`);
  const label = typeof q.label === "string" && q.label ? q.label : key;
  if ("matrix" in q) {
    if (!Array.isArray(q.matrix) || !q.matrix.length
        || !q.matrix.every((row) => Array.isArray(row) && row.length === q.matrix.length && row.every(isNumber))) {
      throw new ResultDataError(`quantity ${key}: matrix is not a square matrix of numbers`);
    }
    if (typeof q.unit !== "string" || !q.unit) throw new ResultDataError(`quantity ${key}: a matrix must state its unit`);
    return { key, label, matrix: q.matrix, unit: q.unit, value: undefined, breakdown: null };
  }
  if (!("value" in q)) throw new ResultDataError(`quantity ${key} has neither a value nor a matrix`);
  const { value } = q;
  if (!(value === null || isNumber(value) || typeof value === "string" || typeof value === "boolean")) {
    throw new ResultDataError(`quantity ${key}: value ${JSON.stringify(value)} is not a number, text or null`);
  }
  if (isNumber(value) && (typeof q.unit !== "string" || !q.unit)) {
    throw new ResultDataError(`quantity ${key}: a number must state its unit`);
  }
  let breakdown = null;
  if (q.breakdown !== undefined) {
    if (!isObject(q.breakdown) || !Object.values(q.breakdown).every(isNumber)) {
      throw new ResultDataError(`quantity ${key}: breakdown is not a map of numbers`);
    }
    breakdown = Object.entries(q.breakdown);
  }
  if (value === null && !breakdown) {
    throw new ResultDataError(`quantity ${key} has no value and no breakdown: there is nothing to show`);
  }
  return { key, label, value, unit: q.unit ?? null, breakdown, matrix: null };
}

function readCondition(key, c) {
  if (!isObject(c) || !("value" in c)) throw new ResultDataError(`condition ${key} has no value`);
  const { value } = c;
  if (!(value === null || isNumber(value) || typeof value === "string" || typeof value === "boolean")) {
    throw new ResultDataError(`condition ${key}: value ${JSON.stringify(value)} is not a scalar`);
  }
  return { key, label: typeof c.label === "string" && c.label ? c.label : key, value, unit: c.unit ?? null };
}

/** A tool result's structuredContent, checked, as the panel's model. Throws ResultDataError. */
export function readQuantityResult(payload) {
  if (!isObject(payload)) throw new ResultDataError("the tool result carries no structured content object");
  if (payload.mode !== "quantity") {
    throw new ResultDataError(`this panel shows a computed quantity; the tool sent mode "${payload.mode}"`);
  }
  if (typeof payload.subject !== "string" || !payload.subject) throw new ResultDataError("the result does not say what it is about (no subject)");
  if (typeof payload.model !== "string" || !payload.model) throw new ResultDataError("the result does not name the model that computed it");
  if (payload.quantities === undefined && payload.statistics !== undefined) {
    throw new ResultDataError("this panel shows quantities at a point; a statistics result over a run is not drawn here");
  }
  if (!isObject(payload.quantities) || !Object.keys(payload.quantities).length) {
    throw new ResultDataError("the result carries no quantities");
  }
  if (payload.conditions !== undefined && !isObject(payload.conditions)) throw new ResultDataError("conditions is not an object");
  return {
    subject: payload.subject,
    model: payload.model,
    quantities: Object.entries(payload.quantities).map(([k, q]) => readQuantity(k, q)),
    conditions: Object.entries(payload.conditions ?? {}).map(([k, c]) => readCondition(k, c)),
    caveat: typeof payload.caveat === "string" ? payload.caveat : null,
  };
}

/** A value as text: a number with its unit, text as itself. */
export function valueText(value, unit) {
  if (isNumber(value)) return formatQuantity(value, unit);
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

/** The message that asks the assistant for the curve, or null when this tool has none. */
export function curveRequest(model, toolName) {
  const curve = CURVE_FOR[toolName];
  if (!curve) return null;
  const frequency = model.conditions.find((c) => c.key.endsWith(".frequency") && isNumber(c.value));
  const around = frequency ? ` around ${formatQuantity(frequency.value, "Hz")}` : "";
  return {
    tool: curve.tool,
    text: `Chart the ${curve.what}${around} for ${model.subject}: call ${curve.tool} with the same `
      + `magnetic and operating point as this ${toolName} call. It draws in the sweeps chart.`,
  };
}

// --- rendering -------------------------------------------------------------------------------

function breakdownTable(q) {
  return h("div", { class: "w-table-wrap" }, h("table", { class: "w-table rp-breakdown", "data-quantity": q.key },
    h("thead", {}, h("tr", {}, h("th", {}, "part"), h("th", { class: "w-num" }, unitSymbol(q.unit) || "value"))),
    h("tbody", {}, q.breakdown.map(([part, v]) => h("tr", {},
      h("td", {}, part), h("td", { class: "w-num" }, formatQuantity(v, q.unit)))))));
}

function matrixTable(q) {
  const n = q.matrix.length;
  const idx = Array.from({ length: n }, (_, i) => i + 1);
  return h("div", { class: "w-table-wrap" }, h("table", { class: "w-table rp-matrix", "data-quantity": q.key },
    h("thead", {}, h("tr", {}, h("th", {}, ""), idx.map((j) => h("th", { class: "w-num" }, String(j))))),
    h("tbody", {}, q.matrix.map((row, i) => h("tr", {}, h("th", {}, String(i + 1)),
      row.map((v) => h("td", { class: "w-num" }, formatQuantity(v, q.unit))))))));
}

function quantityBlock(q, headline) {
  const value = q.matrix ? null
    : q.value === null ? absent("no single value: the parts below do not add to one")
      : valueText(q.value, q.unit);
  return h("div", { class: `rp-quantity${headline ? " rp-headline" : ""}`, "data-quantity": q.key },
    h("div", { class: "rp-label" }, q.label),
    value !== null && h("div", { class: "rp-value" }, value),
    q.breakdown && breakdownTable(q),
    q.matrix && matrixTable(q));
}

export function renderResult(model, { toolName, canMessage, onCurve } = {}) {
  const [headline, ...rest] = model.quantities;
  const curve = curveRequest(model, toolName);
  let curveNode = null;
  if (curve) {
    curveNode = canMessage
      ? h("div", { class: "rp-curve" },
        h("button", { class: "w-button rp-curve-button", type: "button", onclick: (e) => onCurve(curve, e.currentTarget) },
          `Chart ${CURVE_FOR[toolName].what}`),
        h("span", { class: "w-sub rp-curve-status" }))
      : h("div", { class: "w-sub rp-curve" },
        `A curve of the ${CURVE_FOR[toolName].what} comes from ${curve.tool}; ask for it and it draws in the sweeps chart.`);
  }
  return h("div", { class: "w-root rp-root" },
    h("div", { class: "rp-head" },
      h("h1", { class: "w-title" }, TOOL_TITLES[toolName] ?? headline.label),
      h("div", { class: "w-sub rp-subject" }, model.subject),
      h("div", { class: "w-sub rp-model" }, "model: ", h("span", { class: "rp-model-name" }, model.model))),
    quantityBlock(headline, true),
    rest.length > 0 && h("div", { class: "rp-more" }, rest.map((q) => quantityBlock(q, false))),
    model.conditions.length > 0 && h("h2", { class: "w-h2" }, "Computed at"),
    model.conditions.length > 0 && h("div", { class: "w-table-wrap" }, h("table", { class: "w-table rp-conditions" },
      h("tbody", {}, model.conditions.map((c) => h("tr", { "data-condition": c.key },
        h("td", {}, c.label),
        h("td", { class: "w-num" }, c.value === null ? absent() : valueText(c.value, c.unit))))))),
    model.caveat && h("div", { class: "w-note" }, model.caveat),
    curveNode);
}

/** Mount the panel in `root`. `host` supplies the tool name and the message capability. */
export function createResultView(root, host) {
  assertTheme(root);
  let payload = null;
  const show = (node) => root.replaceChildren(node);
  show(h("div", { class: "w-root" }, h("div", { class: "w-waiting" }, "Waiting for the result…")));
  const setError = (message) => show(h("div", { class: "w-root" },
    h("h1", { class: "w-title" }, TOOL_TITLES[host.toolName()] ?? "Result"),
    h("div", { class: "w-error", role: "alert" }, message)));
  const render = () => {
    if (!payload) return;
    try {
      show(renderResult(readQuantityResult(payload), {
        toolName: host.toolName(), canMessage: host.canMessage(), onCurve: host.onCurve,
      }));
    } catch (error) {
      setError(error instanceof ResultDataError ? error.message : `The panel failed: ${error.message}`);
      if (!(error instanceof ResultDataError)) throw error;
    }
  };
  return {
    setError,
    setPayload(p) { payload = p; render(); },
    /** Re-render when the host context (tool name, capabilities) arrives after the result. */
    refresh: render,
  };
}
