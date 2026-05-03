<script>
import LineVisualizer from 'WebSharedComponents/Common/LineVisualizer.vue'
import { computeDmcEmiSpectrum, EMI_F_MIN_HZ, EMI_F_MAX_HZ } from '../../composables/useDmcEmiSpectrum.js'

export default {
    name: 'DmcEmiSpectrumView',
    components: { LineVisualizer },
    props: {
        switchingFrequency:  { type: Number, default: 100e3 },
        ripplePeakToPeak:    { type: Number, required: true },
        dutyCycle:           { type: Number, default: 0.5 },
        inductance:          { type: Number, required: true },
        capacitance:         { type: Number, required: true },
        lineImpedance:       { type: Number, default: 50 },
        regulatoryStandard:  { type: String, default: 'CISPR 32 Class B' },
        forceUpdate:         { type: Number, default: 0 },
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
            if (!this.inductance || this.inductance <= 0) return null;
            if (!this.capacitance || this.capacitance <= 0) return null;
            return computeDmcEmiSpectrum({
                switchingFrequency: this.effectiveSwitchingFrequency,
                ripplePeakToPeak:   this.ripplePeakToPeak,
                dutyCycle:          this.dutyCycle,
                inductance:         this.inductance,
                capacitance:        this.capacitance,
                lineImpedance:      this.lineImpedance,
                regulatoryStandard: this.regulatoryStandard,
            });
        },
        chartData() {
            if (!this.spectrum) return [];
            const sourceColor   = '#ff7a7a';
            const filteredColor = this.$styleStore?.operatingPoints?.voltageGraph?.color || '#539796';
            const limitColor    = '#f5c518';
            const f = this.spectrum.frequencies;
            return [
                {
                    label: 'DM noise at LISN (unfiltered)',
                    data: { x: f, y: this.spectrum.source },
                    colorLabel: sourceColor,
                    type: 'value', position: 'left', unit: 'dBµV', numberDecimals: 1,
                    lineStyle: { type: 'dashed' },
                },
                {
                    label: `After DMC (L=${(this.inductance * 1e6).toFixed(1)} µH, C=${(this.capacitance * 1e6).toFixed(2)} µF)`,
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
                colorLabel: '#d4d4d4',
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
            return this.spectrum?.passing ? '#7ad07a' : '#ff7a7a';
        },
        cutoffText() {
            const fc = this.spectrum?.cutoffFrequency;
            if (!fc || !isFinite(fc)) return '';
            if (fc >= 1e6) return `f_c = ${(fc / 1e6).toFixed(2)} MHz`;
            if (fc >= 1e3) return `f_c = ${(fc / 1e3).toFixed(2)} kHz`;
            return `f_c = ${fc.toFixed(0)} Hz`;
        },
        textColor() {
            return this.$styleStore?.wizard?.inputTextColor?.color || '#ffffff';
        },
        bgColor() {
            return this.$styleStore?.theme?.light || 'transparent';
        },
    },
}
</script>

<template>
    <div class="emi-spectrum-view">
        <div class="emi-header">
            <div class="emi-title">DM conducted-emissions spectrum</div>
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
        />

        <div class="emi-note">
            Symmetric-triangle ripple source at {{ localSwitchingFreqKHz }} kHz with
            ΔI<sub>pp</sub>={{ ripplePeakToPeak.toFixed(2) }} A, attenuated by 2nd-order LC into a
            {{ lineImpedance }} Ω LISN. ESR/ESL parasitics and self-resonance not modelled.
            For final verification use a certified EMI lab sweep.
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
    color: var(--om-white);
    opacity: 0.85;
}
.emi-fsw-input input {
    width: 70px;
    margin: 0 4px;
    padding: 1px 4px;
    background: transparent;
    border: 1px solid #666;
    border-radius: 3px;
    color: var(--om-white);
    font-size: 12px;
}
.emi-title {
    font-weight: 500;
    color: var(--om-white);
}
.emi-cutoff {
    font-size: 12px;
    color: #d4d4d4;
    opacity: 0.85;
}
.emi-verdict {
    font-weight: 600;
    font-size: 12px;
}
.emi-note {
    margin-top: 4px;
    font-size: 11px;
    color: #888;
    font-style: italic;
    line-height: 1.3;
}
</style>
