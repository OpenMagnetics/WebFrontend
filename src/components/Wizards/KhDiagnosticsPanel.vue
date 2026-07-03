<script>
// Shared renderer for the Kirchhoff diagnostics envelope — the ONE shape every converter
// topology emits (Kirchhoff/src/ConverterExtract.cpp::diagnostics):
//   { dutyCycle?, isCcm?, switchingFrequency?, primaryPeakCurrent?, primaryRmsCurrent?,
//     computed: { magnetizingInductance?, turnsRatio?, resonantCapacitance?, extraInductors?[] },
//     magnetics: [{ name, isMain, windings, magnetizingInductance?, turnsRatios?[] }],
//     capacitors: [{ name, capacitance?, ratedVoltage?, role? }],
//     operatingPoints: [{ operatingPointName?, isCcm?,
//                         windings: [{ frequency?, current_peak?, current_rms?, current_offset?,
//                                      current_peakToPeak?, current_dutyCycle?, voltage_peak?,
//                                      voltage_rms?, voltage_peakToPeak? }] }] }
// KH is the master: wizards render this shape as-is instead of the retired per-topology
// MKF diagnostics blocks. Every row is conditional, so the panel degrades gracefully for
// topologies that omit a field.
export default {
    name: 'KhDiagnosticsPanel',
    props: {
        diagnostics: {
            type: Object,
            required: true,
        },
        dataTestLabel: {
            type: String,
            default: 'KhDiagnostics',
        },
    },
    computed: {
        d() { return this.diagnostics || {}; },
        computedVals() { return this.d.computed || {}; },
        mainOp() { return (this.d.operatingPoints || [])[0] || null; },
        summaryRows() {
            // [key, label, value] — key gives each row a stable data-cy for tests.
            const rows = [];
            if (this.d.dutyCycle != null) rows.push(['dutyCycle', 'Duty cycle', Number(this.d.dutyCycle).toFixed(3)]);
            if (this.d.isCcm != null) rows.push(['conductionMode', 'Conduction mode', this.d.isCcm ? 'CCM' : 'DCM']);
            if (this.d.switchingFrequency != null) rows.push(['switchingFrequency', 'Switching frequency', this.fmtHz(this.d.switchingFrequency)]);
            if (this.d.primaryPeakCurrent != null) rows.push(['primaryPeakCurrent', 'Primary peak current', this.fmtA(this.d.primaryPeakCurrent)]);
            if (this.d.primaryRmsCurrent != null) rows.push(['primaryRmsCurrent', 'Primary RMS current', this.fmtA(this.d.primaryRmsCurrent)]);
            // Main-magnetic inductance. For an inductor-only topology (buck/boost/PFC/…) this IS the
            // sized power inductance; for transformers it is the magnetizing inductance.
            const mainL = this.computedVals.magnetizingInductance
                ?? (this.computedVals.extraInductors || [])[0]?.inductance;
            if (mainL != null) rows.push(['inductance', 'Inductance', this.fmtH(mainL)]);
            if (this.computedVals.turnsRatio != null) rows.push(['turnsRatio', 'Turns ratio', Number(this.computedVals.turnsRatio).toFixed(3)]);
            if (this.computedVals.resonantCapacitance != null) rows.push(['resonantCapacitance', 'Resonant capacitance', this.fmtF(this.computedVals.resonantCapacitance)]);
            (this.computedVals.extraInductors || []).forEach((ind, i) => {
                if (i === 0 && this.computedVals.magnetizingInductance == null) return; // already shown as "Inductance"
                rows.push([`extraInductor${i}`, `Inductor ${ind.name}`, this.fmtH(ind.inductance)]);
            });
            return rows;
        },
        capacitorRows() {
            return (this.d.capacitors || []).filter(c => c.capacitance != null).map(c => ([
                c.role ? `${c.name} (${c.role})` : c.name,
                `${this.fmtF(c.capacitance)}${c.ratedVoltage != null ? ' / ' + this.fmtV(c.ratedVoltage) : ''}`,
            ]));
        },
        windingRows() {
            if (!this.mainOp || !Array.isArray(this.mainOp.windings)) return [];
            return this.mainOp.windings.map((w, i) => ({
                name: i === 0 ? 'Primary' : `Winding ${i + 1}`,
                iPeak: w.current_peak, iRms: w.current_rms, iPkPk: w.current_peakToPeak,
                iAvg: w.current_offset,
                vPeak: w.voltage_peak, vRms: w.voltage_rms,
            }));
        },
    },
    methods: {
        fmtH(v) { if (v == null) return null; if (v >= 1) return v.toFixed(3) + ' H'; if (v >= 1e-3) return (v * 1e3).toFixed(3) + ' mH'; if (v >= 1e-6) return (v * 1e6).toFixed(2) + ' µH'; return (v * 1e9).toFixed(1) + ' nH'; },
        fmtF(v) { if (v == null) return null; if (v >= 1e-3) return (v * 1e3).toFixed(2) + ' mF'; if (v >= 1e-6) return (v * 1e6).toFixed(2) + ' µF'; if (v >= 1e-9) return (v * 1e9).toFixed(2) + ' nF'; return (v * 1e12).toFixed(1) + ' pF'; },
        fmtHz(v) { if (v == null) return null; if (v >= 1e6) return (v / 1e6).toFixed(2) + ' MHz'; if (v >= 1e3) return (v / 1e3).toFixed(1) + ' kHz'; return v.toFixed(0) + ' Hz'; },
        fmtA(v) { return v == null ? null : Number(v).toFixed(3) + ' A'; },
        fmtV(v) { return v == null ? null : Number(v).toFixed(1) + ' V'; },
    },
};
</script>

<template>
    <div :data-cy="dataTestLabel + '-panel'" :style="{ color: $styleStore.wizard.inputTextColor, fontSize: $styleStore.wizard.inputFontSize }">
        <div
            v-for="([key, label, value]) in summaryRows"
            :key="key"
            class="d-flex justify-content-between"
            :data-cy="dataTestLabel + '-' + key"
            :style="{ padding: '1px 4px' }"
        >
            <span :style="{ fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">{{ label }}</span>
            <span :data-cy="dataTestLabel + '-' + key + '-value'">{{ value }}</span>
        </div>

        <table
            v-if="windingRows.length"
            class="kh-diag-windings"
            :style="{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }"
        >
            <thead>
                <tr>
                    <th :style="{ textAlign: 'left', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }"></th>
                    <th v-for="w in windingRows" :key="w.name" :style="{ textAlign: 'right', padding: '2px 4px', fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">{{ w.name }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="windingRows.some(w => w.iPeak != null)"><td>I peak</td><td v-for="w in windingRows" :key="w.name" :style="{ textAlign: 'right', padding: '1px 4px' }">{{ fmtA(w.iPeak) ?? '—' }}</td></tr>
                <tr v-if="windingRows.some(w => w.iRms != null)"><td>I RMS</td><td v-for="w in windingRows" :key="w.name" :style="{ textAlign: 'right', padding: '1px 4px' }">{{ fmtA(w.iRms) ?? '—' }}</td></tr>
                <tr v-if="windingRows.some(w => w.iAvg != null)"><td>I avg</td><td v-for="w in windingRows" :key="w.name" :style="{ textAlign: 'right', padding: '1px 4px' }">{{ fmtA(w.iAvg) ?? '—' }}</td></tr>
                <tr v-if="windingRows.some(w => w.iPkPk != null)"><td>I ripple (pk-pk)</td><td v-for="w in windingRows" :key="w.name" :style="{ textAlign: 'right', padding: '1px 4px' }">{{ fmtA(w.iPkPk) ?? '—' }}</td></tr>
                <tr v-if="windingRows.some(w => w.vPeak != null)"><td>V peak</td><td v-for="w in windingRows" :key="w.name" :style="{ textAlign: 'right', padding: '1px 4px' }">{{ fmtV(w.vPeak) ?? '—' }}</td></tr>
                <tr v-if="windingRows.some(w => w.vRms != null)"><td>V RMS</td><td v-for="w in windingRows" :key="w.name" :style="{ textAlign: 'right', padding: '1px 4px' }">{{ fmtV(w.vRms) ?? '—' }}</td></tr>
            </tbody>
        </table>

        <div v-if="capacitorRows.length" :style="{ marginTop: '4px' }">
            <div
                v-for="([label, value], i) in capacitorRows"
                :key="'c' + i"
                class="d-flex justify-content-between"
                :style="{ padding: '1px 4px' }"
            >
                <span :style="{ fontSize: $styleStore.wizard.inputLabelFontSize, opacity: 0.85 }">{{ label }}</span>
                <span>{{ value }}</span>
            </div>
        </div>
    </div>
</template>
