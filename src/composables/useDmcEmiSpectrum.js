/**
 * Closed-form EMI-spectrum model for the DMC wizard.
 *
 * DM mechanism:
 *   - The converter's input loop sources a triangular (or trapezoidal) ripple
 *     current at f_sw with peak-to-peak amplitude ΔI_pp. Its Fourier envelope
 *     falls off at –40 dB/dec for f > f_sw (1/f² for symmetric triangle).
 *   - This noise current is filtered by the DM EMI filter (LC: series L,
 *     shunt C to the common-mode reference). Above f_c = 1/(2π·√(LC)) the LC
 *     transfer rolls off at –40 dB/dec.
 *   - The LISN (Z_LISN, default 50 Ω) presents the measurement impedance.
 *
 * References: Erickson & Maksimović, *Fundamentals of Power Electronics*,
 * §10 (input filter); Würth ANP024 §3 (DM filter design); CISPR 32 limit
 * envelopes (same tables used by CMC, since the regulatory limits cover both
 * CM and DM components).
 *
 * Returns three spectra in dBµV at the LISN: source (no filter), filtered
 * (with the DMC LC), and the QP regulatory limit. All inputs in SI units
 * unless suffixed.
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

// Symmetric-triangle current spectrum envelope. For ΔI_pp peak-to-peak at
// f_sw the n-th harmonic has |I_n| = (8/π²)·(ΔI_pp/2)·sinc²(n·d·π) ≈
// 4·ΔI_pp/π² · 1/n² for symmetric duty (d=0.5). We sample the continuous
// envelope so the consumer can plot a smooth curve.
function trianglularCurrentSpectrumAmps(f, deltaIpp, fSw, duty) {
    const n = f / fSw;
    if (n < 1) {
        // Below the fundamental the envelope is dominated by the DC
        // component, which the LISN's blocking cap rejects. Treat as small.
        return 0;
    }
    const d = (duty != null && duty > 0 && duty < 1) ? duty : 0.5;
    // Asymmetric-triangle Fourier coefficient amplitude:
    //   |c_n| = (ΔI_pp / π²) · sinc²(n π d) / (d (1-d))
    // For d=0.5 this collapses to (4 ΔI_pp / π²) · sinc²(n π / 2), and odd
    // harmonics give the dominant (8/π² / n²) envelope.
    const num = (deltaIpp / (Math.PI * Math.PI)) * (sinc(Math.PI * n * d) ** 2);
    return num / (d * (1 - d));
}

// LC low-pass filter transfer magnitude with shunt cap on the LISN side and
// series L on the source side, with finite Z_LISN load:
//   H(jω) = 1 / (1 - ω²LC + jωL/Z_LISN)
// Returns the magnitude (linear).
function lcAttenuationLinear(f, L, C, Z_LISN) {
    const w  = 2 * Math.PI * f;
    const re = 1 - w * w * L * C;
    const im = (w * L) / Z_LISN;
    return Math.sqrt(re * re + im * im);
}

const toDbuV = (v_rms) => 20 * Math.log10(Math.max(Math.abs(v_rms), 1e-12) / DBUV_REF);

/**
 * @param {Object} p
 * @param {number} p.switchingFrequency   — f_sw (Hz)
 * @param {number} p.ripplePeakToPeak     — ΔI_pp (A)
 * @param {number} p.dutyCycle            — duty, default 0.5
 * @param {number} p.inductance           — DMC L (H)
 * @param {number} p.capacitance          — filter C (F)
 * @param {number} p.lineImpedance        — LISN Z (Ω), default 50
 * @param {string} p.regulatoryStandard   — limit table key
 * @param {number} p.numPoints            — frequency grid points, default 200
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
        // Noise current amplitude at f.
        const I_n = trianglularCurrentSpectrumAmps(f, ripplePeakToPeak, switchingFrequency, dutyCycle);
        // Voltage at LISN with no filter: I_n flows through Z_LISN.
        const V_lisn_unfiltered = I_n * lineImpedance;
        // Voltage at LISN with the LC: divide by the LC attenuation magnitude.
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
