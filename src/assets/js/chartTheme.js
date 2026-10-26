// CSS custom properties do not resolve inside a canvas 2D context: Chart.js
// assigns color options straight to fillStyle/strokeStyle, and an unparseable
// value like 'var(--p-light)' is silently ignored, leaving whatever color the
// context last had (the harmonics tooltip title rendered black-on-black —
// web bug report #166). Resolve theme variables to concrete values when the
// chart options are built.
export function themeColor(name, fallback) {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (value || '').trim() || fallback;
}

export function themeRgba(rgbName, alpha, fallbackRgb) {
    return `rgba(${themeColor(rgbName, fallbackRgb)}, ${alpha})`;
}

// A theme variable that must exist: throws when it does not resolve, rather than
// drawing chart text in some substitute colour nobody chose.
export function themeVar(name) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (value === '') throw new Error(`Chart theme: CSS variable ${name} is not defined on :root`);
    return value;
}

export function themeVarRgba(rgbName, alpha) {
    return `rgba(${themeVar(rgbName)}, ${alpha})`;
}

// Tooltip of the operating-point charts: light text on the dark theme surface
// (the text used --p-light, which in the dark theme is a dark grey: near-black
// text on a near-black box). Each line's swatch is the series' own colour.
export function chartTooltipTheme() {
    return {
        backgroundColor: themeVarRgba('--p-dark-rgb', 0.96),
        titleColor: themeVar('--p-white'),
        bodyColor: themeVar('--p-white'),
        footerColor: themeVar('--p-white'),
        borderColor: themeVarRgba('--p-primary-rgb', 0.6),
        multiKeyBackground: themeVar('--p-dark'),
        borderWidth: 1,
        padding: 8,
        cornerRadius: 6,
        boxPadding: 4,
        titleFont: { size: 11, weight: '600' },
        bodyFont: { size: 11 },
    };
}

// Swatch of one tooltip line: filled and outlined with the series' line colour.
export function seriesLabelColor(context) {
    const colour = context.dataset.borderColor;
    return { borderColor: colour, backgroundColor: colour, borderWidth: 1, borderRadius: 2 };
}
