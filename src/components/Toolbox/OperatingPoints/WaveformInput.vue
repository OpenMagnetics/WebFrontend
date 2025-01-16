<script setup>
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import { minimumMaximumScalePerParameter, titleColor } from '/WebSharedComponents/assets/js/defaults.js'
import { WaveformLabel } from '/WebSharedComponents/assets/ts/MAS.ts'

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
        const forceUpdate = 0;
        return {
            errorMessages,
            forceUpdate,
        }
    },
    computed: {
        disableOffset() {
            return this.modelValue[this.signalDescriptor].processed.label === "Rectangular";
        },
        induceableSignal() {
            if (this.signalDescriptor == 'current') {
                return true;
            }
            else {
                return this.modelValue.current.processed.label != "Rectangular" && this.modelValue.current.processed.label != "Bipolar Rectangular" && this.modelValue.current.processed.label != "Unipolar Rectangular";
            }
        }
    },
    watch: {
        'modelValue.current.processed'(newValue, oldValue) {
            if (this.signalDescriptor == 'current'){
                this.forceUpdate += 1
            }
        },
        'modelValue.voltage.processed'(newValue, oldValue) {
            if (this.signalDescriptor == 'voltage'){
                this.forceUpdate += 1
            }
        },
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
    <div class="container-flex text-white ">
        <div class="row text-center">
            <label class="fs-4" :class="titleColor(signalDescriptor)">Waveform for {{signalDescriptor}}</label>
        </div>
        <div class="row">

            <ElementFromList class="border-bottom border-1 pb-2 mb-1 col-12"
                :name="'label'"
                :dataTestLabel="dataTestLabel + '-Label'"
                :options="Object.values(WaveformLabel)"
                :titleSameRow="true"
                :replaceTitle="'Waveform'"
                v-model="modelValue[signalDescriptor].processed"
                @update="labelChanged"
            />

            <Dimension class="border-bottom border-1 col-12"
                :name="'peakToPeak'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :dataTestLabel="dataTestLabel + '-PeakToPeak'"
                :min="minimumMaximumScalePerParameter[signalDescriptor]['min']"
                :max="minimumMaximumScalePerParameter[signalDescriptor]['max']"
                :defaultValue="defaultValue[signalDescriptor].processed.peakToPeak"
                :forceUpdate="forceUpdate"
                v-model="modelValue[signalDescriptor].processed"
                @update="peakToPeakChanged"
            />

            <Dimension class="border-bottom border-1 col-12"
                v-if="!disableOffset"
                :name="'offset'"
                :unit="signalDescriptor == 'current'? 'A' : 'V'"
                :dataTestLabel="dataTestLabel + '-Offset'"
                :min="minimumMaximumScalePerParameter[signalDescriptor]['min']"
                :max="minimumMaximumScalePerParameter[signalDescriptor]['max']"
                :defaultValue="defaultValue[signalDescriptor].processed.offset"
                :allowNegative="true"
                :allowZero="true"
                :forceUpdate="forceUpdate"
                v-model="modelValue[signalDescriptor].processed"
                @update="offsetChanged"
            />
            <button v-if="induceableSignal" :data-cy="`${dataTestLabel}-induce-button`" :class="signalDescriptor == 'current'? 'btn-info' : 'btn-primary'" class="btn  fs-6 offset-2 col-8 mt-2 p-0" @click="$emit('induce')" style="max-height: 1.7em">
                {{'Induce from ' + (signalDescriptor == 'current'? 'voltage' : 'current')}}
                <i class="fa-solid fa-bolt"></i>
                <i class="fa-solid fa-magnet"></i>
            </button>

        </div>
        <div class="row">
            <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>

