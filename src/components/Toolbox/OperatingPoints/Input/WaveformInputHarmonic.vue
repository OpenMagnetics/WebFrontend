<script setup>
import { combinedStyle, combinedClass } from '/WebSharedComponents/assets/js/utils.js'

import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'

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
        <div class="row">
            <Dimension class="col-6 mb-1 text-start"
                :name="String(index)"
                :unit="'Hz'"
                :replaceTitle="title"
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
                :labelWidthProportionClass="'col-3'"
                :valueWidthProportionClass="'col-9'"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputLabelFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />

            <Dimension class="col-4 mb-1 text-start"
                :name="String(index)"
                :unit="unit"
                :replaceTitle="''"
                :dataTestLabel="dataTestLabel + '-HarmonicFrequency-' + index"
                :min="0"
                :justifyContent="true"
                :defaultValue="1"
                :forceUpdate="forceUpdate"
                :allowNegative="false"
                :allowZero="true"
                :modelValue="modelValue.amplitudes"
                @update="$emit('onAmplitudeChanged')"
                :labelWidthProportionClass="'col-0'"
                :valueWidthProportionClass="'col-12'"
                :valueFontSize="$styleStore.operatingPoints.inputFontSize"
                :labelFontSize="$styleStore.operatingPoints.inputLabelFontSize"
                :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
                :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
                :textColor="$styleStore.operatingPoints.inputTextColor"
            />
            <div class="col-md-2 col-12 p-0 m-0 ps-2 container-flex" style="height: 40px;">
                <div class="row m-0 p-0  pt-2" style="height: 40px;">
                    <button
                        :data-cy="dataTestLabel + '-add-point-below-button'"
                        type="button"
                        class="btn btn-default btn-circle mb-1 col-6"
                        @click="$emit('onAddPointBelow')"
                    >
                        <i
                            :style="combinedStyle([$styleStore.operatingPoints.addElementButtonColor])"
                            :class="combinedClass([$styleStore.operatingPoints.addElementButtonColor])"
                            class="fa-solid fa-circle-plus text-secondary"
                        > </i>
                    </button>
                    <button
                        :data-cy="dataTestLabel + '-remove-point-button'"
                        v-if="!block"
                        type="button"
                        class="btn btn-default btn-circle mb-1 col-6 ps-1" 
                        @click="$emit('onRemovePoint')"
                    >
                        <i
                            :style="combinedStyle([$styleStore.operatingPoints.addElementButtonColor])"
                            :class="combinedClass([$styleStore.operatingPoints.addElementButtonColor])"
                            class="fa-solid fa-circle-minus text-danger"
                        ></i>
                    </button>
                </div>
            </div>
        </div>
        <div v-if='errorMessages != ""' class="col-12">
            <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>

</template>
