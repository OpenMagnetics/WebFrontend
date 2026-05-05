/**
 * Closed-form EMI-spectrum models for CMC (common-mode) and DMC (differential-mode) wizards.
 *
 * Shared helpers: cisprLimitDbuV, sinc, toDbuV.
 * CMC path: voltage trapezoid → parasitic C coupling → CMC inductor (1st-order, 20 dB/dec).
 * DMC path: current triangle → LC low-pass filter (2nd-order, 40 dB/dec).
 */

const LIMIT_TABLES = {
    'CISPR 32 Class B': [
        { fLo: 150e3, fHi: 500e3, dBLo: 66, dBHi: 56 },
        { fLo: 500e3, fHi: 5e6,   dBLo: 56, dBHi: 56 },
        { fLo: 5e6,   fHi: 30e6,  dBLo: 60, dBHi: 60 },
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
const DBUV_REF = 1e-6;

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
    for (let i = 0; i < table.length - 1; i++) {
        if (fHz > table[i].fHi && fHz < table[i + 1].fLo) {
            return Math.min(table[i].dBHi, table[i + 1].dBLo);
        }
    }
    return last.dBHi;
}

const sinc = (x) => (Math.abs(x) < 1e-12 ? 1.0 : Math.sin(x) / x);
const toDbuV = (v_rms) => 20 * Math.log10(Math.max(Math.abs(v_rms), 1e-12) / DBUV_REF);

// ======== Common-Mode helpers ========

function trapezoidSpectrumVolts(f, V, d, tr, fSw) {
    const T = 1 / fSw;
    const n = f / fSw;
    return 2 * V * d * Math.abs(sinc(Math.PI * n * d)) * Math.abs(sinc(Math.PI * n * tr / T));
}

const couplingCurrent = (V_f, f, C_p) => V_f * 2 * Math.PI * f * C_p;

const lisnHalf = (Z_LISN) => Z_LISN / 2;

function cmcAttenuationLinear(f, L, Z_meas) {
    const omegaL = 2 * Math.PI * f * L;
    return Math.sqrt(1 + (omegaL / Z_meas) ** 2);
}

// ======== Differential-Mode helpers ========

function triangularCurrentSpectrumAmps(f, deltaIpp, fSw, duty) {
    const n = f / fSw;
    if (n < 1) return 0;
    const d = (duty != null && duty > 0 && duty < 1) ? duty : 0.5;
    const num = (deltaIpp / (Math.PI * Math.PI)) * (sinc(Math.PI * n * d) ** 2);
    return num / (d * (1 - d));
}

function lcAttenuationLinear(f, L, C, Z_LISN) {
    const w  = 2 * Math.PI * f;
    const re = 1 - w * w * L * C;
    const im = (w * L) / Z_LISN;
    return Math.sqrt(re * re + im * im);
}

// ======== Public: CMC spectrum ========

/**
 * CM path: trapezoid voltage → parasitic capacitance coupling → CMC inductor.
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
        const V_src = trapezoidSpectrumVolts(f, voltageSwing, dutyRatio, t_r, switchingFrequency);
        const I = couplingCurrent(V_src, f, C_p);
        const V_lisn = I * Z_meas;
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

// ======== Public: DMC spectrum ========

/**
 * DM path: triangle current source → LC low-pass filter → LISN.
 * Also returns cutoffFrequency for the LC corner.
 */
export function computeDmcEmiSpectrum(p) {
    const {
        switchingFrequency, ripplePeakToPeak,
        dutyCycle = 0.5,
        inductance, capacitance, lineImpedance = 50,
        regulatoryStandard = 'CISPR 32 Class B',
        numPoints = 200,
    } = p;

    const logMin = Math.log10(EMI_F_MIN_HZ);
    const logMax = Math.log10(EMI_F_MAX_HZ);
    const frequencies = [];
    const source = [];
    const filtered = [];
    const limit = [];
    let passing = true;
    let worstMarginDb = Infinity;

    for (let i = 0; i < numPoints; i++) {
        const f = 10 ** (logMin + (logMax - logMin) * i / (numPoints - 1));
        const I_n = triangularCurrentSpectrumAmps(f, ripplePeakToPeak, switchingFrequency, dutyCycle);
        const V_lisn_unfiltered = I_n * lineImpedance;
        const att = lcAttenuationLinear(f, inductance, capacitance, lineImpedance);
        const V_lisn_filtered = V_lisn_unfiltered / Math.max(att, 1e-9);

        const dbSrc  = toDbuV(V_lisn_unfiltered);
        const dbFilt = toDbuV(V_lisn_filtered);
        const dbLim  = cisprLimitDbuV(regulatoryStandard, f);

        frequencies.push(f);
        source.push(dbSrc);
        filtered.push(dbFilt);
        limit.push(dbLim);

        const margin = dbLim - dbFilt;
        if (margin < worstMarginDb) worstMarginDb = margin;
        if (margin < 0) passing = false;
    }

    const fc = (inductance > 0 && capacitance > 0)
        ? 1 / (2 * Math.PI * Math.sqrt(inductance * capacitance))
        : null;

    return { frequencies, source, filtered, limit, passing, worstMarginDb, cutoffFrequency: fc };
}
