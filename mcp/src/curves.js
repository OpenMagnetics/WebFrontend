/**
 * OpenMagnetics sweep-curves widget — the MCP App resource behind ui://openmagnetics/curves.html.
 *
 * Eight sweep tools advertised this chart and no bundle existed to serve it, so every host that
 * understands MCP Apps asked for the resource and got a FileNotFoundError, while the text result
 * kept working — invisible in a plain client, broken exactly where the feature is meant to shine
 * (ABT #651).
 *
 * Payload — a `curves` result under the Moebius pipeline contract:
 *   { mode: "curves", title, subtitle?, caveat?,
 *     axes: { x: {label, unit, scale?}, y: {label, unit} },
 *     series: [{ name, kind?, points: [[x, y], …] }] }
 *
 * The axes carry label and unit SEPARATELY. They used to arrive as one string ("|Z| (Ω)"),
 * which a chart can print and a consumer can do nothing else with — not convert it, not
 * compare two sweeps, not decide that a second one is in different units.
 *
 * The x axis is log by default because every sweep here is against frequency, DC bias or
 * temperature over decades — but it falls back to linear when the data cannot be logged (a
 * temperature sweep crosses zero), rather than silently dropping the points that would.
 */
import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "OpenMagnetics Sweeps", version: "0.1.0" });

const state = {
  title: "", subtitle: "", note: "", xLabel: "", yLabel: "", series: [], error: "",
  // The subject the server swept, when the payload names one, plus the controls that only
  // mean anything once the engine is here. `live` is what the user last computed locally —
  // kept apart from the server's series so the two are never confused for one another.
  subject: null, axes: null, spec: null, logX: true, live: null, status: "",
  range: null, scalar: null,
};

const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== null && v !== undefined) n.setAttribute(k, String(v));
  }
  return n;
};
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return n;
};

/** Engineering notation — 150 k, 1.2 M, 4.7 µ. Magnetics values span many decades. */
function eng(x) {
  if (!Number.isFinite(x)) return "—";
  const a = Math.abs(x);
  if (a === 0) return "0";
  const units = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""],
                 [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
  for (const [f, s] of units) if (a >= f) return `${sig(x / f)} ${s}`.trim();
  return x.toExponential(2);
}
const sig = (x) => String(Number(Number(x).toPrecision(3)));

const W = 720, H = 340, PAD_L = 62, PAD_R = 16, PAD_T = 10, PAD_B = 38;
// Categorical slots in FIXED order — never cycled. Beyond four the payload would need
// small multiples rather than a fifth generated hue; server-side sweeps emit one series.
const SLOTS = 4;

function scales(pts) {
  const xs = pts.map((p) => p[0]).filter(Number.isFinite);
  const ys = pts.map((p) => p[1]).filter(Number.isFinite);
  // Log x only when every x is strictly positive — a bias or temperature sweep through 0
  // must not lose the points that cannot be logged.
  const logX = xs.length > 0 && xs.every((v) => v > 0) && Math.max(...xs) / Math.min(...xs) >= 20;
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 1; x1 += 1; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.06;
  // Headroom must not invent values the quantity cannot take. Core loss, impedance and
  // inductance are non-negative, and padding a min of 0 down to -2.19 mW puts a negative
  // loss on the axis — a reader cannot tell an axis artefact from a real sign.
  y0 = Math.min(...ys) >= 0 ? Math.max(0, y0 - pad) : y0 - pad;
  y1 += pad;
  const fx = logX
    ? (v) => PAD_L + (Math.log10(v) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0))
              * (W - PAD_L - PAD_R)
    : (v) => PAD_L + ((v - x0) / (x1 - x0)) * (W - PAD_L - PAD_R);
  const fy = (v) => H - PAD_B - ((v - y0) / (y1 - y0)) * (H - PAD_T - PAD_B);
  return { fx, fy, x0, x1, y0, y1, logX };
}

function xTicks(s) {
  const out = [];
  if (s.logX) {
    for (let d = Math.floor(Math.log10(s.x0)); d <= Math.ceil(Math.log10(s.x1)); d++) {
      const v = 10 ** d;
      if (v >= s.x0 && v <= s.x1) out.push(v);
    }
    if (out.length < 2) out.push(s.x0, s.x1);
  } else {
    for (let i = 0; i <= 5; i++) out.push(s.x0 + (i / 5) * (s.x1 - s.x0));
  }
  return out;
}
const yTicks = (s) => Array.from({ length: 5 }, (_, i) => s.y0 + (i / 4) * (s.y1 - s.y0));

function draw() {
  const all = state.series.flatMap((s) => s.points || []);
  const usable = all.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!usable.length) {
    return el("div", { class: "muted" }, "The tool result carried no finite points to plot.");
  }
  const sc = scales(usable);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img",
                             "aria-label": `${state.title}. ${state.xLabel} against ${state.yLabel}.` });

  // Grid and axes stay recessive — they orient, they do not compete with the data.
  for (const t of yTicks(sc)) {
    const y = sc.fy(t);
    svg.append(svgEl("line", { x1: PAD_L, x2: W - PAD_R, y1: y, y2: y,
                               stroke: "var(--grid)", "stroke-width": 1 }));
    svg.append(Object.assign(svgEl("text", {
      x: PAD_L - 8, y: y + 4, "text-anchor": "end", "font-size": 11, fill: "var(--text-secondary)",
    }), { textContent: eng(t) }));
  }
  for (const t of xTicks(sc)) {
    const x = sc.fx(t);
    svg.append(svgEl("line", { x1: x, x2: x, y1: PAD_T, y2: H - PAD_B,
                               stroke: "var(--grid)", "stroke-width": 1 }));
    svg.append(Object.assign(svgEl("text", {
      x, y: H - PAD_B + 16, "text-anchor": "middle", "font-size": 11,
      fill: "var(--text-secondary)",
    }), { textContent: eng(t) }));
  }
  svg.append(svgEl("line", { x1: PAD_L, x2: W - PAD_R, y1: H - PAD_B, y2: H - PAD_B,
                             stroke: "var(--axis)", "stroke-width": 1 }));
  svg.append(svgEl("line", { x1: PAD_L, x2: PAD_L, y1: PAD_T, y2: H - PAD_B,
                             stroke: "var(--axis)", "stroke-width": 1 }));
  svg.append(Object.assign(svgEl("text", {
    x: (PAD_L + W - PAD_R) / 2, y: H - 4, "text-anchor": "middle", "font-size": 11,
    fill: "var(--text-secondary)",
  }), { textContent: state.xLabel }));
  svg.append(Object.assign(svgEl("text", {
    x: 12, y: (PAD_T + H - PAD_B) / 2, "text-anchor": "middle", "font-size": 11,
    fill: "var(--text-secondary)",
    transform: `rotate(-90 12 ${(PAD_T + H - PAD_B) / 2})`,
  }), { textContent: state.yLabel }));

  state.series.forEach((s, i) => {
    const color = `var(--series-${(i % SLOTS) + 1})`;
    const pts = (s.points || []).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (!pts.length) return;
    const d = pts.map((p, k) => `${k ? "L" : "M"}${sc.fx(p[0]).toFixed(2)},${sc.fy(p[1]).toFixed(2)}`)
                 .join(" ");
    svg.append(svgEl("path", { d, fill: "none", stroke: color, "stroke-width": 2,
                               "stroke-linejoin": "round", "stroke-linecap": "round" }));
  });

  // Crosshair + tooltip: an SVG chart in a panel IS interactive, and a sweep's value at a
  // given frequency is the question a reader actually has.
  const cross = svgEl("line", { y1: PAD_T, y2: H - PAD_B, stroke: "var(--axis)",
                                "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0 });
  svg.append(cross);
  const dots = state.series.map((_, i) =>
    svgEl("circle", { r: 4, fill: `var(--series-${(i % SLOTS) + 1})`,
                      stroke: "var(--surface-1)", "stroke-width": 2, opacity: 0 }));
  dots.forEach((d) => svg.append(d));

  const wrap = el("div", { class: "chart" });
  const tip = el("div", { class: "tip" });
  wrap.append(svg, tip);

  const nearest = (arr, x) => {
    let best = null, bd = Infinity;
    for (const p of arr) {
      const d = Math.abs(sc.fx(p[0]) - x);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };
  svg.addEventListener("pointermove", (ev) => {
    const box = svg.getBoundingClientRect();
    const x = ((ev.clientX - box.left) / box.width) * W;
    if (x < PAD_L || x > W - PAD_R) return;
    cross.setAttribute("x1", x); cross.setAttribute("x2", x); cross.setAttribute("opacity", 1);
    const rows = [];
    state.series.forEach((s, i) => {
      const pts = (s.points || []).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      const p = nearest(pts, x);
      if (!p) { dots[i].setAttribute("opacity", 0); return; }
      dots[i].setAttribute("cx", sc.fx(p[0]));
      dots[i].setAttribute("cy", sc.fy(p[1]));
      dots[i].setAttribute("opacity", 1);
      rows.push([s.name || `series ${i + 1}`, p]);
    });
    if (!rows.length) return;
    tip.textContent = "";
    tip.append(el("div", {}, el("span", { class: "k" }, `${state.xLabel}: `), eng(rows[0][1][0])));
    for (const [name, p] of rows) {
      tip.append(el("div", {}, el("span", { class: "k" }, `${name}: `), eng(p[1])));
    }
    tip.style.opacity = 1;
    const px = (sc.fx(rows[0][1][0]) / W) * box.width;
    tip.style.left = `${Math.min(px + 12, box.width - tip.offsetWidth - 6)}px`;
    tip.style.top = "8px";
  });
  svg.addEventListener("pointerleave", () => {
    cross.setAttribute("opacity", 0);
    dots.forEach((d) => d.setAttribute("opacity", 0));
    tip.style.opacity = 0;
  });
  return wrap;
}

/** A table view, so the numbers are reachable without reading pixels (and for CVD/print). */
function table() {
  const rows = Math.max(...state.series.map((s) => (s.points || []).length), 0);
  if (!rows) return null;
  const head = el("tr", {}, el("th", {}, state.xLabel || "x"),
                 state.series.map((s, i) => el("th", {}, s.name || `series ${i + 1}`)));
  const body = [];
  for (let r = 0; r < rows; r++) {
    const first = (state.series[0].points || [])[r];
    body.push(el("tr", {}, el("td", {}, first ? eng(first[0]) : "—"),
                   state.series.map((s) => {
                     const p = (s.points || [])[r];
                     return el("td", {}, p ? eng(p[1]) : "—");
                   })));
  }
  return el("details", {}, el("summary", {}, `Table — ${rows} points`),
            el("table", {}, el("thead", {}, head), el("tbody", {}, body)));
}

function render() {
  const root = document.getElementById("app");
  root.textContent = "";
  if (state.error) {
    root.append(el("div", { class: "muted" }, state.error));
    return;
  }
  root.append(el("h1", {}, state.title || "Sweep"));
  if (state.subtitle) root.append(el("div", { class: "sub" }, state.subtitle));
  root.append(draw());
  // A legend only when there is identity to disambiguate; with one series the title names it.
  if (state.series.length > 1) {
    root.append(el("div", { class: "legend" },
      state.series.map((s, i) => el("span", { class: "lg" },
        el("span", { class: "sw", style: `background: var(--series-${(i % SLOTS) + 1})` }),
        s.name || `series ${i + 1}`))));
  }
  const t = table();
  if (t) root.append(t);
  if (state.note) root.append(el("div", { class: "note" }, state.note));
  root.append(controls());
}

/** The local-sweep controls, and an honest line when there cannot be any.
 *
 * Four different "no" cases, each said in its own words, because "interactive sweeping is
 * unavailable" would send a reader looking in the wrong place three times out of four.
 */
function controls() {
  if (!state.subject?.document) {
    return el("div", { class: "note" },
      "Static chart: this result does not carry the magnetic it swept, so it can only be "
      + "redrawn, not recomputed.");
  }
  if (!state.spec) {
    const y = state.axes?.y?.unit ?? "?";
    return el("div", { class: "note" },
      `Static chart: a ${y}-axis sweep needs an operating point, which a curves result does `
      + "not carry — that one stays with the server.");
  }
  if (!wasmAllowed()) {
    return el("div", { class: "note" },
      "Static chart: this host does not permit WebAssembly in a widget (the MCP Apps "
      + "recommended CSP grants neither wasm-unsafe-eval nor unsafe-eval), so the engine "
      + "cannot run here. The server's points are shown.");
  }

  const box = el("div", { class: "controls" });
  box.append(el("div", { class: "sub" },
    `${state.subject.name} — recompute ${state.spec.label} here, in this panel`));

  const num = (label, key, value, step) => {
    const input = el("input", { type: "number", value: String(value), step: String(step),
                                class: "ctl" });
    input.addEventListener("change", () => {
      const v = Number(input.value);
      if (Number.isFinite(v)) {
        if (key === "scalar") state.scalar = v; else state.range[key] = v;
      }
    });
    return el("label", { class: "ctllabel" }, label, input);
  };

  const xUnit = state.axes?.x?.unit || "";
  box.append(num(`from (${xUnit})`, "from", state.range.from, state.range.from / 10 || 1));
  box.append(num(`to (${xUnit})`, "to", state.range.to, state.range.to / 10 || 1));
  box.append(num("points", "points", state.range.points, 1));
  if (state.spec.extra.length) {
    const unit = state.spec.extra[0] === "temperature" ? "degC" : "Hz";
    box.append(num(`${state.spec.extra[0]} (${unit})`, "scalar", state.scalar, 1));
  }

  const go = el("button", { class: "btn" },
                engine.module ? "Sweep again" : "Load the engine and sweep");
  go.addEventListener("click", () => recompute(go));
  box.append(go);
  if (state.status) box.append(el("span", { class: "status" }, state.status));
  if (engine.error) box.append(el("span", { class: "err" }, engine.error));
  if (engine.module) {
    box.append(el("div", { class: "note" },
      `libMKF is running in this panel (${(engine.bytes / 1e6).toFixed(0)} MB, no server round `
      + "trip). These curves are yours to explore; the answer the assistant stated is still "
      + "the server's."));
  }
  return box;
}

async function recompute(button) {
  button.disabled = true;
  engine.error = "";
  try {
    state.status = "loading…";
    render();
    const mkf = await loadEngine((msg) => { state.status = msg; render(); });
    state.status = "sweeping…";
    render();
    const pts = localSweep(mkf, state.spec, state.subject.document,
                           state.range.from, state.range.to,
                           Math.max(2, Math.round(state.range.points)), state.scalar);
    // A SEPARATE series, labelled as computed here. Overwriting the server's would erase the
    // thing the model actually answered from.
    state.live = { name: `${state.spec.label} — computed in this panel`, points: pts };
    state.series = [state.series[0], state.live].filter(Boolean);
    state.status = `${pts.length} points`;
  } catch (err) {
    state.status = "";
    engine.error = `could not sweep here: ${err.message || err}`;
  } finally {
    button.disabled = false;
    render();
  }
}

/** An axis label the way an engineer writes it: "impedance (ohm)". */
const axisLabel = (a) => (a ? [a.label, a.unit && `(${a.unit})`].filter(Boolean).join(" ") : "");

function apply(data) {
  if (!data || typeof data !== "object") {
    state.error = "The tool returned no chart payload.";
    return;
  }
  if (data.mode !== "curves") {
    // A payload of another shape is not a chart with pieces missing — it is a different
    // answer, and drawing an empty frame over it would hide that.
    state.error = `This widget draws curves; the tool returned a '${data.mode ?? "shapeless"}' result.`;
    state.series = [];
    return;
  }
  state.title = data.title || "";
  state.subtitle = data.subtitle || "";
  state.note = data.caveat || "";
  // The axes are DECLARED now, label and unit apart, so the chart can label an ordinate
  // without parsing "|Z| (Ω)" back into its two halves.
  state.xLabel = axisLabel(data.axes?.x);
  state.yLabel = axisLabel(data.axes?.y);
  state.series = Array.isArray(data.series) ? data.series : [];
  state.error = state.series.length ? "" : "The tool result carried no series.";
  // What the curves are OF. Present only when the server put it there, and the reason the
  // controls below can exist at all.
  state.subject = data.subject || null;
  state.axes = data.axes || null;
  state.spec = state.subject?.document ? sweepFor(data.axes) : null;
  state.live = null;
  const xs = state.series.flatMap((s2) => (s2.points || []).map((pt) => pt[0]))
                         .filter(Number.isFinite);
  if (xs.length) {
    // Seed the controls from what the server actually swept, so the first local run
    // reproduces the chart on screen rather than jumping somewhere else.
    state.range = { from: Math.min(...xs), to: Math.max(...xs), points: xs.length };
    state.logX = state.axes?.x?.scale ? state.axes.x.scale === "log"
                                      : Math.min(...xs) > 0 && Math.max(...xs) / Math.min(...xs) >= 20;
  }
  if (state.spec?.extra.length) {
    // The scalar the sweep holds fixed: temperature for a frequency or bias sweep, frequency
    // for a temperature sweep. Defaults are the engine's own conventional ones.
    state.scalar = state.spec.extra[0] === "temperature" ? 25 : 100000;
  }
}


/* ---------------------------------------------------------------------------
 * Running the engine HERE, when the host allows it.
 *
 * The server sweeps once and sends the points. That is the whole answer for a
 * static chart — and useless the moment someone wants to see the same magnetic
 * over a different range, because every change is another round trip to an engine
 * that needs gigabytes to answer.
 *
 * So: if the payload names its subject (a `curves` result may carry the magnetic
 * it swept) and this host permits WebAssembly, the widget loads libMKF and sweeps
 * locally as the controls move. Nothing is asserted from here — the model already
 * has the server's answer, and this is exploration on top of it.
 *
 * WHY IT MIGHT NOT WORK, and why that is fine: the MCP Apps spec's recommended
 * CSP (script-src 'self' 'unsafe-inline') grants neither wasm-unsafe-eval nor
 * unsafe-eval, so a spec-following host BLOCKS this. Hertz ships a whole tool
 * (wasm_probe) to find out per host. The probe below is the same question, asked
 * quietly: on failure the widget stays exactly what it was.
 * ------------------------------------------------------------------------- */

/** Can this sandbox instantiate WebAssembly at all? Eight bytes: magic + version. */
function wasmAllowed() {
  try {
    new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    return true;
  } catch {
    return false;
  }
}

// Which engine call answers which chart. Keyed on the AXES, not the title: the title is
// prose the server chose, the axes are declared units.
//
// Only sweeps whose arguments are fully derivable are here. The loss sweeps need an
// operating point, which a curves payload does not carry — so they stay server-side and the
// widget says so rather than inventing an excitation.
const SWEEPS = [
  { x: "Hz", y: "ohm", label: "impedance", fn: "sweep_impedance_over_frequency", extra: [] },
  { x: "Hz", y: "1", label: "Q factor", fn: "sweep_q_factor_over_frequency", extra: [] },
  { x: "Hz", y: "H", label: "inductance vs frequency",
    fn: "sweep_magnetizing_inductance_over_frequency", extra: ["temperature"] },
  { x: "A", y: "H", label: "inductance vs DC bias",
    fn: "sweep_magnetizing_inductance_over_dc_bias", extra: ["temperature"] },
  { x: "degC", y: "H", label: "inductance vs temperature",
    fn: "sweep_magnetizing_inductance_over_temperature", extra: ["frequency"] },
];

const engine = { module: null, loading: false, error: "", bytes: 0 };

function sweepFor(axes) {
  return SWEEPS.find((s) => s.x === axes?.x?.unit && s.y === axes?.y?.unit) || null;
}

/** Fetch the engine and instantiate it on THIS thread.
 *
 * Main thread, not a worker: the web app runs libMKF in a Web Worker, but a worker cannot be
 * constructed from an opaque origin — which is what a sandbox without allow-same-origin gives
 * us. And `wasmBinary` is passed directly so emscripten never tries to locate the file
 * itself, which would resolve against about:srcdoc and fail.
 */
async function loadEngine(onProgress) {
  if (engine.module || engine.loading) return engine.module;
  engine.loading = true;
  try {
    const origin = window.__MOEBIUS_ORIGIN__;
    const pipeline = window.__MOEBIUS_PIPELINE__ || "openmagnetics";
    if (!origin) throw new Error("this host did not say where it lives (no __MOEBIUS_ORIGIN__)");
    const url = `${origin}/api/engine/${pipeline}/libMKF.wasm`;
    onProgress("fetching the engine…");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
    const wasmBinary = await res.arrayBuffer();
    engine.bytes = wasmBinary.byteLength;
    onProgress(`instantiating ${(engine.bytes / 1e6).toFixed(0)} MB…`);
    // The glue is fetched too, NOT imported. A static import makes vite follow it to the
    // 33 MB .wasm and inline both into this single-file bundle — 44 MB of base64 per tool
    // result, which is the opposite of the point. @vite-ignore keeps the build out of it.
    const glue = `${origin}/api/engine/${pipeline}/libMKF.js`;
    const factory = (await import(/* @vite-ignore */ glue)).default;
    engine.module = await factory({ wasmBinary });
    return engine.module;
  } catch (err) {
    engine.error = err.message || String(err);
    throw err;
  } finally {
    engine.loading = false;
  }
}

/** One local sweep, in the engine's own units, returned as contract-shaped points. */
function localSweep(mkf, spec, magnetic, from, to, points, scalar) {
  const args = [JSON.stringify(magnetic), from, to, points];
  if (spec.extra.length) args.push(scalar);
  args.push(state.logX ? "log" : "linear", "");
  const raw = mkf[spec.fn](...args);
  const out = typeof raw === "string" ? JSON.parse(raw) : raw;
  const xs = out.xPoints || [];
  const ys = out.yPoints || [];
  if (!xs.length || xs.length !== ys.length) {
    throw new Error(`the engine returned ${xs.length} x and ${ys.length} y points`);
  }
  return xs.map((x, i) => [x, ys[i]]);
}

// --- start, LAST ---------------------------------------------------------------
//
// Two ordering rules, and both were learned by breaking them:
//
// `ontoolresult`, all lowercase — the name the SDK actually dispatches (App defines
// `set ontoolresult`; there is no `toolResult` property at all). This file used
// `onToolResult` and read `app.toolResult`, so the handler never fired and every render said
// "the tool returned no chart payload". Nothing had ever rendered this widget to notice: its
// tools need an advised magnetic, so the widget suite listed it as unreachable.
//
// And this runs at the END of the module, not the middle. A top-level `await connect()` lets
// the host's tool-result notification arrive while the rest of the file is still evaluating,
// so `apply()` reached the sweep table before its `const` was initialised — a temporal dead
// zone. The visible symptom was not an error: the chart drew, and the interactive controls
// silently decided this sweep was one they could not recompute.
app.ontoolresult = (result) => { apply(result?.structuredContent); render(); };
await app.connect();
render();
