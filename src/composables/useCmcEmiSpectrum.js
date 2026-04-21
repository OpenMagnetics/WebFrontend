/**
 * Closed-form EMI-spectrum model for the CMC wizard.
 *
 * Given a switching-node trapezoidal voltage and a parasitic coupling
 * capacitance, this composable returns the conducted CM-noise voltage the
 * LISN would measure, before and after the CMC. It is a *design-stage*
 * predictor — matches the style of Würth REDEXPERT / Coilcraft Analyzer
 * rather than a full ngspice run. References:
 *   - Clayton R. Paul, Introduction to EMC (2nd ed.), §3.4
 *   - Erickson & Maksimović, Fundamentals of Power Electronics (3rd ed.), §10
 *
 * Three spectra are returned, all in dBµV (CISPR reference: 1 µV):
 *   1. source:   CM-noise voltage at the LISN with NO filter
 *   2. filtered: CM-noise voltage at the LISN WITH the CMC in series
 *   3. limit:    regulatory conducted-emission limit (CISPR 32 / FCC)
 *
 * Limits are the quasi-peak envelopes. Pass/fail is whether every filtered
 * sample sits below the limit line.
 */

// ── Regulatory limit tables (QP, dBµV) ──────────────────────────────────
//
// Each table is a list of segments `{ fLo, fHi, dBLo, dBHi }`. Inside a
// segment the limit is linear in log(f); between segments the limit may
// step (CISPR 32 Class B has a jump at 5 MHz from 56 to 60 dBµV).
const LIMIT_TABLES = {
    'CISPR 32 Class B': [
        { fLo: 150e3, fHi: 500e3, dBLo: 66, dBHi: 56 },  // log-linear ramp
        { fLo: 500e3, fHi: 5e6,   dBLo: 56, dBHi: 56 },  // flat
        { fLo: 5e6,   fHi: 30e6,  dBLo: 60, dBHi: 60 },  // step up, then flat
    ],
    'CISPR 32 Class A': [
        { fLo: 150e3, fHi: 500e3, dBLo: 79, dBHi: 73 },
        { fLo: 500e3, fHi: 30e6,  dBLo: 73, dBHi: 73 },
    ],
    'FCC Part 15 Class B': [
        { fLo: 150e3, fHi: 500e3, dBLo: 66, dBHi: 56 },
        { fLo: 500e3, fHi: 5e6,   dBLo: 56, dBHi: 56 },
        { fLo: 5e6,   fHi: 30e6,  dBLo: 60, dBHi: 60 },
    ],
    'FCC Part 15 Class A': [
        { fLo: 150e3, fHi: 500e3, dBLo: 79, dBHi: 73 },
        { fLo: 500e3, fHi: 30e6,  dBLo: 73, dBHi: 73 },
    ],
};

export const EMI_F_MIN_HZ = 150e3;
export const EMI_F_MAX_HZ = 30e6;
const DBUV_REF = 1e-6;  // CISPR reference level: 1 µV

// Linear-in-log-f interpolation within a segment. Between segments the limit
// takes the higher of the two adjacent values — i.e. we draw the worst-case
// step from below, matching how QP receivers are scored in the standard.
export function cisprLimitDbuV(standard, fHz) {
    const table = LIMIT_TABLES[standard] || LIMIT_TABLES['CISPR 32 Class B'];
    if (fHz <= table[0].fLo) return table[0].dBLo;
    const last = table[table.length - 1];
    if (fHz >= last.fHi) return last.dBHi;
    for (const seg of table) {
        if (fHz >= seg.fLo && fHz <= seg.fHi) {
            if (seg.dBLo === seg.dBHi) return seg.dBLo;
            const k = Math.log10(fHz / seg.fLo) / Math.log10(seg.fHi / seg.fLo);
            return seg.dBLo + k * (seg.dBHi - seg.dBLo);
        }
    }
    // Fallback: frequency lies in a gap between segments — pick the stricter
    // (lower) of the two adjacent values.
    for (let i = 0; i < table.length - 1; i++) {
        if (fHz > table[i].fHi && fHz < table[i + 1].fLo) {
            return Math.min(table[i].dBHi, table[i + 1].dBLo);
        }
    }
    return last.dBHi;
}

// sinc(x) = sin(x)/x, with sinc(0) = 1.
const sinc = (x) => (Math.abs(x) < 1e-12 ? 1.0 : Math.sin(x) / x);

// ── Trapezoid fundamental spectrum amplitude at frequency f ────────────
//
// For a repetitive trapezoid of period T, amplitude V, duty d, rise t_r,
// the complex Fourier coefficient magnitude is (Clayton Paul eq. 3-51):
//
//   |c_n| = 2 V d |sinc(n π d)| |sinc(n π t_r / T)|
//
// The envelope is flat below 1/(π d T), rolls off 20 dB/dec until
// 1/(π t_r), then rolls off 40 dB/dec. We sample this envelope at arbitrary
// f, not just harmonics, so the consumer can plot a continuous curve.
function trapezoidSpectrumVolts(f, V, d, tr, fSw) {
    const T = 1 / fSw;
    const n = f / fSw;             // treat f as n·f_sw for envelope purposes
    return 2 * V * d * Math.abs(sinc(Math.PI * n * d)) * Math.abs(sinc(Math.PI * n * tr / T));
}

// ── CM current into the coupling capacitor: I = V · jωC → |I| = V · 2πf · C
const couplingCurrent = (V_f, f, C_p) => V_f * 2 * Math.PI * f * C_p;

// ── LISN half-impedance: V_meas = I · Z_LISN/2 (standard CM measurement)
const lisnHalf = (Z_LISN) => Z_LISN / 2;

// ── CMC attenuation: |1 + jωL / Z_meas| (voltage divider inverse).
//    At low f: ~1 (no attenuation); at high f: grows ~20 dB/dec.
function cmcAttenuationLinear(f, L, Z_meas) {
    const omegaL = 2 * Math.PI * f * L;
    return Math.sqrt(1 + (omegaL / Z_meas) ** 2);
}

const toDbuV = (v_rms) => 20 * Math.log10(Math.max(Math.abs(v_rms), 1e-12) / DBUV_REF);

/**
 * Compute the three spectra. All inputs in SI (seconds, Hz, farads, henries,
 * ohms, volts). Returns `{ frequencies, source, filtered, limit, passing }`.
 *
 * @param {Object} p
 * @param {number} p.switchingFrequency   — f_sw (Hz)
 * @param {number} p.voltageSwing         — trapezoid amplitude V (V)
 * @param {number} p.parasiticCap_pF      — C coupling to earth (pF)
 * @param {number} p.dvdt_V_ns            — slew rate → t_r = V / (dV/dt) (V/ns)
 * @param {number} p.dutyRatio            — trapezoid duty, default 0.5
 * @param {number} p.inductance           — CMC L per winding (H)
 * @param {number} p.lineImpedance        — LISN Z (Ω), default 50
 * @param {string} p.regulatoryStandard   — which limit line to draw
 * @param {number} p.numPoints            — frequency grid points, default 200
 */
export function computeEmiSpectrum(p) {
    const {
        switchingFrequency, voltageSwing,
        parasiticCap_pF, dvdt_V_ns,
        dutyRatio = 0.5,
        inductance, lineImpedance = 50,
        regulatoryStandard = 'CISPR 32 Class B',
        numPoints = 200,
    } = p;

    const C_p = parasiticCap_pF * 1e-12;
    // Rise time: the switching edge covers the full voltage swing at dV/dt.
    const t_r = (dvdt_V_ns > 0 && voltageSwing > 0)
        ? (voltageSwing / (dvdt_V_ns * 1e9))
        : 10e-9;
    const Z_meas = lisnHalf(lineImpedance);

    const logMin = Math.log10(EMI_F_MIN_HZ);
    const logMax = Math.log10(EMI_F_MAX_HZ);
    const frequencies = [];
    const source   = [];
    const filtered = [];
    const limit    = [];
    let passing = true;
    let worstMarginDb = Infinity;

    for (let i = 0; i < numPoints; i++) {
        const f = 10 ** (logMin + (logMax - logMin) * i / (numPoints - 1));
        // Trapezoid spectrum at f (voltage amplitude at the switching node).
        const V_src = trapezoidSpectrumVolts(f, voltageSwing, dutyRatio, t_r, switchingFrequency);
        // Noise current through C_p, voltage at the LISN sensing half.
        const I = couplingCurrent(V_src, f, C_p);
        const V_lisn = I * Z_meas;                          // before filter
        const att = cmcAttenuationLinear(f, inductance, Z_meas);
        const V_filt = V_lisn / att;

        const dbSrc  = toDbuV(V_lisn);
        const dbFilt = toDbuV(V_filt);
        const dbLim  = cisprLimitDbuV(regulatoryStandard, f);

        frequencies.push(f);
        source.push(dbSrc);
        filtered.push(dbFilt);
        limit.push(dbLim);

        const margin = dbLim - dbFilt;
        if (margin < worstMarginDb) worstMarginDb = margin;
        if (margin < 0) passing = false;
    }

    return { frequencies, source, filtered, limit, passing, worstMarginDb };
}
