<script>
import LineVisualizer from 'WebSharedComponents/Common/LineVisualizer.vue'
import {
    computeEmiSpectrum,
    computeDmcEmiSpectrum,
    EMI_F_MIN_HZ,
    EMI_F_MAX_HZ,
} from '../../composables/useCmcEmiSpectrum.js'

export default {
    name: 'EmiSpectrumView',
    components: { LineVisualizer },
    props: {
        // 'cm' or 'dm'
        mode: { type: String, default: 'cm' },

        switchingFrequency:  { type: Number, default: 100e3 },
        dutyRatio:           { type: Number, default: 0.5 },
        inductance:          { type: Number, required: true },
        lineImpedance:       { type: Number, default: 50 },
        regulatoryStandard:  { type: String, default: 'CISPR 32 Class B' },
        forceUpdate:         { type: Number, default: 0 },

        // CM-only
        voltageSwing:        { type: Number, default: 0 },
        parasiticCap_pF:     { type: Number, default: 0 },
        dvdt_V_ns:           { type: Number, default: 0 },

        // DM-only
        ripplePeakToPeak:    { type: Number, default: 0 },
        capacitance:         { type: Number, default: 0 },
    },
    emits: ['update:switchingFrequency'],
    data() {
        return {
            localSwitchingFreqKHz: this.switchingFrequency / 1e3,
        };
    },
    watch: {
        switchingFrequency(v) { this.localSwitchingFreqKHz = v / 1e3; },
    },
    methods: {
        onFreqChange(ev) {
            const kHz = parseFloat(ev.target.value);
            if (isFinite(kHz) && kHz > 0) {
                this.localSwitchingFreqKHz = kHz;
                this.$emit('update:switchingFrequency', kHz * 1e3);
            }
        },
    },
    computed: {
        effectiveSwitchingFrequency() {
            return this.localSwitchingFreqKHz * 1e3;
        },
        spectrum() {
            const base = {
                switchingFrequency: this.effectiveSwitchingFrequency,
                dutyRatio: this.dutyRatio,
                inductance: this.inductance,
                lineImpedance: this.lineImpedance,
                regulatoryStandard: this.regulatoryStandard,
            };
            if (!this.inductance || this.inductance <= 0) return null;

            if (this.mode === 'dm') {
                if (!this.capacitance || this.capacitance <= 0) return null;
                return computeDmcEmiSpectrum({
                    switchingFrequency: base.switchingFrequency,
                    ripplePeakToPeak:   this.ripplePeakToPeak,
                    dutyCycle:          this.dutyRatio,
                    inductance:         this.inductance,
                    capacitance:        this.capacitance,
                    lineImpedance:      this.lineImpedance,
                    regulatoryStandard: this.regulatoryStandard,
                });
            } else {
                if (!this.voltageSwing) return null;
                return computeEmiSpectrum({
                    ...base,
                    voltageSwing:       this.voltageSwing,
                    parasiticCap_pF:    this.parasiticCap_pF,
                    dvdt_V_ns:          this.dvdt_V_ns,
                });
            }
        },
        chartData() {
            if (!this.spectrum) return [];
            const emi = this.$styleStore?.emiSpectrum || {};
            const cs = getComputedStyle(document.documentElement);
            const sourceColor   = emi.sourceLineColor   || cs.getPropertyValue('--p-danger').trim();
            const filteredColor = emi.filteredLineColor || cs.getPropertyValue('--p-primary').trim();
            const limitColor    = emi.limitLineColor    || cs.getPropertyValue('--p-warning').trim();
            const f = this.spectrum.frequencies;

            const cmLabel = `After CMC (L=${(this.inductance * 1e3).toFixed(2)} mH)`;
            const dmLabel = `After DMC (L=${(this.inductance * 1e6).toFixed(1)} µH, C=${(this.capacitance * 1e6).toFixed(2)} µF)`;
            const sourceLabel = this.mode === 'dm' ? 'DM noise at LISN (unfiltered)' : 'CM noise at LISN (unfiltered)';

            return [
                {
                    label: sourceLabel,
                    data: { x: f, y: this.spectrum.source },
                    colorLabel: sourceColor,
                    type: 'value', position: 'left', unit: 'dBµV', numberDecimals: 1,
                    lineStyle: { type: 'dashed' },
                },
                {
                    label: this.mode === 'dm' ? dmLabel : cmLabel,
                    data: { x: f, y: this.spectrum.filtered },
                    colorLabel: filteredColor,
                    type: 'value', position: 'left', unit: 'dBµV', numberDecimals: 1,
                },
                {
                    label: `${this.regulatoryStandard} limit (QP)`,
                    data: { x: f, y: this.spectrum.limit },
                    colorLabel: limitColor,
                    type: 'value', position: 'left', unit: 'dBµV', numberDecimals: 1,
                },
            ];
        },
        xAxis() {
            return {
                label: 'Frequency',
                colorLabel: 'var(--p-light)',
                type: 'log',
                unit: 'Hz',
                min: EMI_F_MIN_HZ,
                max: EMI_F_MAX_HZ,
            };
        },
        verdictText() {
            if (!this.spectrum) return '';
            const m = this.spectrum.worstMarginDb;
            if (this.spectrum.passing) {
                return `Passes ${this.regulatoryStandard} with ${m.toFixed(1)} dB margin`;
            }
            return `Fails ${this.regulatoryStandard} by ${(-m).toFixed(1)} dB in worst band`;
        },
        verdictColor() {
            return this.spectrum?.passing ? 'var(--p-success)' : 'var(--p-danger)';
        },
        cutoffText() {
            if (this.mode === 'dm') {
                const fc = this.spectrum?.cutoffFrequency;
                if (!fc || !isFinite(fc)) return '';
                if (fc >= 1e6) return `f_c = ${(fc / 1e6).toFixed(2)} MHz`;
                if (fc >= 1e3) return `f_c = ${(fc / 1e3).toFixed(2)} kHz`;
                return `f_c = ${fc.toFixed(0)} Hz`;
            }
            return '';
        },
        titleText() {
            return this.mode === 'dm' ? 'DM conducted-emissions spectrum' : 'CM conducted-emissions spectrum';
        },
        noteText() {
            if (this.mode === 'dm') {
                return `Symmetric-triangle ripple source at ${this.localSwitchingFreqKHz} kHz with ΔI_pp=${this.ripplePeakToPeak.toFixed(2)} A, attenuated by 2nd-order LC into a ${this.lineImpedance} Ω LISN. ESR/ESL parasitics and self-resonance not modelled. For final verification use a certified EMI lab sweep.`;
            }
            const tR = this.dvdt_V_ns > 0 && this.voltageSwing > 0
                ? (this.voltageSwing / (this.dvdt_V_ns * 1e9) * 1e9).toFixed(1)
                : 'N/A';
            return `Ideal trapezoid source at ${this.localSwitchingFreqKHz} kHz, rise ${tR} ns, coupled through ${this.parasiticCap_pF} pF. CMC attenuation modelled as |1 + jωL / (Z_LISN/2)|; self-resonance and ESR not included. For final verification use a certified EMI lab sweep.`;
        },
        textColor() {
            return this.$styleStore?.emiSpectrum?.textColor || 'var(--p-white)';
        },
        bgColor() {
            return this.$styleStore?.emiSpectrum?.bgColor || 'transparent';
        },
        cssVars() {
            const emi = this.$styleStore?.emiSpectrum || {};
            return {
                '--emi-text-color':         emi.textColor         || 'var(--p-white)',
                '--emi-title-color':        emi.titleColor        || 'var(--p-white)',
                '--emi-input-border-color': emi.inputBorderColor  || 'var(--p-secondary)',
                '--emi-cutoff-color':       emi.cutoffTextColor   || 'var(--p-light)',
                '--emi-note-color':         emi.noteTextColor     || 'var(--p-secondary)',
            };
        },
    },
}
</script>

<template>
    <div class="emi-spectrum-view" :style="cssVars">
        <div class="emi-header">
            <div class="emi-title">{{ titleText }}</div>
            <label class="emi-fsw-input">
                f<sub>sw</sub>
                <input type="number"
                       min="1" max="10000" step="1"
                       :value="localSwitchingFreqKHz"
                       @input="onFreqChange" />
                kHz
            </label>
            <div class="emi-cutoff" v-if="cutoffText">{{ cutoffText }}</div>
            <div class="emi-verdict" :style="{ color: verdictColor }">{{ verdictText }}</div>
        </div>

        <LineVisualizer
            v-if="spectrum"
            :data="chartData"
            :xAxisOptions="xAxis"
            :title="''"
            :titleFontSize="14"
            :axisLabelFontSize="10"
            :chartPaddings="{ top: 10, left: 60, right: 20, bottom: 40 }"
            :bgColor="bgColor"
            :textColor="textColor"
            chartStyle="height: 340px"
            :toolbox="false"
            :showPoints="false"
            :showGrid="true"
            :showAxisLines="true"
            :showAxisUnitLabels="true"
            :forceUpdate="forceUpdate"
            :showArea="false"
        />

        <div class="emi-note">
            {{ noteText }}
        </div>
    </div>
</template>

<style scoped>
.emi-spectrum-view {
    width: 100%;
    padding: 6px 10px;
}
.emi-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 6px;
    font-size: 13px;
    flex-wrap: wrap;
}
.emi-fsw-input {
    font-size: 12px;
    color: var(--emi-text-color);
    opacity: 0.85;
}
.emi-fsw-input input {
    width: 70px;
    margin: 0 4px;
    padding: 1px 4px;
    background: transparent;
    border: 1px solid var(--emi-input-border-color);
    border-radius: 3px;
    color: var(--emi-text-color);
    font-size: 12px;
}
.emi-title {
    font-weight: 500;
    color: var(--emi-title-color);
}
.emi-cutoff {
    font-size: 12px;
    color: var(--emi-cutoff-color);
    opacity: 0.85;
}
.emi-verdict {
    font-weight: 600;
    font-size: 12px;
}
.emi-note {
    margin-top: 4px;
    font-size: 11px;
    color: var(--emi-note-color);
    font-style: italic;
    line-height: 1.3;
}
</style>
