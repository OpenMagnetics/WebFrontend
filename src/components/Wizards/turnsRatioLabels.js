// Labels for per-output turns-ratio inputs. Every converter wizard sends turns ratios as
// Np/Ns (primary turns divided by that output's secondary turns): Kirchhoff sizes them as
// n = Vin·k/(Vout+Vd) and MKF's Coil::get_turns_ratios() returns N_primary / N_winding.
// With several outputs, say which output's secondary the ratio refers to: Ns1 is the secondary of
// output 1, Ns2 of output 2, … (the Dimension label basis is 9rem; "Turns ratio, output 2 (Np/Ns)" or
// "Turns ratio (Np/Ns2)" is cut off with an ellipsis in the outputs card).
export function outputTurnsRatioTitle(index, numberOutputs) {
    if (numberOutputs > 1) return `Turns ratio Np/Ns${index + 1}`;
    return 'Turns ratio (Np/Ns)';
}
