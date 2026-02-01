<script setup>
import WaveformInputCustomPoint from './WaveformInputCustomPoint.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import { WaveformLabel } from '/WebSharedComponents/assets/ts/MAS.ts'
import { minimumMaximumScalePerParameter } from '/WebSharedComponents/assets/js/defaults.js'
import { toTitleCase, combinedStyle } from '/WebSharedComponents/assets/js/utils.js'

</script>

<script>
export default {
    emits: ["labelChanged"],
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
            default: () => ({})
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        var resettingPoints = false;
        var addedOrRemovedIndex = 0;
        var showAllPoints = false;
        return {
            resettingPoints,
            addedOrRemovedIndex,
            showAllPoints
        }
    },
    computed: {
        induceableSignal() {
            if (this.signalDescriptor == 'current') {
                return true;
            }
            else {
                const label = this.modelValue.current?.processed?.label;
                return label != "Rectangular" && label != "Bipolar Rectangular" && label != "Unipolar Rectangular";
            }
        }
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
            :valueFontSize="$styleStore.operatingPoints.inputFontSize"
            :labelFontSize="$styleStore.operatingPoints.inputTitleFontSize"
            :labelBgColor="$styleStore.operatingPoints.inputLabelBgColor"
            :valueBgColor="$styleStore.operatingPoints.inputValueBgColor"
            :textColor="$styleStore.operatingPoints.inputTextColor"
            @update="labelChanged"
        />
        <div v-if="modelValue[signalDescriptor] != null">
            <template v-for="(value, key) in modelValue[signalDescriptor].waveform.data" :key="key">
                <WaveformInputCustomPoint
                    v-if="(!resettingPoints || addedOrRemovedIndex>=key) && (showAllPoints || key < 3 || Object.keys(modelValue[signalDescriptor].waveform.data).length <= 3)"
                    :modelValue="modelValue[signalDescriptor].waveform"
                    :name="key"
                    :dataTestLabel="dataTestLabel + '-WaveformInputCustomPoint-' + key"
                    :signalDescriptor="signalDescriptor"
                    @updatedTime="$emit('updatedTime')"
                    @updatedData="$emit('updatedData')"
                    @addedOrRemovedPoint="addedOrRemovedPoint(key)"
                    />
                    <div v-else-if="resettingPoints && addedOrRemovedIndex<key" style="height: 40px;"></div>
            </template>
            <button
                v-if="Object.keys(modelValue[signalDescriptor].waveform.data).length > 3"
                class="btn btn-outline-secondary col-12 mt-1 py-0"
                style="font-size: 0.75em;"
                @click="showAllPoints = !showAllPoints">
                <i :class="showAllPoints ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
                {{ showAllPoints ? 'Show less' : `Show ${Object.keys(modelValue[signalDescriptor].waveform.data).length - 3} more points` }}
            </button>
        </div>
        <button
            v-if="induceableSignal"
            :style="combinedStyle([$styleStore.operatingPoints.inputFontSize, signalDescriptor == 'current'? $styleStore.operatingPoints.currentBgColor : signalDescriptor == 'voltage'? $styleStore.operatingPoints.voltageBgColor : $styleStore.operatingPoints.commonParameterBgColor])"
            class="btn offset-2 col-8 mt-2 p-0"
            @click="$emit('induce')"
            style="max-height: 1.7em">
            {{'Induce from ' + (signalDescriptor == 'current'? 'voltage' : 'current')}}
            <i class="fa-solid fa-bolt"></i>
            <i class="fa-solid fa-magnet"></i>
        </button>
    </div>
</template>

