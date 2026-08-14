/**
 * OpenMagnetics sweep-curves widget — the MCP App resource behind ui://openmagnetics/curves.html.
 *
 * Eight sweep tools advertised this chart and no bundle existed to serve it, so every host that
 * understands MCP Apps asked for the resource and got a FileNotFoundError, while the text result
 * kept working — invisible in a plain client, broken exactly where the feature is meant to shine
 * (ABT #651).
 *
 * Payload, as _curves_result builds it in mcp/server.py:
 *   { title, subtitle, x_label, y_label, note?,
 *     series: [{ name, points: [[x, y], …] }] }
 *
 * The x axis is log by default because every sweep here is against frequency, DC bias or
 * temperature over decades — but it falls back to linear when the data cannot be logged (a
 * temperature sweep crosses zero), rather than silently dropping the points that would.
 */
import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "OpenMagnetics Sweeps", version: "0.1.0" });

const state = {
  title: "", subtitle: "", note: "", xLabel: "", yLabel: "", series: [], error: "",
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
}

function apply(data) {
  if (!data || typeof data !== "object") {
    state.error = "The tool returned no chart payload.";
    return;
  }
  state.title = data.title || "";
  state.subtitle = data.subtitle || "";
  state.note = data.note || "";
  state.xLabel = data.x_label || "";
  state.yLabel = data.y_label || "";
  state.series = Array.isArray(data.series) ? data.series : [];
  state.error = state.series.length ? "" : "The tool result carried no series.";
}

app.onToolResult = ({ structuredContent }) => { apply(structuredContent); render(); };
await app.connect();
apply(app.toolResult?.structuredContent);
render();
