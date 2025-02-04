<script setup>
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'

</script>
<script>

export default {
    emits: ["onFrequencyChanged", "onAmplitudeChanged"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        modelValue: {
            type: Number,
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
    },
    data() {
        return {
            errorMessages: "",
        }
    },
    computed: {
    },
    watch: { 
    },
    created () {

    },
    mounted () {
    },
    methods: {
    }
}
</script>

<template>
    <div class="container">
        <label :data-cy="dataTestLabel + '-current-title'" class="fs-5 text-white mx-0 p-0 mb-4">{{title}}</label>
        <div class="row">
            <Dimension class="col-7 mb-1 text-start"
                :name="index"
                :unit="'Hz'"
                :dataTestLabel="dataTestLabel + '-HarmonicFrequency-' + index"
                :min="1"
                :justifyContent="true"
                :defaultValue="1"
                :allowNegative="false"
                :modelValue="modelValue.frequencies"
                @update="$emit('onFrequencyChanged')"
                :labelStyleClass="'col-2'"
                :dimensionStyleClass="'col-10'"
                :labelBgColor="$settingsStore.labelBgColor"
                :inputBgColor="$settingsStore.inputBgColor"
                :textColor="$settingsStore.textColor"
            />

            <Dimension class="col-5 mb-1 text-start"
                :name="index"
                :unit="unit"
                :replaceTitle="''"
                :dataTestLabel="dataTestLabel + '-HarmonicFrequency-' + index"
                :min="0"
                :justifyContent="true"
                :defaultValue="1"
                :allowNegative="false"
                :allowZero="true"
                :modelValue="modelValue.amplitudes"
                @update="$emit('onAmplitudeChanged')"
                :labelStyleClass="'col-0'"
                :dimensionStyleClass="'col-12'"
                :labelBgColor="$settingsStore.labelBgColor"
                :inputBgColor="$settingsStore.inputBgColor"
                :textColor="$settingsStore.textColor"
            />
        </div>
        <div v-if='errorMessages != ""' class="col-12">
            <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>

</template>
