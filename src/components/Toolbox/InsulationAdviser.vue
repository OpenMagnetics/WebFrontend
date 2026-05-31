<script setup>
import { ref } from 'vue'
import { useMasStore } from '../../stores/mas'
import { toTitleCase, toPascalCase } from 'WebSharedComponents/assets/js/utils.js'
import { defaultDesignRequirements, defaultOperatingPointExcitationForInsulation, defaultOperatingPoint, defaultOperatingConditions } from 'WebSharedComponents/assets/js/defaults.js'
import InsulationSimple from './InsulationAdviser/InsulationSimple.vue'
import DimensionReadOnly from 'WebSharedComponents/DataInput/DimensionReadOnly.vue'
import InsulationExtraInputs from './InsulationAdviser/InsulationExtraInputs.vue'
import Module from '../../assets/js/libInsulationCoordinator.wasm.js'
</script>

<script>

var insulationCoordinator = {
    ready: new Promise(resolve => {
        Module({
            locateFile: (filename) => `${import.meta.env.BASE_URL}wasm/${filename}`,
            onRuntimeInitialized () {
                insulationCoordinator = Object.assign(this, {
                    ready: Promise.resolve()
                });
                resolve();
            }
        });
    })
};
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        if (masStore.mas.inputs.designRequirements['insulation'] == null) {
            masStore.mas.inputs.designRequirements['insulation'] = defaultDesignRequirements['insulation'];
        }
        if (masStore.mas.inputs.designRequirements['wiringTechnology'] == null) {
            masStore.mas.inputs.designRequirements['wiringTechnology'] = defaultDesignRequirements['wiringTechnology'];
        }
        if (masStore.mas.inputs.operatingPoints == null || masStore.mas.inputs.operatingPoints.length == 0) {
            masStore.mas.inputs.operatingPoints = [
                {
                    "conditions": defaultOperatingConditions,
                    "excitationsPerWinding": [defaultOperatingPointExcitationForInsulation],
                }
            ];
        }

        if (masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0] == null) {
            masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0] = defaultOperatingPointExcitationForInsulation;
        }
        // A previously-active operatingPoint may have no `voltage` block at
        // all (e.g. coming from MagneticAdviser, which only sets `current`).
        // The calc needs voltage.processed.peak — patch in the insulation
        // defaults for any missing pieces so we never feed NaN to the WASM.
        const exc = masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0];
        if (exc.voltage == null) {
            exc.voltage = defaultOperatingPointExcitationForInsulation.voltage;
        }
        if (exc.voltage.processed == null) {
            exc.voltage.processed = defaultOperatingPointExcitationForInsulation.voltage.processed;
        }
        if (exc.frequency == null) {
            exc.frequency = defaultOperatingPointExcitationForInsulation.frequency;
        }

        const standardsToDisable = []


        const insulation = {}

        return {
            masStore,
            standardsToDisable,
            insulation
        }
    },
    computed: {
    },
    created () {
    },
    mounted () {
        this.calculateInsulation();
    },
    methods: {
        calculateInsulation() {
            insulationCoordinator.ready.then(_ => {
                try {
                    const exc = this.masStore.mas.inputs.operatingPoints?.[0]?.excitationsPerWinding?.[0];
                    if (exc?.voltage?.processed && Number.isFinite(Number(exc.voltage.processed.peak))) {
                        exc.voltage.processed.peakToPeak = 2 * Number(exc.voltage.processed.peak);
                    }
                    const raw = insulationCoordinator.calculate_insulation(JSON.stringify(this.masStore.mas.inputs));
                    this.insulation = JSON.parse(raw);
                } catch (e) {
                    const message = (e && e.message)
                        || (typeof e === 'string' ? e : 'Insulation calculation failed; check inputs.');
                    console.error('[InsulationAdviser] calculate_insulation:', e);
                    this.insulation = { errorMessage: message };
                }
            });
        },
        onChange() {
            this.calculateInsulation();
        },
    }
}
</script>


<template>
    <div class="ia-container">
        <div class="ia-title">
            <i class="pi pi-shield"></i>
            <span>Insulation Coordinator</span>
        </div>

        <div class="row g-3 m-0">
            <!-- Inputs panel -->
            <div class="col-12 lg:col-7 ia-col">
                <div class="ia-card">
                    <div class="ia-card-header">
                        <i class="pi pi-bolt"></i>
                        <span>Operating point</span>
                    </div>
                    <div class="ia-card-body">
                        <InsulationExtraInputs
                            :dataTestLabel="dataTestLabel + '-Insulation'"
                            :defaultValue="defaultOperatingPointExcitationForInsulation"
                            v-model="masStore.mas.inputs.operatingPoints[0].excitationsPerWinding[0]"
                            :valueFontSize="$styleStore.insulationAdviser.inputFontSize"
                            :titleFontSize="$styleStore.insulationAdviser.inputTitleFontSize"
                            :labelBgColor="$styleStore.insulationAdviser.inputLabelBgColor"
                            :valueBgColor="$styleStore.insulationAdviser.inputValueBgColor"
                            :textColor="$styleStore.insulationAdviser.inputTextColor"
                            @update="onChange"
                        />
                    </div>
                </div>

                <InsulationSimple
                    :dataTestLabel="dataTestLabel + '-Insulation'"
                    :defaultValue="defaultDesignRequirements.insulation"
                    :showTitle="false"
                    :standardsToDisable="standardsToDisable"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="$styleStore.insulationAdviser.inputFontSize"
                    :titleFontSize="$styleStore.insulationAdviser.inputTitleFontSize"
                    :labelBgColor="$styleStore.insulationAdviser.inputLabelBgColor"
                    :valueBgColor="$styleStore.insulationAdviser.inputValueBgColor"
                    :textColor="$styleStore.insulationAdviser.inputTextColor"
                    @update="onChange"
                />
            </div>

            <!-- Result panel -->
            <div class="col-12 lg:col-5 ia-col">
                <div class="ia-card ia-card-result">
                    <div class="ia-card-header ia-card-header-result">
                        <i class="bi bi-shield-check"></i>
                        <span>Coordination result</span>
                    </div>
                    <div class="ia-result-body">
                        <div class="ia-result-row">
                            <div class="ia-result-icon"><i class="bi bi-arrows"></i></div>
                            <div class="ia-result-text">
                                <small>Clearance</small>
                                <DimensionReadOnly
                                    :name="'clearance'"
                                    :unit="'m'"
                                    :dataTestLabel="dataTestLabel + '-Clearance'"
                                    :value="insulation.clearance"
                                    :disableShortenLabels="true"
                                    :replaceTitle="' '"
                                    :valueFontSize="'text-4xl'"
                                    :labelWidthProportionClass="'col-1'"
                                    :valueWidthProportionClass="'col-11'"
                                    :labelBgColor="'bg-transparent'"
                                    :valueBgColor="'bg-transparent'"
                                    :textColor="$settingsStore.textColor"
                                />
                            </div>
                        </div>
                        <div class="ia-result-row">
                            <div class="ia-result-icon"><i class="bi bi-signpost-split-fill"></i></div>
                            <div class="ia-result-text">
                                <small>Creepage distance</small>
                                <DimensionReadOnly
                                    :name="'creepageDistance'"
                                    :unit="'m'"
                                    :dataTestLabel="dataTestLabel + '-CreepageDistance'"
                                    :value="insulation.creepageDistance"
                                    :disableShortenLabels="true"
                                    :replaceTitle="' '"
                                    :valueFontSize="'text-4xl'"
                                    :labelWidthProportionClass="'col-1'"
                                    :valueWidthProportionClass="'col-11'"
                                    :labelBgColor="'bg-transparent'"
                                    :valueBgColor="'bg-transparent'"
                                    :textColor="$settingsStore.textColor"
                                />
                            </div>
                        </div>
                        <div class="ia-result-row">
                            <div class="ia-result-icon"><i class="bi bi-lightning-charge-fill"></i></div>
                            <div class="ia-result-text">
                                <small>Withstand voltage</small>
                                <DimensionReadOnly
                                    :name="'withstandVoltage'"
                                    :unit="'V'"
                                    :dataTestLabel="dataTestLabel + '-WithstandVoltage'"
                                    :value="insulation.withstandVoltage"
                                    :disableShortenLabels="true"
                                    :replaceTitle="' '"
                                    :valueFontSize="'text-4xl'"
                                    :labelWidthProportionClass="'col-1'"
                                    :valueWidthProportionClass="'col-11'"
                                    :labelBgColor="'bg-transparent'"
                                    :valueBgColor="'bg-transparent'"
                                    :textColor="$settingsStore.textColor"
                                />
                            </div>
                        </div>
                        <div class="ia-result-row">
                            <div class="ia-result-icon"><i class="bi bi-layers-fill"></i></div>
                            <div class="ia-result-text">
                                <small>Distance through insulation</small>
                                <DimensionReadOnly
                                    :name="'distanceThroughInsulation'"
                                    :unit="'m'"
                                    :dataTestLabel="dataTestLabel + '-DistanceThroughInsulation'"
                                    :value="insulation.distanceThroughInsulation"
                                    :disableShortenLabels="true"
                                    :replaceTitle="' '"
                                    :valueFontSize="'text-4xl'"
                                    :labelWidthProportionClass="'col-1'"
                                    :valueWidthProportionClass="'col-11'"
                                    :labelBgColor="'bg-transparent'"
                                    :valueBgColor="'bg-transparent'"
                                    :textColor="$settingsStore.textColor"
                                />
                            </div>
                        </div>
                        <div v-if="insulation.errorMessage" class="ia-result-error">
                            <i class="pi pi-exclamation-triangle"></i>
                            <span :data-cy="dataTestLabel + '-ErrorMessage'">{{ insulation.errorMessage }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.ia-container {
    width: 100%;
    padding: 0.5rem 0.75rem 1rem 0.75rem;
}

.ia-title {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    color: var(--p-primary);
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    padding: 0.4rem 0.25rem 0.6rem 0.25rem;
}

.ia-title i {
    filter: drop-shadow(0 0 4px rgba(var(--p-primary-rgb), 0.5));
}

.ia-col {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

/* ============ Sub-card ============ */
.ia-card {
    background:
        linear-gradient(180deg,
            rgba(var(--p-primary-rgb), 0.06) 0%,
            rgba(var(--p-primary-rgb), 0.02) 100%),
        var(--p-dark);
    border: 1px solid rgba(var(--p-primary-rgb), 0.18);
    border-left: 3px solid rgba(var(--p-primary-rgb), 0.7);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 3px 10px rgba(var(--p-black-rgb), 0.3);
}

.ia-card-result {
    border-left-color: rgba(var(--p-success-rgb), 0.75);
    background:
        linear-gradient(180deg,
            rgba(var(--p-success-rgb), 0.05) 0%,
            rgba(var(--p-success-rgb), 0.015) 100%),
        var(--p-dark);
    border-color: rgba(var(--p-success-rgb), 0.2);
    position: sticky;
    top: 0.5rem;
}

.ia-card-header {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.75rem;
    background: rgba(var(--p-primary-rgb), 0.08);
    border-bottom: 1px solid rgba(var(--p-primary-rgb), 0.12);
    color: var(--p-primary);
    font-weight: 600;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
}

.ia-card-header i {
    font-size: 0.85rem;
    filter: drop-shadow(0 0 4px rgba(var(--p-primary-rgb), 0.5));
}

.ia-card-header-result {
    background: rgba(var(--p-success-rgb), 0.1);
    border-bottom-color: rgba(var(--p-success-rgb), 0.18);
    color: var(--p-success);
    font-size: 1.2rem;
    padding: 0.5rem 0.9rem;
}

.ia-card-header-result i {
    font-size: 1.2rem;
    filter: drop-shadow(0 0 4px rgba(var(--p-success-rgb), 0.5));
}

.ia-card-body {
    padding: 0.7rem 1rem 0.85rem 1rem;
}

.ia-card-body :deep(.row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
}

/* ============ Result rows ============ */
.ia-result-body {
    padding: 0.65rem 0.75rem 0.85rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
}

.ia-result-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.65rem;
    background: rgba(var(--p-success-rgb), 0.08);
    border: 1px solid rgba(var(--p-success-rgb), 0.18);
    border-radius: 10px;
    transition: background 0.15s, border-color 0.15s;
}

.ia-result-row:hover {
    background: rgba(var(--p-success-rgb), 0.12);
    border-color: rgba(var(--p-success-rgb), 0.3);
}

.ia-result-icon {
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--p-success-rgb), 0.18);
    border: 1px solid rgba(var(--p-success-rgb), 0.4);
    border-radius: 999px;
    color: var(--p-success);
    font-size: 1.2rem;
    flex-shrink: 0;
}

/* Single-row layout: label on the left, value/unit on the right. */
.ia-result-text {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex: 1;
    min-width: 0;
}

.ia-result-text small {
    color: rgba(var(--p-white-rgb), 0.85);
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    line-height: 1.15;
    margin: 0;
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
}

.ia-result-text :deep(.row) {
    margin: 0 !important;
    flex: 0 0 auto;
    width: auto !important;
}

/* Numeric value + unit shown by DimensionReadOnly: 1.2rem to match the
 * rest of the Coordination Result box. PrimeVue's <Select> renders the
 * actual unit text inside an inner `.p-select-label`, which Aura sets to
 * 14px — force inheritance so "mm" / "V" / "µm" track the wrapper. */
.ia-result-text :deep(.dim-ro-input),
.ia-result-text :deep(.dim-ro-value),
.ia-result-text :deep(.dim-ro-unit),
.ia-result-text :deep(.dim-ro-alt-unit),
.ia-result-text :deep(.dim-ro-unit .p-select-label),
.ia-result-text :deep(.dim-ro-alt-unit .p-select-label) {
    color: var(--p-white) !important;
    background: transparent !important;
    font-size: 1.2rem !important;
    line-height: 1.15 !important;
    font-weight: 600;
}

.ia-result-error {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding: 0.55rem 0.75rem;
    background: rgb(var(--p-danger-rgb) / 0.12);
    border: 1px solid rgb(var(--p-danger-rgb) / 0.4);
    border-radius: 10px;
    color: var(--p-danger);
    font-size: 0.85rem;
    line-height: 1.3;
}

.ia-result-error i {
    margin-top: 0.1rem;
}
</style>


