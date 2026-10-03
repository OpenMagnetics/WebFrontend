/**
 * Small pieces the wound-coil view and the result panel share: DOM building, the theme
 * check, and number formatting. Formatting only — an SI prefix and a unit symbol are how a
 * number is WRITTEN, not a computation; nothing here derives one quantity from another.
 */

export const THEME_TOKENS = [
  "--w-bg", "--w-panel", "--w-fg", "--w-muted", "--w-line", "--w-accent", "--w-accent-fg",
  "--w-warn", "--w-fail",
];

/** Element factory: h("td", { class: "w-num", title: "…" }, "text", child). */
export function h(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid === undefined || kid === null || kid === false) continue;
    node.append(kid instanceof Node ? kid : String(kid));
  }
  return node;
}

/** Refuse to render in browser defaults: every --w-* token must resolve on the root. */
export function assertTheme(root) {
  const style = getComputedStyle(root);
  const missing = THEME_TOKENS.filter((t) => !style.getPropertyValue(t).trim());
  if (missing.length) {
    throw new Error(`the host page defines no ${missing.join(", ")}: the widget will not draw `
      + "in browser-default colours (omWidget.css defines them)");
  }
}

/** A cell for a value the payload does not state: an em dash that says so on hover. */
export const absent = (why = "not stated") => h("span", { class: "w-absent", title: why }, "—");

const UNIT_SYMBOL = { ohm: "Ω", degC: "°C", "W/m3": "W/m³", "1": "" };
// Units an SI prefix reads naturally on. Temperatures, ratios and densities do not take one.
const PREFIXABLE = new Set(["W", "H", "A", "V", "ohm", "Hz", "T", "F", "m"]);
const PREFIXES = [[1e-12, "p"], [1e-9, "n"], [1e-6, "µ"], [1e-3, "m"], [1, ""], [1e3, "k"], [1e6, "M"], [1e9, "G"]];

export const unitSymbol = (unit) => (unit in UNIT_SYMBOL ? UNIT_SYMBOL[unit] : unit ?? "");

/** "56.6 mW", "80.4 °C", "1.36e+3 W/m³" — four significant figures, prefixed where natural. */
export function formatQuantity(value, unit) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`not a finite number: ${JSON.stringify(value)}`);
  }
  const symbol = unitSymbol(unit);
  if (PREFIXABLE.has(unit) && value !== 0) {
    const a = Math.abs(value);
    let [factor, prefix] = PREFIXES[0];
    for (const [f, p] of PREFIXES) if (a >= f) [factor, prefix] = [f, p];
    return `${Number((value / factor).toPrecision(4))} ${prefix}${symbol}`;
  }
  const text = Math.abs(value) >= 1e5 || (value !== 0 && Math.abs(value) < 1e-3)
    ? value.toExponential(3) : String(Number(value.toPrecision(4)));
  return symbol ? `${text} ${symbol}` : text;
}
