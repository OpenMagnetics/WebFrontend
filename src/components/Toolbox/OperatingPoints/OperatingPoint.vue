<script setup>
import { useMasStore } from '../../../stores/mas'
import { useTaskQueueStore } from '../../../stores/taskQueue'
import { useLoadCorrectionsStore } from '../../../stores/loadCorrections'
import OperatingPointManual from './OperatingPointManual.vue'
import OperatingPointHarmonics from './OperatingPointHarmonics.vue'
import OperatingPointCircuitSimulator from './OperatingPointCircuitSimulator.vue'
import { roundWithDecimals, deepCopy, removeTrailingZeroes, combinedStyle } from 'WebSharedComponents/assets/js/utils.js'
import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'

import { defaultOperatingPointExcitation, defaultPrecision, defaultSinusoidalNumberPoints, minimumMaximumScalePerParameter } from 'WebSharedComponents/assets/js/defaults.js'
import { tooltipsMagneticSynthesisOperatingPoints } from 'WebSharedComponents/assets/js/texts.js'

</script>
<script>

export default {
    emits: ["updatedSignal", "updatedWaveform", "importedWaveform", "selectedManualOrImported"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        currentOperatingPointIndex: {
            type: Number,
            default: 0,
        },
        currentWindingIndex: {
            type: Number,
            default: 0,
        },
        enableManual: {
            type: Boolean,
            default: true,
        },
        enableCircuitSimulatorImport: {
            type: Boolean,
            default: true,
        },
        enableHarmonicsList: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        if (masStore.mas.inputs.operatingPoints.length == 0) {
            masStore.mas.inputs.operatingPoints.push(
                {
                    name: "Op. Point No. 1",
                    conditions: {ambientTemperature: 42},
                    excitationsPerWinding: [deepCopy(defaultOperatingPointExcitation)]
                }
            );
        }

        return {
            masStore,
            taskQueueStore,
            loadCorrectionsStore: useLoadCorrectionsStore(),
            loadedFile: "",
            importErrorMessage: "",
            importErrorTimeout: null,
            // Each source's explanation, shown as the option's tooltip.
            modeHints: {
                csv: 'Upload a .csv, .txt or .tsv file with time, current and voltage columns, then pick which column is which.',
                manual: 'Choose a waveform shape for current and voltage and set its frequency, duty cycle, peak to peak and offset.',
                harmonics: 'Enter the frequency and amplitude of each harmonic of the current and the voltage.',
            },
        }
    },
    computed: {
        // What the load changed in this winding's stored waveforms (loadMasIntoApp.js,
        // placeWaveformsOnTheirPeriod), shown whichever editor the point is in.
        loadCorrections() {
            return this.loadCorrectionsStore.of(this.currentOperatingPointIndex, this.currentWindingIndex);
        },
    },
    watch: { 
    },
    created () {

    },
    mounted () {
        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationProcessed") {
                const signalDescriptor = action.args[0];
            }
            if (action.name == "updatedInputExcitationWaveformUpdatedFromGraph") {
                const signalDescriptor = action.args[0];
            }
        })
    },
    beforeUnmount() {
        this.clearImportError();
    },
    methods: {
        // Show the import error as a floating box that auto-dismisses after 10s.
        // A fresh error restarts the timer so the latest message stays visible
        // for the full duration.
        setImportError(message) {
            this.importErrorMessage = message;
            if (this.importErrorTimeout != null) {
                clearTimeout(this.importErrorTimeout);
            }
            this.importErrorTimeout = setTimeout(() => {
                this.importErrorMessage = "";
                this.importErrorTimeout = null;
            }, 10000);
        },
        clearImportError() {
            if (this.importErrorTimeout != null) {
                clearTimeout(this.importErrorTimeout);
                this.importErrorTimeout = null;
            }
            this.importErrorMessage = "";
        },
        updatedWaveform(signalDescriptor) {
            this.$emit('updatedWaveform', signalDescriptor);
        },
        importedWaveform() {
            this.$emit('importedWaveform');
        },
        async extractMapColumnNames(file) {
            try {
                const numberWindings = this.masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
                const frequency = this.masStore.mas.inputs.operatingPoints[this.currentOperatingPointIndex].excitationsPerWinding[this.currentWindingIndex].frequency;
                const result = await this.taskQueueStore.extractMapColumnNames(file, numberWindings, frequency);
                this.$stateStore.operatingPointsCircuitSimulator.columnNames[this.currentOperatingPointIndex] = result;
            }
            catch (error) {
                this.setImportError("Could not auto-detect columns: " + (error?.message || error));
                console.error(error)
            }
        },
        async extractAllColumnNames(file) {
            try {
                const result = await this.taskQueueStore.extractColumnNames(file);
                this.$stateStore.operatingPointsCircuitSimulator.allLastReadColumnNames = result;
            }
            catch (error) {
                this.setImportError("Could not read columns from the uploaded file: " + (error?.message || error));
                console.error(error)
            }
        },
        onMASFileTypeSelected(event) {
            const fr = new FileReader();

            fr.onload = e => {
                const data = e.target.result;
            }
            fr.readAsText(this.$refs["OperatingPoint-MAS-upload-ref"].files.item(0));
        },
        onCircuitSimulatorFileTypeSelected(event) {
            this.clearImportError();
            const fileObj = this.$refs["OperatingPoint-CircuitSimulator-upload-ref"].files.item(0);
            if (!fileObj) return;
            const allowedExt = /\.(csv|txt|tsv)$/i;
            if (!allowedExt.test(fileObj.name)) {
                this.setImportError("Unsupported file type: " + fileObj.name +
                    ". Please upload a .csv, .txt, or .tsv file exported from your circuit simulator.");
                return;
            }
            const fr = new FileReader();

            fr.onload = async e => {
                this.loadedFile = e.target.result;
                await this.extractAllColumnNames(this.loadedFile);
                await this.extractMapColumnNames(this.loadedFile);
                this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.CircuitSimulatorImport;
            }
            fr.readAsText(fileObj);
        },
        onHarmoncsTypeSelected(event) {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.HarmonicsList;
            this.$emit("selectedManualOrImported")
        },
        onManualTypeSelected(event) {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.Manual;
            this.$emit("selectedManualOrImported")
        },
        onCircuitSimulatorTypeSelected(event) {
            this.$refs['OperatingPoint-CircuitSimulator-upload-ref'].click()
        },
        clearMode(event) {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = null
        },
        switchToHarmonics() {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.HarmonicsList;
        },
        switchToManual() {
            this.$stateStore.operatingPoints.modePerPoint[this.currentOperatingPointIndex] = this.$stateStore.OperatingPointsMode.Manual;
        },
    }
}
</script>
<template>
    <div class="op-detail-panel">
        <Transition name="op-import-error-fade">
            <div v-if="importErrorMessage" class="op-import-error-toast" role="alert">
                <i class="pi pi-exclamation-triangle op-import-error-icon"></i>
                <label data-cy="OperatingPoint-import-error" class="op-import-error-text">
                    {{ importErrorMessage }}
                </label>
                <button
                    type="button"
                    class="op-import-error-close"
                    aria-label="Dismiss error"
                    data-cy="OperatingPoint-import-error-close"
                    @click="clearImportError"
                >
                    <i class="pi pi-times"></i>
                </button>
            </div>
        </Transition>
        <div class="op-detail-body">
            <div v-if="loadCorrections.length > 0" class="op-load-correction" role="status" :data-cy="dataTestLabel + '-load-correction'">
                <i class="pi pi-info-circle"></i>
                <div>
                    <div>Corrected when the file was loaded:</div>
                    <div v-for="(correction, index) in loadCorrections" :key="index">{{ correction.message.charAt(0).toUpperCase() + correction.message.slice(1) }}.</div>
                </div>
            </div>
            <OperatingPointManual
                v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] === $stateStore.OperatingPointsMode.Manual"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                @updatedWaveform="updatedWaveform"
                @updatedSignal="$emit('updatedSignal')"
                @clearMode="clearMode"
                @switchToHarmonics="switchToHarmonics"
            />
            <OperatingPointCircuitSimulator
                v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] === $stateStore.OperatingPointsMode.CircuitSimulatorImport"
                :loadedFile="loadedFile"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                :allColumnNames="$stateStore.operatingPointsCircuitSimulator.allLastReadColumnNames"
                @updatedSignal="$emit('updatedSignal')"
                @clearMode="clearMode"
                @importedWaveform="importedWaveform"
            />
            <OperatingPointHarmonics
                v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] === $stateStore.OperatingPointsMode.HarmonicsList"
                :currentOperatingPointIndex="currentOperatingPointIndex"
                :currentWindingIndex="currentWindingIndex"
                @updatedSignal="$emit('updatedSignal')"
                @clearMode="clearMode"
                @switchToManual="switchToManual"
            />
            <div v-if="$stateStore.operatingPoints.modePerPoint[currentOperatingPointIndex] == null" class="op-mode-select" data-op-col="mode">
                <h2 class="op-mode-title" data-op-title :data-cy="dataTestLabel + '-current-title'">
                    {{masStore.mas.inputs.operatingPoints[currentOperatingPointIndex].name}}
                </h2>
                <p class="op-mode-prompt">
                    Where do you want to import your operating point from?
                </p>
                <div class="op-mode-buttons">
                    <input type="file" id="OperatingPoint-CircuitSimulator-upload-input" ref="OperatingPoint-CircuitSimulator-upload-ref" accept=".csv,.txt,.tsv,text/csv,text/plain" @change="onCircuitSimulatorFileTypeSelected" style="display:none" hidden/>
                    <div v-if="enableManual" class="op-mode-option" v-tooltip.top="modeHints.csv">
                    <button
                        data-cy="OperatingPoint-source-Manual-button"
                        type="button"
                        @click="onCircuitSimulatorTypeSelected"
                        class="op-mode-btn"
                        :aria-describedby="'OperatingPoint-mode-hint-csv'"
                        v-tooltip.top.focus="modeHints.csv"
                    >
                        <!-- Sampled points: what a simulator export is. -->
                        <svg class="op-mode-glyph" viewBox="0 0 64 32" aria-hidden="true">
                            <path class="op-glyph-axis" d="M2 16 H62" />
                            <g class="op-glyph-current">
                                <circle cx="5" cy="24" r="1.7" /><circle cx="11" cy="20" r="1.7" /><circle cx="17" cy="16" r="1.7" />
                                <circle cx="23" cy="12" r="1.7" /><circle cx="29" cy="8" r="1.7" /><circle cx="35" cy="11" r="1.7" />
                                <circle cx="41" cy="14.5" r="1.7" /><circle cx="47" cy="18" r="1.7" /><circle cx="53" cy="21.5" r="1.7" />
                                <circle cx="59" cy="25" r="1.7" />
                            </g>
                        </svg>
                        <span class="op-mode-text">
                            <span class="op-mode-name">Circuit simulator export file or CSV</span>
                            <span id="OperatingPoint-mode-hint-csv" class="op-mode-hint" aria-hidden="true">{{ modeHints.csv }}</span>
                        </span>
                        <i class="pi pi-upload op-mode-go"></i>
                    </button>
                    </div>
                    <div v-if="enableCircuitSimulatorImport" class="op-mode-option" v-tooltip.top="modeHints.manual">
                    <button
                        data-cy="OperatingPoint-source-Manual-button"
                        type="button"
                        @click="onManualTypeSelected"
                        class="op-mode-btn"
                        :aria-describedby="'OperatingPoint-mode-hint-manual'"
                        v-tooltip.top.focus="modeHints.manual"
                    >
                        <!-- A drawn waveform: triangle current over a square voltage. -->
                        <svg class="op-mode-glyph" viewBox="0 0 64 32" aria-hidden="true">
                            <path class="op-glyph-axis" d="M2 16 H62" />
                            <path class="op-glyph-voltage" d="M3 9 H23 V23 H43 V9 H61" />
                            <path class="op-glyph-current" d="M3 25 L23 7 L43 25 L61 9" />
                        </svg>
                        <span class="op-mode-text">
                            <span class="op-mode-name">I will define it manually</span>
                            <span id="OperatingPoint-mode-hint-manual" class="op-mode-hint" aria-hidden="true">{{ modeHints.manual }}</span>
                        </span>
                        <i class="pi pi-chevron-right op-mode-go"></i>
                    </button>
                    </div>
                    <div v-if="enableHarmonicsList" class="op-mode-option" v-tooltip.top="modeHints.harmonics">
                    <button
                        data-cy="OperatingPoint-source-Manual-button"
                        type="button"
                        @click="onHarmoncsTypeSelected"
                        class="op-mode-btn"
                        :aria-describedby="'OperatingPoint-mode-hint-harmonics'"
                        v-tooltip.top.focus="modeHints.harmonics"
                    >
                        <!-- A spectrum: a fundamental and falling harmonics. -->
                        <svg class="op-mode-glyph" viewBox="0 0 64 32" aria-hidden="true">
                            <path class="op-glyph-axis" d="M2 29 H62" />
                            <path class="op-glyph-bars" d="M8 29 V20 M18 29 V4 M28 29 V16 M38 29 V21 M48 29 V24 M58 29 V26" />
                        </svg>
                        <span class="op-mode-text">
                            <span class="op-mode-name">I want to introduce a list of harmonics</span>
                            <span id="OperatingPoint-mode-hint-harmonics" class="op-mode-hint" aria-hidden="true">{{ modeHints.harmonics }}</span>
                        </span>
                        <i class="pi pi-chevron-right op-mode-go"></i>
                    </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.op-load-correction {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    margin: 0 0 0.75rem;
    padding: 0.4rem 0.6rem;
    background: rgb(var(--p-warning-rgb) / 0.12);
    border: 1px solid rgb(var(--p-warning-rgb) / 0.4);
    border-radius: 8px;
    color: var(--p-warning);
    font-size: 0.78rem;
    line-height: 1.3;
}

/* The editor sheet: same panel as the operating point list, without the
   accent stripe (as on Design Requirements). */
.op-detail-panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: linear-gradient(180deg, var(--op-panel-1) 0%, var(--op-panel-2) 100%);
    border: 1px solid var(--op-border);
    border-radius: 14px;
    box-shadow:
        0 6px 20px rgba(var(--p-black-rgb), 0.5),
        inset 0 1px 0 rgba(var(--p-white-rgb), 0.06);
    overflow: hidden;
}

.op-detail-body {
    flex: 1;
    min-width: 0;
    padding: 0;
}
.op-detail-body > .op-load-correction {
    margin: 0.85rem var(--op-gutter) 0;
}

/* ============ Choosing where the operating point comes from ============ */
.op-mode-select {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    max-width: 44rem;
    padding: 1rem var(--op-gutter) 1.25rem;
}

.op-mode-title {
    margin: 0;
    color: var(--p-primary);
    font-size: 1.15rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 1.3;
}

.op-mode-prompt {
    margin: 0.2rem 0 0.9rem;
    color: var(--op-muted);
    font-size: 0.9rem;
    line-height: 1.4;
}

/* One list of three choices, each saying what it is for. */
.op-mode-buttons {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--op-border);
    border-radius: 12px;
    overflow: hidden;
}

button.op-mode-btn {
    display: flex;
    align-items: center;
    gap: 1rem;
    width: 100%;
    margin: 0;
    padding: 0.8rem 1rem;
    background: transparent;
    border: 0;
    border-radius: 0;
    color: var(--op-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
}

.op-mode-option + .op-mode-option {
    border-top: 1px solid var(--op-rule);
}

button.op-mode-btn:hover {
    background: rgba(var(--p-primary-rgb), 0.1);
}

button.op-mode-btn:focus-visible {
    outline: 2px solid var(--p-primary);
    outline-offset: -2px;
}

.op-mode-glyph {
    flex: 0 0 auto;
    width: 4rem;
    height: 2rem;
    padding: 0.2rem 0.25rem;
    background: rgba(var(--p-black-rgb), 0.25);
    border: 1px solid var(--op-rule);
    border-radius: 7px;
    overflow: visible;
}
.op-glyph-axis {
    stroke: rgba(var(--p-white-rgb), 0.2);
    stroke-width: 1;
    fill: none;
}
.op-glyph-current {
    stroke: var(--p-warning);
    fill: var(--p-warning);
    stroke-width: 0;
}
path.op-glyph-current {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
}
.op-glyph-voltage {
    fill: none;
    stroke: var(--p-info);
    stroke-width: 2;
    stroke-linejoin: round;
}
.op-glyph-bars {
    fill: none;
    stroke: var(--p-primary);
    stroke-width: 4;
}

.op-mode-text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1 1 auto;
    min-width: 0;
}

.op-mode-name {
    font-size: 0.98rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--op-text);
}

/* The hint is the option's tooltip; this copy is its aria-describedby text. */
.op-mode-hint {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.op-mode-go {
    flex: 0 0 auto;
    font-size: 0.8rem;
    color: var(--op-faint);
    transition: color 0.15s, transform 0.15s;
}
button.op-mode-btn:hover .op-mode-go {
    color: var(--op-accent-text);
    transform: translateX(2px);
}

@media (prefers-reduced-motion: reduce) {
    button.op-mode-btn, .op-mode-go { transition: none; }
    button.op-mode-btn:hover .op-mode-go { transform: none; }
}

@media (max-width: 600px) {
    button.op-mode-btn {
        gap: 0.75rem;
        padding: 0.75rem 0.8rem;
    }
    .op-mode-glyph {
        width: 3rem;
        height: 1.6rem;
    }
}

/* ============ The three editors (manual, harmonics, file import) ============
   They are children of this panel and share one layout, defined once here:
   a title row, then inputs on the left and results on the right, each
   section a cell on the sheet with its title on the cell's gutter. */
.op-detail-body {
    container: op-editor / inline-size;
}

.op-detail-body :deep(.op-editor-head) {
    padding: 0.9rem var(--op-gutter) 0.7rem;
    border-bottom: 1px solid var(--op-rule);
}
.op-detail-body :deep(.op-editor-title) {
    margin: 0;
    color: var(--p-primary);
    font-size: 1.15rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 1.3;
}
.op-detail-body :deep(.op-editor-sub) {
    margin: 0.15rem 0 0;
    font-size: 0.86rem;
    color: var(--op-muted);
}

.op-detail-body :deep(.op-editor-grid) {
    display: grid;
    grid-template-columns: minmax(18rem, 26rem) minmax(0, 1fr);
    align-items: start;
}
.op-detail-body :deep(.op-editor-inputs) {
    min-width: 0;
    border-right: 1px solid var(--op-rule);
}
.op-detail-body :deep(.op-editor-results) {
    min-width: 0;
    max-width: 58rem;
    padding: 0.75rem var(--op-gutter) 1rem;
}
@container op-editor (max-width: 52rem) {
    .op-detail-body :deep(.op-editor-grid) {
        grid-template-columns: minmax(0, 1fr);
    }
    .op-detail-body :deep(.op-editor-inputs) {
        border-right: 0;
        border-bottom: 1px solid var(--op-rule);
    }
}

/* A section of inputs: a cell, its title on the gutter, a short coloured
   marker beside the title in the signal's chart colour. */
.op-detail-body :deep(.op-cell) {
    position: relative;
    padding: 0.75rem var(--op-gutter) 0.85rem;
    box-shadow: inset 0 -1px 0 var(--op-rule);
}
.op-detail-body :deep(.op-cell)::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0.85rem;
    width: 3px;
    height: 1.2rem;
    border-radius: 0 2px 2px 0;
    background: var(--op-cell-colour, var(--p-primary));
}
.op-detail-body :deep(.op-cell-current) {
    --op-cell-colour: var(--p-warning);
}
.op-detail-body :deep(.op-cell-voltage) {
    --op-cell-colour: var(--p-info);
}
.op-detail-body :deep(.op-cell-title) {
    display: block;
    margin: 0 0 0.45rem;
    font-size: 0.98rem;
    font-weight: 650;
    line-height: 1.3;
    color: var(--op-cell-colour, var(--p-primary));
}
.op-detail-body :deep(.op-cell-note) {
    margin: -0.15rem 0 0.55rem;
    font-size: 0.84rem;
    line-height: 1.45;
    color: var(--op-muted);
}
.op-detail-body :deep(.op-cell-link) {
    display: inline;
    margin-left: 0.25rem;
    padding: 0;
    background: none;
    border: 0;
    font: inherit;
    font-weight: 600;
    color: var(--op-accent-text);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
}
.op-detail-body :deep(.op-cell-link:focus-visible) {
    outline: 2px solid var(--p-primary);
    outline-offset: 2px;
}
/* A derived signal: its fields are shown but not editable; the note above
   them, which hands the signal back, stays at full strength. */
.op-detail-body :deep(.op-cell-derived .op-cell-body) {
    opacity: 0.5;
    pointer-events: none;
}
.op-detail-body :deep(.op-cell-issue),
.op-detail-body :deep(.op-cell-error) {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    margin-top: 0.6rem;
    padding: 0.4rem 0.6rem;
    background: rgb(var(--p-danger-rgb) / 0.1);
    border: 1px solid rgb(var(--p-danger-rgb) / 0.4);
    border-radius: 8px;
    color: var(--p-danger);
    font-size: 0.8rem;
    line-height: 1.35;
    white-space: pre-wrap;
}

/* ---- Fields inside a cell ----
   The shared editors bring grid gutters, centring and 1.15rem labels.
   In a cell every field is one row: label on the left, value on the right,
   one field height. */
.op-detail-body :deep(.op-cell-body .container-flex),
.op-detail-body :deep(.op-cell-body .container),
.op-detail-body :deep(.op-cell-body .row),
.op-detail-body :deep(.op-cell-body .grid) {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: none !important;
}
.op-detail-body :deep(.op-cell-body .row > [class*="col-"]),
.op-detail-body :deep(.op-cell-body .dim-container),
.op-detail-body :deep(.op-cell-body .efl-container) {
    padding-left: 0 !important;
    padding-right: 0 !important;
}
.op-detail-body :deep(.op-cell-body .dim-container),
.op-detail-body :deep(.op-cell-body .efl-container) {
    margin: 0 !important;
    padding-top: 0.2rem !important;
    padding-bottom: 0.2rem !important;
}
.op-detail-body :deep(.op-cell-body .dim-row),
.op-detail-body :deep(.op-cell-body .efl-row) {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 0.75rem !important;
    margin: 0 !important;
    padding: 0 !important;
}
.op-detail-body :deep(.op-cell-body .dim-label),
.op-detail-body :deep(.op-cell-body .efl-label) {
    flex: 0 0 8.5rem !important;
    width: 8.5rem !important;
    max-width: 8.5rem !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.86rem !important;
    font-weight: 500 !important;
    line-height: 1.25 !important;
    color: var(--op-muted) !important;
    text-align: left !important;
    background: transparent !important;
}
.op-detail-body :deep(.op-cell-body .dim-value-row),
.op-detail-body :deep(.op-cell-body .efl-select) {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    width: auto !important;
    max-width: 14rem !important;
    margin: 0 !important;
    padding: 0 !important;
}
.op-detail-body :deep(.op-cell-body .p-inputtext),
.op-detail-body :deep(.op-cell-body .p-select),
.op-detail-body :deep(.op-cell-body .p-inputgroupaddon) {
    height: var(--op-field-h) !important;
    font-size: 0.875rem !important;
}
.op-detail-body :deep(.op-cell-body .p-select-label) {
    font-size: 0.875rem !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    display: flex !important;
    align-items: center !important;
}
.op-detail-body :deep(.p-inputtext:not(:focus):not(:disabled)),
.op-detail-body :deep(.p-select:not(.p-focus):not(.p-disabled)) {
    border-color: var(--op-field-border) !important;
}
@container op-editor (max-width: 24rem) {
    .op-detail-body :deep(.op-cell-body .dim-label),
    .op-detail-body :deep(.op-cell-body .efl-label) {
        flex-basis: 6.5rem !important;
        width: 6.5rem !important;
    }
}

/* ---- Actions at the foot of the inputs: quiet ---- */
.op-detail-body :deep(.op-editor-actions) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.85rem var(--op-gutter) 1rem;
}
.op-detail-body :deep(button.op-action) {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 2rem;
    margin: 0;
    padding: 0 0.75rem;
    background: transparent;
    border: 1px solid rgba(var(--p-white-rgb), 0.22);
    border-radius: 8px;
    color: var(--op-muted);
    font: inherit;
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.op-detail-body :deep(button.op-action i) {
    font-size: 0.75rem;
}
.op-detail-body :deep(button.op-action:hover:not(:disabled)) {
    color: var(--op-text);
    border-color: rgba(var(--p-white-rgb), 0.4);
    background: rgba(var(--p-white-rgb), 0.05);
}
.op-detail-body :deep(button.op-action-main) {
    color: var(--op-accent-text);
    border-color: rgba(var(--p-primary-rgb), 0.6);
}
.op-detail-body :deep(button.op-action-main:hover:not(:disabled)) {
    color: var(--op-text);
    background: rgba(var(--p-primary-rgb), 0.15);
    border-color: var(--p-primary);
}
/* The one filled button: confirming the imported columns is the step's action. */
.op-detail-body :deep(button.op-action-filled) {
    color: var(--p-dark);
    background: var(--p-primary);
    border-color: var(--p-primary);
}
.op-detail-body :deep(button.op-action-filled:hover:not(:disabled)) {
    color: var(--p-dark);
    background: color-mix(in srgb, var(--p-primary) 85%, var(--p-white));
}
.op-detail-body :deep(button.op-action:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
}
.op-detail-body :deep(button.op-action:focus-visible) {
    outline: 2px solid var(--p-primary);
    outline-offset: 1px;
}

/* ---- Results column: charts sit on the sheet ---- */
.op-detail-body :deep(.op-editor-results canvas) {
    border-radius: 8px;
}
.op-detail-body :deep(.op-editor-results > .op-chart) {
    padding: 0 !important;
    margin: 0 0 0.6rem !important;
}

/* Current and voltage outputs side by side; one column when narrow. */
.op-detail-body :deep(.op-outputs-pair) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 1.5rem;
}
@container op-editor (max-width: 40rem) {
    .op-detail-body :deep(.op-outputs-pair) {
        grid-template-columns: minmax(0, 1fr);
    }
}

/* ---- Inducing one signal from the other: a quiet secondary action in
   the cell's own signal colour, not a filled bar. ---- */
.op-detail-body :deep(button.op-induce) {
    display: inline-flex;
    flex: 0 0 auto;
    align-self: flex-start;
    align-items: center;
    gap: 0.4rem;
    width: auto;
    min-height: 1.85rem;
    margin: 0.5rem 0 0;
    padding: 0 0.7rem;
    background: transparent;
    border: 1px dashed color-mix(in srgb, var(--op-cell-colour, var(--p-primary)) 60%, transparent);
    border-radius: 8px;
    color: color-mix(in srgb, var(--op-cell-colour, var(--p-primary)) 72%, var(--p-white));
    font: inherit;
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
}
.op-detail-body :deep(button.op-induce i) {
    font-size: 0.75rem;
}
.op-detail-body :deep(button.op-induce:hover:not(:disabled)) {
    border-style: solid;
    background: color-mix(in srgb, var(--op-cell-colour, var(--p-primary)) 12%, transparent);
}
/* Disabled for an inductor: the chosen signal already derives the other one;
   the button's title says so. */
.op-detail-body :deep(button.op-induce:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
}
.op-detail-body :deep(button.op-induce:focus-visible) {
    outline: 2px solid var(--op-cell-colour, var(--p-primary));
    outline-offset: 1px;
}

/* Floating, auto-dismissing import-error box (clears after 10s, see setImportError). */
.op-import-error-toast {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1100;
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    max-width: min(28rem, calc(100vw - 2rem));
    padding: 0.75rem 0.9rem;
    background:
        linear-gradient(145deg,
            rgba(var(--p-danger-rgb), 0.18) 0%,
            rgba(var(--p-danger-rgb), 0.08) 100%),
        var(--p-dark);
    border: 1px solid rgba(var(--p-danger-rgb), 0.45);
    border-radius: 10px;
    box-shadow: 0 6px 24px rgba(var(--p-black-rgb), 0.28);
}

.op-import-error-icon {
    color: var(--p-danger);
    font-size: 1.05rem;
    margin-top: 0.1rem;
    flex-shrink: 0;
}

.op-import-error-text {
    color: var(--p-danger);
    font-size: 0.85rem;
    line-height: 1.35;
    white-space: pre-wrap;
    margin: 0;
}

.op-import-error-close {
    background: transparent;
    border: none;
    color: var(--p-danger);
    cursor: pointer;
    padding: 0;
    margin-left: auto;
    font-size: 0.9rem;
    line-height: 1;
    flex-shrink: 0;
    opacity: 0.8;
}

.op-import-error-close:hover {
    opacity: 1;
}

.op-import-error-fade-enter-active,
.op-import-error-fade-leave-active {
    transition: opacity 0.25s ease, transform 0.25s ease;
}

.op-import-error-fade-enter-from,
.op-import-error-fade-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}
</style>
