<script setup>
import { useStyleStore } from '/src/stores/style'
import WaveformInputCustomPoint from '/src/components/Toolbox/OperatingPoints/Input/WaveformInputCustomPoint.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import { WaveformLabel } from '/WebSharedComponents/assets/ts/MAS.ts'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { toTitleCase, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'

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
        const styleStore = useStyleStore();
        var resettingPoints = false;
        var addedOrRemovedIndex = 0;
        return {
            styleStore,
            resettingPoints,
            addedOrRemovedIndex
        }
    },
    computed: {
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
    },
    mounted () {
    },
    methods: {
        addedOrRemovedPoint() {
            this.resettingPoints = true;
            this.addedOrRemovedIndex = true;
            this.$emit('updatedTime');
            setTimeout(() => this.resettingPoints = false, 100);
        },
        labelChanged(value) {
            this.$emit("labelChanged");
        },
    }
}
</script>

<template>
    <div class="container-flex text-white mt-2 mb-3 pb-3 border-bottom">
        <!-- <label class="fs-4 row" :class="titleColor(signalDescriptor)">Waveform for {{signalDescriptor}}</label> -->
        <div></div>
        <ElementFromList class="border-bottom pb-2 mb-1"
            v-if="modelValue[signalDescriptor] != null"
            :name="'label'"
            :dataTestLabel="dataTestLabel + '-Label'"
            :options="Object.values(WaveformLabel)"
            :titleSameRow="true"
            :replaceTitle="'Waveform'"
            v-model="modelValue[signalDescriptor].processed"
            :valueFontSize="styleStore.operatingPoints.inputFontSize"
            :labelFontSize="styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor='styleStore.operatingPoints.inputLabelBgColor'
            :valueBgColor='styleStore.operatingPoints.inputValueBgColor'
            :textColor='styleStore.operatingPoints.inputTextColor'
            @update="labelChanged"
        />
        <div v-if="modelValue[signalDescriptor] != null" v-for="(value, key) in modelValue[signalDescriptor].waveform.data">
            <WaveformInputCustomPoint
                v-if="!resettingPoints || addedOrRemovedIndex>=key"
                :modelValue="modelValue[signalDescriptor].waveform"
                :name="key"
                :dataTestLabel="dataTestLabel + '-WaveformInputCustomPoint-' + key"
                :signalDescriptor="signalDescriptor"
                @updatedTime="$emit('updatedTime')"
                @updatedData="$emit('updatedData')"
                @addedOrRemovedPoint="addedOrRemovedPoint(key)"
                />
                <div v-else style="height: 40px;"></div>
        </div>
        <button
            v-if="induceableSignal"
            :style="combinedStyle([styleStore.operatingPoints.inputFontSize, signalDescriptor == 'current'? styleStore.operatingPoints.currentBgColor : signalDescriptor == 'voltage'? styleStore.operatingPoints.voltageBgColor : styleStore.operatingPoints.commonParameterBgColor])"
            class="btn offset-2 col-8 mt-2 p-0"
            @click="$emit('induce')"
            style="max-height: 1.7em">
            {{'Induce from ' + (signalDescriptor == 'current'? 'voltage' : 'current')}}
            <i class="fa-solid fa-bolt"></i>
            <i class="fa-solid fa-magnet"></i>
        </button>
    </div>
</template>

