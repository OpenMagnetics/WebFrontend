<script setup>
import { ref, onMounted } from 'vue'
import * as Defaults from '/src/assets/js/waveformDefaults.js'
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import * as download from 'downloadjs'

const emit = defineEmits(['voltage-type-change', 'current-type-change'])
const commonStore = useCommonStore()
const currentStore = useCurrentStore()
const voltageStore = useVoltageStore()
const fileType = ref(null)
const tryCompressWaveformsPicked = ref("compressWaveforms")
const masFileReader = ref(null)
const isCompressed = ref(true)
const importedCurrentWaveform = ref(true)
const importedVoltageWaveform = ref(true)
const importedFrequency = ref(true)
var currentDataPoints = []
var voltageDataPoints = []
var waitingforCurrentMounted = false
var waitingforVoltageMounted = false
var currentCurrentType = currentStore.getType.value == null? Defaults.defaultCurrentType : currentStore.getType.value
var currentVoltageType = voltageStore.getType.value == null? Defaults.defaultVoltageType : voltageStore.getType.value


function onImport(event) {
    currentDataPoints = Utils.packDataPoints(importedCurrentWaveform.value, importedFrequency.value, tryCompressWaveformsPicked.value == "compressWaveforms")
    voltageDataPoints = Utils.packDataPoints(importedVoltageWaveform.value, importedFrequency.value, tryCompressWaveformsPicked.value == "compressWaveforms")
    var voltageType
    var currentType

    if ("ancillaryLabel" in importedVoltageWaveform.value) {
        voltageType = importedVoltageWaveform.value["ancillaryLabel"]
        emit("voltage-type-change", importedVoltageWaveform.value["ancillaryLabel"])
    }
    else {
        voltageType = Utils.tryGuessType(voltageDataPoints, importedFrequency.value)
        emit("voltage-type-change", voltageType)
    }

    if ("ancillaryLabel" in importedCurrentWaveform.value) {
        currentType = importedCurrentWaveform.value["ancillaryLabel"]
        emit("current-type-change", importedCurrentWaveform.value["ancillaryLabel"])
    }
    else {
        currentType = Utils.tryGuessType(currentDataPoints, importedFrequency.value)
        emit("current-type-change", currentType)
    }
    if (currentType != currentCurrentType) {
        waitingforCurrentMounted = true
        currentCurrentType = currentType
    }
    else {
        currentStore.setDataPointsFromFile(currentDataPoints)
    }
    if (voltageType != currentVoltageType) {
        waitingforVoltageMounted = true
        currentVoltageType = voltageType
    }
    else {
        voltageStore.setDataPointsFromFile(voltageDataPoints)
    }
}

onMounted(() => {
    currentStore.$onAction((action) => {
        if (action.name == "setNewWaveformType" && waitingforCurrentMounted) {
            waitingforCurrentMounted = false
            setTimeout(() => currentStore.setDataPointsFromFile(currentDataPoints), 100);
        }
    })
    voltageStore.$onAction((action) => {
        if (action.name == "setNewWaveformType" && waitingforVoltageMounted) {
            waitingforVoltageMounted = false
            setTimeout(() => voltageStore.setDataPointsFromFile(voltageDataPoints), 100);
        }
    })
})


function onFileTypeSelected(event) {
    fileType.value = 'MAS'
}

function readMASFile(event) {
    fileType.value = 'MAS'

    const fr = new FileReader();

    fr.onload = e => {
        const data = JSON.parse(e.target.result);
        isCompressed.value = "time" in data["current"]["waveform"]
        importedCurrentWaveform.value = data["current"]["waveform"]
        importedVoltageWaveform.value = data["voltage"]["waveform"]
        importedFrequency.value = data["frequency"]
    }
    fr.readAsText(masFileReader.value.files.item(0));
}

</script>

<template>
    <div class="offcanvas offcanvas-start bg-light" tabindex="-1" id="ImportOffCanvas" aria-labelledby="UserOffCanvasLabel">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title text-white fs-3" id="UserOffCanvasLabel">Import options</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body">
        <div class="mt-2">
            <label class="fs-5 text-white mt-3 mb-2"> Where do you want to import your data from? </label>
            <div class="btn-group-vertical my-3" role="group" aria-label="Vertical button group">
                <button type="button" @click="onFileTypeSelected" class="btn btn-primary mt-1 rounded-3">Magnetic Agnostic Structure file</button>
                <button type="button" class="btn btn-primary mt-1 rounded-3 disabled">CSV file (coming soon)</button>
                <button type="button" class="btn btn-primary mt-1 rounded-3 disabled">Simba (coming soon)</button>
                <button type="button" class="btn btn-primary mt-1 rounded-3 disabled">LTSpice (coming soon)</button>
                <button type="button" class="btn btn-primary mt-1 rounded-3 disabled">PSIM (coming soon)</button>
            </div>
        </div>

        <div v-if="fileType != null">
            <label class="fs-5 text-white mt-3 mb-2"> Configuration </label>

            <input v-if="fileType == 'MAS'" type="file" ref="masFileReader" @change="readMASFile()" class="btn btn-primary mt-1 rounded-3"/>

            <div class="mt-2" v-if="!isCompressed">
                <label class="fs-5 text-white mt-5 mb-2"> Try to compress waveforms? </label>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="tryCompressWaveforms" id="doTryCompressWaveforms" value="compressWaveforms" checked v-model="tryCompressWaveformsPicked">
                    <label class="form-check-label text-white" for="doTryCompressWaveforms">
                        Yes, reduce the number of points in the graph
                    </label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="radio" name="tryCompressWaveforms" id="dontTryCompressWaveformsBoth" value="keepUncompressedWaveforms" v-model="tryCompressWaveformsPicked">
                    <label class="form-check-label text-white" for="dontTryCompressWaveformsBoth">
                        No, keep as it is.
                    </label>
                </div>
            </div>
        </div>


        <button class="mt-5 btn text-light bg-primary float-start fs-5 px-4" data-bs-dismiss="offcanvas" @click="onImport">Import</button>
    </div>
</div>

</template>