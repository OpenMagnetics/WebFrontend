// Illustrative sketches of the current in each topology's magnetic, drawn on the topology page
// (WizardsLanding.vue) so an engineer recognises the converter at a glance. They are shapes, not
// results: nothing here is computed from a design, and nothing reads them back.
//
// A sketch is a list of traces; each trace is a function of t in [0, 1) (two switching periods
// across the screen) returning a value in [-1, 1], plus the winding it belongs to (`tone`:
// 'first', 'second' or 'third'), which picks its colour.

const SAMPLES = 220;

const frac = (x) => x - Math.floor(x);
// Triangle ripple: rises for `duty` of the period, falls for the rest; -1..1.
const triangle = (t, duty) => {
    const p = frac(t);
    return p < duty ? -1 + 2 * p / duty : 1 - 2 * (p - duty) / (1 - duty);
};
const sine = (t, cycles = 1, phase = 0) => Math.sin(2 * Math.PI * (t * cycles + phase));

// Two switching periods across the screen.
const periods = (shape) => (t) => shape(frac(t * 2));

const inductor = (duty) => periods((p) => 0.15 + 0.6 * triangle(p, duty));

const SKETCHES = {
    CommonModeChoke: [
        { tone: 'first', fn: (t) => 0.75 * sine(t, 2) + 0.12 * sine(t, 37) * sine(t, 5) },
    ],
    DifferentialModeChoke: [
        { tone: 'first', fn: (t) => 0.8 * sine(t, 2) + 0.1 * triangle(t * 30, 0.5) },
    ],
    Pfc: [
        { tone: 'first', fn: (t) => -0.85 + 1.6 * Math.abs(Math.sin(2 * Math.PI * t)) * (0.92 + 0.08 * triangle(t * 26, 0.5)) },
    ],
    Buck: [{ tone: 'first', fn: inductor(0.4) }],
    Boost: [{ tone: 'first', fn: inductor(0.68) }],
    FourSwitchBuckBoost: [{ tone: 'first', fn: inductor(0.55) }],
    Sepic: [
        { tone: 'first', fn: periods((p) => 0.35 + 0.35 * triangle(p, 0.5)) },
        { tone: 'second', fn: periods((p) => -0.45 + 0.35 * triangle(p, 0.5)) },
    ],
    Cuk: [
        { tone: 'first', fn: periods((p) => 0.4 + 0.3 * triangle(p, 0.45)) },
        { tone: 'second', fn: periods((p) => -0.4 - 0.3 * triangle(p, 0.45)) },
    ],
    Zeta: [
        { tone: 'first', fn: periods((p) => 0.4 + 0.3 * triangle(p, 0.45)) },
        { tone: 'second', fn: periods((p) => -0.35 + 0.25 * triangle(p, 0.45)) },
    ],
    Flyback: [
        { tone: 'first', fn: periods((p) => (p < 0.45 ? -0.55 + 1.3 * p / 0.45 : -0.85)) },
        { tone: 'second', fn: periods((p) => (p < 0.45 ? -0.85 : 0.75 - 1.4 * (p - 0.45) / 0.55)) },
    ],
    IsolatedBuck: [
        { tone: 'first', fn: periods((p) => 0.55 * triangle(p, 0.45)) },
        { tone: 'second', fn: periods((p) => (p < 0.45 ? -0.85 : -0.1 - 0.5 * (p - 0.45) / 0.55)) },
    ],
    IsolatedBuckBoost: [
        { tone: 'first', fn: periods((p) => (p < 0.5 ? -0.5 + 1.2 * p / 0.5 : -0.85)) },
        { tone: 'second', fn: periods((p) => (p < 0.5 ? -0.85 : 0.6 - 1.2 * (p - 0.5) / 0.5)) },
    ],
    SingleSwitchForward: [
        { tone: 'first', fn: periods((p) => (p < 0.42 ? 0.35 + 0.4 * p / 0.42 : p < 0.8 ? -0.35 + 0.35 * (p - 0.42) / 0.38 : 0)) },
    ],
    TwoSwitchForward: [
        { tone: 'first', fn: periods((p) => (p < 0.45 ? 0.3 + 0.45 * p / 0.45 : p < 0.7 ? -0.4 + 0.4 * (p - 0.45) / 0.25 : 0)) },
    ],
    ActiveClampForward: [
        { tone: 'first', fn: periods((p) => (p < 0.5 ? 0.3 + 0.45 * p / 0.5 : -0.15 - 0.25 * Math.sin(Math.PI * (p - 0.5) / 0.5))) },
    ],
    PushPull: [
        { tone: 'first', fn: periods((p) => (p < 0.4 ? 0.35 + 0.35 * p / 0.4 : p < 0.5 ? 0 : p < 0.9 ? -0.35 - 0.35 * (p - 0.5) / 0.4 : 0)) },
    ],
    Weinberg: [
        { tone: 'first', fn: periods((p) => (p < 0.45 ? 0.45 + 0.2 * p / 0.45 : p < 0.5 ? 0.1 : p < 0.95 ? -0.45 - 0.2 * (p - 0.5) / 0.45 : -0.1)) },
    ],
    PhaseShiftFullBridge: [
        { tone: 'first', fn: periods((p) => (p < 0.08 ? -0.65 + 1.3 * p / 0.08 : p < 0.38 ? 0.65 + 0.15 * (p - 0.08) / 0.3 : p < 0.5 ? 0.8 - 0.12 * (p - 0.38) / 0.12
            : p < 0.58 ? 0.68 - 1.33 * (p - 0.5) / 0.08 : p < 0.88 ? -0.65 - 0.15 * (p - 0.58) / 0.3 : -0.8 + 0.15 * (p - 0.88) / 0.12)) },
    ],
    PhaseShiftHalfBridge: [
        { tone: 'first', fn: periods((p) => (p < 0.1 ? -0.55 + 1.1 * p / 0.1 : p < 0.5 ? 0.55 + 0.1 * (p - 0.1) / 0.4 : p < 0.6 ? 0.65 - 1.2 * (p - 0.5) / 0.1 : -0.55 - 0.1 * (p - 0.6) / 0.4)) },
    ],
    AsymmetricHalfBridge: [
        { tone: 'first', fn: periods((p) => (p < 0.65 ? 0.2 + 0.25 * p / 0.65 : -0.45 - 0.35 * (p - 0.65) / 0.35)) },
    ],
    DualActiveBridge: [
        { tone: 'first', fn: periods((p) => (p < 0.15 ? -0.7 + 1.3 * p / 0.15 : p < 0.5 ? 0.6 + 0.1 * (p - 0.15) / 0.35 : p < 0.65 ? 0.7 - 1.3 * (p - 0.5) / 0.15 : -0.6 - 0.1 * (p - 0.65) / 0.35)) },
    ],
    LlcResonant: [
        { tone: 'first', fn: periods((p) => (p < 0.4 ? 0.85 * Math.sin(Math.PI * p / 0.4) * 0.9 + 0.25 * (-1 + 2 * p / 0.5) : p < 0.5 ? 0.25 * (-1 + 2 * p / 0.5)
            : p < 0.9 ? -0.85 * Math.sin(Math.PI * (p - 0.5) / 0.4) * 0.9 + 0.25 * (1 - 2 * (p - 0.5) / 0.5) : 0.25 * (1 - 2 * (p - 0.5) / 0.5))) },
    ],
    CllcResonant: [
        { tone: 'first', fn: (t) => 0.75 * sine(t, 2) },
        { tone: 'second', fn: (t) => 0.6 * sine(t, 2, -0.12) },
    ],
    Clllc: [
        { tone: 'first', fn: (t) => 0.75 * sine(t, 2) + 0.1 * sine(t, 6) },
        { tone: 'second', fn: (t) => 0.6 * sine(t, 2, -0.12) + 0.08 * sine(t, 6, -0.12) },
    ],
    SeriesResonant: [
        { tone: 'first', fn: (t) => 0.8 * sine(t, 2) },
    ],
    Vienna: [
        { tone: 'first', fn: (t) => 0.75 * sine(t, 1.5) + 0.06 * triangle(t * 40, 0.5) },
        { tone: 'second', fn: (t) => 0.75 * sine(t, 1.5, 1 / 3) + 0.06 * triangle(t * 40, 0.5) },
        { tone: 'third', fn: (t) => 0.75 * sine(t, 1.5, 2 / 3) + 0.06 * triangle(t * 40, 0.5) },
    ],
};

// Polylines for the SVG screen (viewBox 0 0 width height). Throws for a wizard without a sketch,
// so a new wizard cannot appear on the page with an empty screen.
export function sketchTraces(store, width, height) {
    const sketch = SKETCHES[store];
    if (sketch == null) {
        throw new Error(`No topology sketch for wizard '${store}': add one to topologySketches.js`);
    }
    const margin = height * 0.1;
    return sketch.map(({ tone, fn }) => {
        const points = [];
        for (let i = 0; i <= SAMPLES; i++) {
            const t = i / SAMPLES;
            const value = Math.max(-1, Math.min(1, fn(t)));
            points.push(`${(t * width).toFixed(1)},${(height / 2 - value * (height / 2 - margin)).toFixed(1)}`);
        }
        return { tone, points: points.join(' ') };
    });
}
