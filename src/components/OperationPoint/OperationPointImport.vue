<script setup>
import { defaultCurrentType, defaultVoltageType } from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import * as download from 'downloadjs'
</script>

<script>

export default {
    emits: ['voltage-type-change', 'current-type-change', 'switching-frequency-change'],
    components: {
    },
    props: {
    },
    data() {

        const commonStore = useCommonStore()
        const currentStore = useCurrentStore()
        const voltageStore = useVoltageStore()
        const fileType = null
        const tryCompressWaveformsPicked = "compressWaveforms"
        const isCompressed = true
        const importedCurrentWaveform = true
        const importedVoltageWaveform = true
        const importedFrequency = true
        var currentDataPoints = []
        var voltageDataPoints = []
        var waitingforCurrentMounted = false
        var waitingforVoltageMounted = false
        var currentCurrentType = currentStore.type == null? defaultCurrentType : currentStore.type
        var currentVoltageType = voltageStore.type == null? defaultVoltageType : voltageStore.type

        return {
            commonStore,
            currentStore,
            voltageStore,
            fileType,
            tryCompressWaveformsPicked,
            isCompressed,
            importedCurrentWaveform,
            importedVoltageWaveform,
            importedFrequency,
            currentDataPoints,
            voltageDataPoints,
            waitingforCurrentMounted,
            waitingforVoltageMounted,
            currentCurrentType,
            currentVoltageType,
        }
    },
    methods: {
        onImport(event) {
            this.currentDataPoints = Utils.packDataPoints(this.importedCurrentWaveform, this.importedFrequency, this.tryCompressWaveformsPicked == "compressWaveforms")
            this.voltageDataPoints = Utils.packDataPoints(this.importedVoltageWaveform, this.importedFrequency, this.tryCompressWaveformsPicked == "compressWaveforms")
            var voltageType
            var currentType

            this.commonStore.setSwitchingFrequencyFromImport(this.importedFrequency)

            if ("ancillaryLabel" in this.importedVoltageWaveform) {
                voltageType = this.importedVoltageWaveform["ancillaryLabel"]
                this.$emit("voltage-type-change", this.importedVoltageWaveform["ancillaryLabel"])
            }
            else {
                voltageType = Utils.tryGuessType(this.voltageDataPoints, this.importedFrequency)
                this.$emit("voltage-type-change", voltageType)
            }

            if ("ancillaryLabel" in this.importedCurrentWaveform) {
                currentType = this.importedCurrentWaveform["ancillaryLabel"]
                this.$emit("current-type-change", this.importedCurrentWaveform["ancillaryLabel"])
            }
            else {
                currentType = Utils.tryGuessType(this.currentDataPoints, this.importedFrequency)
                this.$emit("current-type-change", currentType)
            }
            if (currentType != this.currentCurrentType) {
                this.waitingforCurrentMounted = true
                this.currentCurrentType = currentType
            }
            else {
                this.currentStore.setDataPointsFromFile(this.currentDataPoints)
            }
            if (voltageType != this.currentVoltageType) {
                this.waitingforVoltageMounted = true
                this.currentVoltageType = voltageType
            }
            else {
                this.voltageStore.setDataPointsFromFile(this.voltageDataPoints)
            }
        },
        onFileTypeSelected(event) {
            this.fileType = 'MAS'
        },
        readMASFile(event) {
            this.fileType = 'MAS'

            const fr = new FileReader();

            fr.onload = e => {
                const data = JSON.parse(e.target.result);
                this.isCompressed = "time" in data["current"]["waveform"]
                this.importedCurrentWaveform = data["current"]["waveform"]
                this.importedVoltageWaveform = data["voltage"]["waveform"]
                this.importedFrequency = data["frequency"]
            }
            fr.readAsText(this.$refs.masFileReader.files.item(0));
        },
    },
    computed: {

    },
    mounted() {
        this.currentStore.$onAction((action) => {
            if (action.name == "setNewWaveformType" && this.waitingforCurrentMounted) {
                this.waitingforCurrentMounted = false
                setTimeout(() => this.currentStore.setDataPointsFromFile(this.currentDataPoints), 100);
            }
        })
        this.voltageStore.$onAction((action) => {
            if (action.name == "setNewWaveformType" && this.waitingforVoltageMounted) {
                this.waitingforVoltageMounted = false
                setTimeout(() => this.voltageStore.setDataPointsFromFile(this.voltageDataPoints), 100);
            }
        })
    },
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