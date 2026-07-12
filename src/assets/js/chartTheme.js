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
