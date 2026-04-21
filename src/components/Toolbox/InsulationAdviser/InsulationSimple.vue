<script setup>
import { toTitleCase, getMultiplier } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import SeveralElementsFromList from '/WebSharedComponents/DataInput/SeveralElementsFromList.vue'
import { minimumMaximumScalePerParameter} from '/WebSharedComponents/assets/js/defaults.js'
import { Cti, InsulationType, OvervoltageCategory, PollutionDegree, InsulationStandards } from '/WebSharedComponents/assets/ts/MAS.ts'
import * as Utils from '/WebSharedComponents/assets/js/utils.js'
import { WiringTechnology } from '/WebSharedComponents/assets/ts/MAS.ts'
</script>

<script>
export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        defaultValue:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        showTitle:{
            type: Boolean,
            default: true
        },
        standardsToDisable: {
            type: Array,
            default: () => [],
        },
        valueFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        titleFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        labelBgColor: {
            type: [String, Object],
            default: "bg-transparent",
        },
        valueBgColor: {
            type: [String, Object],
            default: "bg-light",
        },
        textColor: {
            type: [String, Object],
            default: "text-white",
        },
        unitExtraStyleClass:{
            type: String,
            default: ''
        },
    },
    data() {
        const wiringTechnologyToDisable = ["Deposition"]

        return {
            wiringTechnologyToDisable,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="is-root">
        <div v-if="showTitle" :data-cy="dataTestLabel + '-title'" class="is-section-title">Insulation</div>

        <!-- Section: Environment -->
        <div class="is-subsection">
            <div class="is-subsection-header">
                <i class="bi bi-sun-fill"></i>
                <span>Environment</span>
            </div>
            <div class="is-grid is-grid-3">
                <div class="is-cell">
                    <ElementFromListRadio
                        :name="'wiringTechnology'"
                        :dataTestLabel="dataTestLabel + '-WiringTechnology'"
                        :options="WiringTechnology"
                        :titleSameRow="false"
                        :optionsToDisable="wiringTechnologyToDisable"
                        :modelValue="modelValue"
                        :labelFontSize='titleFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="labelBgColor"
                        :textColor="textColor"
                        :unitExtraStyleClass="unitExtraStyleClass"
                        :labelWidthProportionClass="'col-12'"
                        :valueWidthProportionClass="'col-12'"
                        @input="modelValue['wiringTechnology'] = $event.target.value"
                        @update="$emit('update')"
                    />
                </div>
                <div class="is-cell">
                    <Dimension
                        :name="'maximum'"
                        :replaceTitle="'Altitude'"
                        :unit="'m'"
                        :dataTestLabel="dataTestLabel + '-Altitude'"
                        :min="minimumMaximumScalePerParameter['altitude']['min']"
                        :max="minimumMaximumScalePerParameter['altitude']['max']"
                        :defaultValue="Utils.deepCopy(defaultValue['altitude']['maximum'])"
                        :allowNegative="false"
                        :titleSameRow="false"
                        :labelFontSize='titleFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        :unitExtraStyleClass="unitExtraStyleClass"
                        :labelWidthProportionClass="'col-12'"
                        :valueWidthProportionClass="'col-12'"
                        :modelValue="modelValue['insulation']['altitude']"
                        @input="modelValue['insulation']['altitude']['maximum'] = $event.target.value"
                        @update="$emit('update')"
                    />
                </div>
                <div class="is-cell">
                    <Dimension
                        :name="'maximum'"
                        :replaceTitle="'Main Supply Voltage'"
                        :unit="'V'"
                        :dataTestLabel="dataTestLabel + '-MainSupplyVoltage'"
                        :min="minimumMaximumScalePerParameter['voltage']['min']"
                        :max="minimumMaximumScalePerParameter['voltage']['max']"
                        :defaultValue="Utils.deepCopy(defaultValue['mainSupplyVoltage']['maximum'])"
                        :allowNegative="false"
                        :titleSameRow="false"
                        :labelFontSize='titleFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        :unitExtraStyleClass="unitExtraStyleClass"
                        :labelWidthProportionClass="'col-12'"
                        :valueWidthProportionClass="'col-12'"
                        :modelValue="modelValue['insulation']['mainSupplyVoltage']"
                        @input="modelValue['insulation']['mainSupplyVoltage']['maximum'] = $event.target.value"
                        @update="$emit('update')"
                    />
                </div>
            </div>
        </div>

        <!-- Section: Classification -->
        <div class="is-subsection">
            <div class="is-subsection-header">
                <i class="bi bi-list-check"></i>
                <span>Classification</span>
            </div>
            <div class="is-grid is-grid-2">
                <div class="is-cell">
                    <ElementFromList
                        :dataTestLabel="dataTestLabel + '-Cti'"
                        :name="'cti'"
                        :titleSameRow="false"
                        :justifyContent="false"
                        v-model="modelValue['insulation']"
                        :options="Object.values(Cti)"
                        :labelWidthProportionClass="'col-12'"
                        :selectStyleClass="'col-12'"
                        :labelFontSize='titleFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        :unitExtraStyleClass="unitExtraStyleClass"
                        @update="$emit('update')"
                    />
                </div>
                <div class="is-cell">
                    <ElementFromList
                        :dataTestLabel="dataTestLabel + '-InsulationType'"
                        :name="'insulationType'"
                        :titleSameRow="false"
                        :justifyContent="false"
                        v-model="modelValue['insulation']"
                        :options="Object.values(InsulationType)"
                        :labelWidthProportionClass="'col-12'"
                        :selectStyleClass="'col-12'"
                        :labelFontSize='titleFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        :unitExtraStyleClass="unitExtraStyleClass"
                        @update="$emit('update')"
                    />
                </div>
                <div class="is-cell">
                    <ElementFromList
                        :dataTestLabel="dataTestLabel + '-OvervoltageCategory'"
                        :name="'overvoltageCategory'"
                        :titleSameRow="false"
                        :justifyContent="false"
                        v-model="modelValue['insulation']"
                        :options="Object.values(OvervoltageCategory)"
                        :labelWidthProportionClass="'col-12'"
                        :selectStyleClass="'col-12'"
                        :labelFontSize='titleFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        :unitExtraStyleClass="unitExtraStyleClass"
                        @update="$emit('update')"
                    />
                </div>
                <div class="is-cell">
                    <ElementFromList
                        :dataTestLabel="dataTestLabel + '-PollutionDegree'"
                        :name="'pollutionDegree'"
                        :titleSameRow="false"
                        :justifyContent="false"
                        v-model="modelValue['insulation']"
                        :options="Object.values(PollutionDegree)"
                        :labelWidthProportionClass="'col-12'"
                        :selectStyleClass="'col-12'"
                        :labelFontSize='titleFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        :unitExtraStyleClass="unitExtraStyleClass"
                        @update="$emit('update')"
                    />
                </div>
            </div>
        </div>

        <!-- Section: Standards -->
        <div class="is-subsection">
            <div class="is-subsection-header">
                <i class="bi bi-patch-check-fill"></i>
                <span>Standards</span>
            </div>
            <div class="is-standards">
                <SeveralElementsFromList
                    :name="'standards'"
                    v-model="modelValue['insulation']"
                    :options="Object.values(InsulationStandards)"
                    :optionsToDisable="standardsToDisable"
                    :labelFontSize='titleFontSize'
                    :valueFontSize="valueFontSize"
                    :labelBgColor="labelBgColor"
                    :valueBgColor="valueBgColor"
                    :textColor="textColor"
                    :unitExtraStyleClass="unitExtraStyleClass"
                    @update="$emit('update')"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.is-root {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.1rem;
}

.is-section-title {
    color: var(--bs-primary);
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 0.01em;
    padding: 0.15rem 0.25rem 0.4rem 0.25rem;
}

.is-subsection {
    background: linear-gradient(180deg,
        rgba(var(--bs-primary-rgb), 0.05) 0%,
        rgba(var(--bs-primary-rgb), 0.015) 100%);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
    border-radius: 10px;
    overflow: hidden;
}

.is-subsection-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.7rem;
    background: rgba(var(--bs-primary-rgb), 0.08);
    border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.12);
    color: var(--bs-primary);
    font-weight: 600;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.is-subsection-header i {
    font-size: 0.78rem;
    filter: drop-shadow(0 0 3px rgba(var(--bs-primary-rgb), 0.45));
}

.is-grid {
    display: grid;
    gap: 0.4rem 0.85rem;
    padding: 0.55rem 0.7rem;
}

.is-grid-2 {
    grid-template-columns: 1fr 1fr;
}

.is-grid-3 {
    grid-template-columns: 1fr 1fr 1fr;
}

@media (max-width: 768px) {
    .is-grid-2,
    .is-grid-3 {
        grid-template-columns: 1fr;
    }
}

.is-cell {
    min-width: 0;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 9px;
    padding: 0.45rem 0.6rem 0.55rem 0.6rem;
    transition: background 0.15s, border-color 0.15s;
}

.is-cell:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(var(--bs-primary-rgb), 0.25);
}

.is-cell :deep(.row),
.is-standards :deep(.row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
}

/* Uppercase pill caption above each input */
.is-cell :deep(.dim-label),
.is-cell :deep(.efl-label),
.is-cell :deep(label) {
    color: rgba(242, 242, 242, 0.65) !important;
    font-size: 0.66rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 0.2rem;
    line-height: 1.1;
    background: transparent !important;
}

/* Slightly larger and bolder values */
.is-cell :deep(input[type="number"]),
.is-cell :deep(.dim-input),
.is-cell :deep(.efl-select) {
    font-size: 0.92rem !important;
    font-weight: 600;
    height: 1.85rem !important;
}

/* Wiring Technology radio: keep its own labels readable, not uppercased */
.is-cell :deep(.form-check-label) {
    color: rgba(242, 242, 242, 0.85) !important;
    font-size: 0.78rem !important;
    font-weight: 500 !important;
    letter-spacing: 0;
    text-transform: none;
    margin-bottom: 0;
}

.is-standards {
    padding: 0.55rem 0.7rem;
}

/* Hide the redundant inner "Standards" title from SeveralElementsFromList -
   the section header already says STANDARDS. */
.is-standards :deep(.several-elements-label) {
    display: none !important;
}
</style>


