<script setup>
import { combinedStyle, combinedClass } from 'WebSharedComponents/assets/js/utils.js'

import Dimension from 'WebSharedComponents/DataInput/Dimension.vue'

</script>
<script>

export default {
    emits: ["onFrequencyChanged", "onAmplitudeChanged", "onAddPointBelow", "onRemovePoint"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        modelValue: {
            type: Object,
        },
        index: {
            type: Number,
        },
        unit: {
            type: String,
            default: '',
        },
        title: {
            type: String,
            default: '',
        },
        block: {
            type: Boolean,
            default: false,
        },
        forceUpdate:{
            type: Number,
            default: 0
        },
    },
    data() {
        return {
            errorMessages: "",
        }
    },
    computed: {
    },
    methods: {
    }
}
</script>

<template>
    <div class="container">
        <div class="row align-items-center">
            <div class="col-12 md:col-2 harmonic-title">
                {{ title }}
            </div>
            <Dimension class="col-12 md:col-4 mb-1 text-left"
                :name="String(index)"
                :unit="'Hz'"
                :replaceTitle="''"
                :dataTestLabel="dataTestLabel + '-HarmonicFrequency-' + index"
                :min="1"
                :justifyContent="true"
                :defaultValue="1"
                :disabled="index == 0"
                :forceUpdate="forceUpdate"
                :allowNegative="false"
                :allowZero="true"
                :modelValue="modelValue.frequencies"
                @update="$emit('onFrequencyChanged')"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputLabelFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />

            <Dimension class="col-12 md:col-4 mb-1 text-left"
                :name="String(index)"
                :unit="unit"
                :replaceTitle="''"
                :dataTestLabel="dataTestLabel + '-HarmonicAmplitude-' + index"
                :min="0"
                :unitMin="0.001"
                :unitMax="1000"
                :justifyContent="true"
                :defaultValue="1"
                :forceUpdate="forceUpdate"
                :allowNegative="false"
                :allowZero="true"
                :modelValue="modelValue.amplitudes"
                @update="$emit('onAmplitudeChanged')"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputLabelFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
            <div class="col-12 md:col-2 p-0 m-0 pl-2 harmonic-btn-group">
                <button
                    :data-cy="dataTestLabel + '-add-point-below-button'"
                    type="button"
                    class="wih-circle-btn"
                    @click="$emit('onAddPointBelow')"
                >
                    <i
                        :style="combinedStyle([$styleStore.operatingPoints.addElementButtonColor])"
                        :class="combinedClass([$styleStore.operatingPoints.addElementButtonColor])"
                        class="pi pi-plus-circle"
                    ></i>
                </button>
                <button
                    :data-cy="dataTestLabel + '-remove-point-button'"
                    v-if="!block"
                    type="button"
                    class="wih-circle-btn"
                    @click="$emit('onRemovePoint')"
                >
                    <i
                        :style="combinedStyle([$styleStore.operatingPoints.addElementButtonColor])"
                        :class="combinedClass([$styleStore.operatingPoints.addElementButtonColor])"
                        class="pi pi-minus-circle text-danger"
                    ></i>
                </button>
            </div>
        </div>
        <div v-if='errorMessages != ""' class="col-12">
            <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>

</template>

<style scoped>
.harmonic-title {
    display: flex;
    align-items: center;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding: 0 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.harmonic-btn-group {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.25rem;
    height: 1.75rem;
    flex-shrink: 0;
}

.harmonic-btn-group .wih-circle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    cursor: pointer;
}

.harmonic-btn-group .wih-circle-btn i {
    font-size: 1rem;
}
</style>
