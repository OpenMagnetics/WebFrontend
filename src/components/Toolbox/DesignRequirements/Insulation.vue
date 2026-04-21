<script setup>
import { toTitleCase, getMultiplier, combinedStyle, combinedClass } from '/WebSharedComponents/assets/js/utils.js'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import SeveralElementsFromList from '/WebSharedComponents/DataInput/SeveralElementsFromList.vue'
import { minimumMaximumScalePerParameter} from '/WebSharedComponents/assets/js/defaults.js'
import { Cti, InsulationType, OvervoltageCategory, PollutionDegree, InsulationStandards } from '/WebSharedComponents/assets/ts/MAS.ts'
import * as Utils from '/WebSharedComponents/assets/js/utils.js'
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
        addButtonStyle: {
            type: Object,
            default: () => ({}),
        },
        removeButtonBgColor: {
            type: String,
            default: "bg-danger",
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
        return {
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
    <div :data-cy="dataTestLabel + '-container'" class="ins-root">
        <div v-if="showTitle" class="ins-title" :data-cy="dataTestLabel + '-title'">
            <i class="bi bi-shield-shaded"></i>
            <span>Insulation</span>
        </div>

        <!-- Section 1: Environment (altitude + main supply voltage) -->
        <div class="ins-section">
            <div class="ins-section-header">
                <i class="bi bi-sun-fill"></i>
                <span>Environment</span>
            </div>
            <div class="ins-grid-2">
                <div class="ins-cell">
                    <DimensionWithTolerance
                        :dataTestLabel="dataTestLabel + '-Altitude'"
                        :allowNegative="true"
                        :min="minimumMaximumScalePerParameter['altitude']['min']"
                        :max="minimumMaximumScalePerParameter['altitude']['max']"
                        :defaultValue="Utils.deepCopy(defaultValue['altitude'])"
                        :halfSize="true"
                        :name="'altitude'"
                        :unit="'m'"
                        v-model="modelValue['insulation']['altitude']"
                        :addButtonStyle="addButtonStyle"
                        :removeButtonBgColor="removeButtonBgColor"
                        :titleFontSize='valueFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        :unitExtraStyleClass="unitExtraStyleClass"
                        @update="$emit('update')"
                    />
                </div>
                <div class="ins-cell">
                    <DimensionWithTolerance
                        :dataTestLabel="dataTestLabel + '-MainSupplyVoltage'"
                        :min="minimumMaximumScalePerParameter['voltage']['min']"
                        :max="minimumMaximumScalePerParameter['voltage']['max']"
                        :defaultValue="Utils.deepCopy(defaultValue['mainSupplyVoltage'])"
                        :halfSize="true"
                        :name="'mainSupplyVoltage'"
                        :unit="'V'"
                        v-model="modelValue['insulation']['mainSupplyVoltage']"
                        :addButtonStyle="addButtonStyle"
                        :removeButtonBgColor="removeButtonBgColor"
                        :titleFontSize='valueFontSize'
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

        <!-- Section 2: Classification (CTI / InsulationType / Overvoltage / Pollution) -->
        <div class="ins-section">
            <div class="ins-section-header">
                <i class="bi bi-list-check"></i>
                <span>Classification</span>
            </div>
            <div class="ins-grid-2">
                <div class="ins-cell">
                    <ElementFromList
                        :dataTestLabel="dataTestLabel + '-Cti'"
                        :name="'cti'"
                        :titleSameRow="true"
                        :justifyContent="true"
                        v-model="modelValue['insulation']"
                        :options="Object.values(Cti)"
                        :labelWidthProportionClass="'col-6'"
                        :selectStyleClass="'col-6'"
                        :labelFontSize='valueFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        @update="$emit('update')"
                    />
                </div>
                <div class="ins-cell">
                    <ElementFromList
                        :dataTestLabel="dataTestLabel + '-InsulationType'"
                        :name="'insulationType'"
                        :titleSameRow="true"
                        :justifyContent="true"
                        v-model="modelValue['insulation']"
                        :options="Object.values(InsulationType)"
                        :labelWidthProportionClass="'col-6'"
                        :selectStyleClass="'col-6'"
                        :labelFontSize='valueFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        @update="$emit('update')"
                    />
                </div>
                <div class="ins-cell">
                    <ElementFromList
                        :dataTestLabel="dataTestLabel + '-OvervoltageCategory'"
                        :name="'overvoltageCategory'"
                        :titleSameRow="true"
                        :justifyContent="true"
                        v-model="modelValue['insulation']"
                        :options="Object.values(OvervoltageCategory)"
                        :labelWidthProportionClass="'col-6'"
                        :selectStyleClass="'col-6'"
                        :labelFontSize='valueFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        @update="$emit('update')"
                    />
                </div>
                <div class="ins-cell">
                    <ElementFromList
                        :dataTestLabel="dataTestLabel + '-PollutionDegree'"
                        :name="'pollutionDegree'"
                        :titleSameRow="true"
                        :justifyContent="true"
                        v-model="modelValue['insulation']"
                        :options="Object.values(PollutionDegree)"
                        :labelWidthProportionClass="'col-6'"
                        :selectStyleClass="'col-6'"
                        :labelFontSize='valueFontSize'
                        :valueFontSize="valueFontSize"
                        :labelBgColor="labelBgColor"
                        :valueBgColor="valueBgColor"
                        :textColor="textColor"
                        @update="$emit('update')"
                    />
                </div>
            </div>
        </div>

        <!-- Section 3: Standards -->
        <div class="ins-section">
            <div class="ins-section-header">
                <i class="bi bi-patch-check-fill"></i>
                <span>Standards</span>
            </div>
            <div class="ins-standards">
                <SeveralElementsFromList
                    :name="'standards'"
                    v-model="modelValue['insulation']"
                    :options="Object.values(InsulationStandards)"
                    :optionsToDisable="standardsToDisable"
                    :labelFontSize='valueFontSize'
                    :valueFontSize="valueFontSize"
                    :labelBgColor="labelBgColor"
                    :valueBgColor="valueBgColor"
                    :textColor="textColor"
                    @update="$emit('update')"
                />
            </div>
        </div>
    </div>
</template>

<style scoped>
.ins-root {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.2rem 0.1rem;
}

.ins-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--bs-primary);
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 0.01em;
    padding: 0.15rem 0.25rem 0.4rem 0.25rem;
}

.ins-title i {
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.5));
}

/* ============ Sub-section ============ */
.ins-section {
    background: linear-gradient(180deg,
        rgba(var(--bs-primary-rgb), 0.05) 0%,
        rgba(var(--bs-primary-rgb), 0.015) 100%);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
    border-radius: 10px;
    overflow: hidden;
}

.ins-section-header {
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

.ins-section-header i {
    font-size: 0.78rem;
    filter: drop-shadow(0 0 3px rgba(var(--bs-primary-rgb), 0.45));
}

/* ============ Grid layouts ============ */
.ins-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem 0.85rem;
    padding: 0.55rem 0.7rem;
}

.ins-cell {
    min-width: 0;
}

.ins-standards {
    padding: 0.55rem 0.7rem;
}

/* Tighten the inner Bootstrap rows generated by the child DataInput components */
.ins-cell :deep(.row),
.ins-standards :deep(.row) {
    margin-left: 0 !important;
    margin-right: 0 !important;
}

/* The SeveralElementsFromList component always renders its own "Standards"
   title label — redundant since the section header already says STANDARDS. */
.ins-standards :deep(.several-elements-label) {
    display: none !important;
}
</style>
