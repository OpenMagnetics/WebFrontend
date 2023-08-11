<script setup>
import WaveformInputCustomPoint from '/src/components/Synthesis/OperatingPoints/WaveformInputCustomPoint.vue'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import { WaveformLabel } from '/src/assets/ts/MAS.ts'
import { minimumMaximumScalePerParameter, titleColor } from '/src/assets/js/defaults.js'

// const props = defineProps({
//     electricalParameter: {
//         type: String,
//         required: false,
//         default: "current",
//     },
//     isChartReady: {
//         type: Boolean,
//         required: false,
//         default: false,
//     },
// })
// const precision = Defaults.defaultPrecision

// var store
// var commonStore = useCommonStore()
// if (props.electricalParameter == "current") {
//     store = useCurrentStore()
// } else {
//     store = useVoltageStore()
// }
// const defaultData = [{x: 0, y: -Defaults.defaultPeakToPeak / 2 },
//                      {x: Defaults.defaultDutyCycle, y: Defaults.defaultPeakToPeak / 2 },
//                      {x: 1, y: -Defaults.defaultPeakToPeak / 2 }]
// const data = props.isChartReady? ref(Utils.deepCopy(store.getDataPoints.value)) : ref(defaultData)

// if (store.isDataImported.value) {
//     data.value = store.getDataPoints.value
//     store.setDataImported(false)
// }
// var switchingFrequency = ref(commonStore.getSwitchingFrequency.value)

// function getParamsFromDataPoints(dataPoints, precision) {
//     if (dataPoints == null){
//         dataPoints = Utils.deepCopy(defaultData)
//     }
//     var peakToPeakValue = Utils.roundWithDecimals(Math.abs(dataPoints[1].y - dataPoints[0].y), Math.pow(10, precision))
//     var offsetValue = Utils.roundWithDecimals((dataPoints[0].y + dataPoints[1].y) / 2, Math.pow(10, precision))
//     var dutyCycleValue = Utils.roundWithDecimals((dataPoints[1].x - dataPoints[0].x) / (dataPoints[2].x - dataPoints[0].x), Math.pow(10, precision))
//     return {peakToPeakValue, offsetValue, dutyCycleValue}
// }

// function getDataPointsFromParams(params) {
//     const aux = [{x: 0, y: Number(params['offset']) - Number(params['peakToPeak']) / 2 }, {x: Number(Math.abs(params['dutyCycle']) % 1), y: Number(params['offset']) + Number(params['peakToPeak']) / 2 }, {x: 1, y: Number(params['offset']) - Number(params['peakToPeak']) / 2 } ]
//     return aux
// }


// onMounted(() => {
//     if (props.isChartReady) {
//         switchingFrequency = commonStore.getSwitchingFrequency;
//         data.value = Utils.deepCopy(store.getDataPoints.value)
//     }

//     store.$onAction((action) => {
//         if (action.name == "setChartReady") {
//             store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
//         }
//         else if (action.name == "setDataPointsFromDragging" || action.name == "setDataPointsFromFile") {
//             const dataPoints = action.args[0]
//             data.value = Utils.deepCopy(dataPoints)
//         }
//     })
//     commonStore.$onAction((action) => {
//         if (action.name == "setSwitchingFrequency") {
//             switchingFrequency.value = action.args[0]
//             store.setDataPoints(Utils.deepCopy(Utils.scaleData(data.value, switchingFrequency.value)));
//         }
//     })
//     store.setNewWaveformType()
// })

// const orderedData = computed(() => {
//     return Utils.scaleData(data.value, switchingFrequency.value)
// })


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

