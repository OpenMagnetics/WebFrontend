<script setup>
import Dimension from '/src/components/DataInput/Dimension.vue'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import { minimumMaximumScalePerParameter, titleColor } from '/src/assets/js/defaults.js'
import { WaveformLabel } from '/src/assets/ts/MAS.ts'

</script>

<script>
export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        signalDescriptor: {
            type: String,
            required: false,
            default: "current",
        },
        defaultValue:{
            type: Object,
            default: {}
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const errorMessages = '';
        return {
            errorMessages,
        }
    },
    computed: {
        disableOffset() {
            return this.modelValue[this.signalDescriptor].processed.label === "Rectangular";
        }
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        peakToPeakChanged(value) {
            this.$emit("peakToPeakChanged");
        },
        offsetChanged(value) {
            this.$emit("offsetChanged");
        },
        labelChanged(value) {
            this.$emit("labelChanged");
        },
    }
}
</script>

<template>
    <div class="container-flex text-white">

        <label class="fs-4 row" :class="titleColor(signalDescriptor)">Waveform for {{signalDescriptor}}</label>
        <div class="row">

            <ElementFromList class="border-bottom pb-2 mb-1"
                :name="'label'"
                :dataTestLabel="dataTestLabel + '-Label'"
                :options="WaveformLabel"
                :titleSameRow="true"
                :replaceTitle="'Waveform'"
                v-model="this.modelValue[signalDescriptor].processed"
                @updatedNumberElements="labelChanged"
            />

            <Dimension class="border-bottom col-12"
                :name="'peakToPeak'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :dataTestLabel="dataTestLabel + '-PeakToPeak'"
                :min="minimumMaximumScalePerParameter[signalDescriptor]['min']"
                :max="minimumMaximumScalePerParameter[signalDescriptor]['max']"
                :defaultValue="defaultValue[signalDescriptor].processed.peakToPeak"
                v-model="this.modelValue[signalDescriptor].processed"
                @update="peakToPeakChanged"
            />

            <Dimension class="border-bottom col-12"
                v-if="!disableOffset"
                :name="'offset'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :dataTestLabel="dataTestLabel + '-Offset'"
                :min="minimumMaximumScalePerParameter[signalDescriptor]['min']"
                :max="minimumMaximumScalePerParameter[signalDescriptor]['max']"
                :defaultValue="defaultValue[signalDescriptor].processed.offset"
                :allowNegative="true"
                v-model="this.modelValue[signalDescriptor].processed"
                @update="offsetChanged"
            />
        </div>
        <div data-cy="`${dataTestLabel}-error-text`" class="invalid-feedback">{{errorMessages}}</div>
    </div>
</template>

