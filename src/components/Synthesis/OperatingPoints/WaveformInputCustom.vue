<script setup>
import WaveformInputCustomPoint from '/src/components/Synthesis/OperatingPoints/WaveformInputCustomPoint.vue'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import { WaveformLabel } from '/src/assets/ts/MAS.ts'
import { minimumMaximumScalePerParameter, titleColor } from '/src/assets/js/defaults.js'

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
        var resettingPoints = false;
        var addedOrRemovedIndex = 0;
        return {
            resettingPoints,
            addedOrRemovedIndex
        }
    },
    computed: {
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
        <label class="fs-4 row" :class="titleColor(signalDescriptor)">Waveform for {{signalDescriptor}}</label>
        <div></div>
        <ElementFromList class="border-bottom pb-2 mb-1"
            :name="'label'"
            :dataTestLabel="dataTestLabel + '-Label'"
            :options="WaveformLabel"
            :titleSameRow="true"
            :replaceTitle="'Waveform'"
            v-model="this.modelValue[signalDescriptor].processed"
            @updatedNumberElements="labelChanged"
        />
        <div v-for="(value, key) in modelValue[signalDescriptor].waveform.data">
            <WaveformInputCustomPoint
                v-if="!resettingPoints || addedOrRemovedIndex>=key"
                :modelValue="modelValue[signalDescriptor].waveform"
                :name="key"
                :dataTestLabel="dataTestLabel + '-WaveformInputCustomPoint-' + signalDescriptor + '-' + key"
                :signalDescriptor="signalDescriptor"
                @updatedTime="$emit('updatedTime')"
                @updatedData="$emit('updatedData')"
                @addedOrRemovedPoint="addedOrRemovedPoint(key)"
                />
                <div v-else style="height: 40px;"></div>
        </div>
    </div>
</template>

