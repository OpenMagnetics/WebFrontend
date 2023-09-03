<script setup>
</script>

<script>

export default {
    emits: ['importData'],
    components: {
    },
    props: {
    },
    data() {
        const fileType = null;
        const tryCompressWaveformsPicked = "compressWaveforms";
        const isCompressed = true;
        const dataToBeImported = {};

        return {
            fileType,
            tryCompressWaveformsPicked,
            isCompressed,
            dataToBeImported,
        }
    },
    methods: {
        onImport(event) {
            console.log(this.dataToBeImported);
            
            this.$emit('importData', this.dataToBeImported);
        },
        onFileTypeSelected(event) {
            this.fileType = 'MAS'
        },
        readMASFile(event) {
            this.fileType = 'MAS'
            this.isCompressed = false

            const fr = new FileReader();

            fr.onload = e => {
                const data = JSON.parse(e.target.result);
                this.isCompressed = "time" in data["current"]["waveform"] && "time" in data["voltage"]["waveform"];
                this.dataToBeImported = data;
            }
            fr.readAsText(this.$refs.masFileReader.files.item(0));
        },
    },
    computed: {

    },
    mounted() {
    },
}

</script>

<template>
    <div class="offcanvas offcanvas-start bg-light" tabindex="-1" id="ImportOffCanvas" aria-labelledby="UserOffCanvasLabel">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title text-white fs-3" id="UserOffCanvasLabel">Import options</h5>
        <button data-cy="OperationPointImport-corner-close-modal-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="ImportOffCanvasClose"></button>
    </div>
    <div class="offcanvas-body">
        <div class="mt-2">
            <label class="fs-5 text-white mt-3 mb-2"> Where do you want to import your data from? </label>
            <div class="btn-group-vertical my-3" role="group" aria-label="Vertical button group">
                <button data-cy="OperationPointImport-source-MAS-button" type="button" @click="onFileTypeSelected" class="btn btn-primary mt-1 rounded-3">Magnetic Agnostic Structure file</button>
                <button data-cy="OperationPointImport-source-CSV-button" type="button" class="btn btn-primary mt-1 rounded-3 disabled">CSV file (coming soon)</button>
                <button data-cy="OperationPointImport-source-Simba-button" type="button" class="btn btn-primary mt-1 rounded-3 disabled">Simba (coming soon)</button>
                <button data-cy="OperationPointImport-source-LTSPice-button" type="button" class="btn btn-primary mt-1 rounded-3 disabled">LTSpice (coming soon)</button>
                <button data-cy="OperationPointImport-source-PSIM-button" type="button" class="btn btn-primary mt-1 rounded-3 disabled">PSIM (coming soon)</button>
            </div>
        </div>

        <div v-if="fileType != null">
            <label class="fs-5 text-white mt-3 mb-2"> Configuration </label>

            <input v-if="fileType == 'MAS'" type="file" ref="masFileReader" @change="readMASFile" class="btn btn-primary mt-1 rounded-3"/>

            <div class="mt-2" v-if="!isCompressed">
                <label class="fs-5 text-white mt-5 mb-2"> Try to compress waveforms? </label>
                <div class="form-check">
                    <input data-cy="OperationPointImport-do-compress-waveform-radio" class="form-check-input" type="radio" name="tryCompressWaveforms" id="doTryCompressWaveforms" value="compressWaveforms" checked v-model="tryCompressWaveformsPicked">
                    <label class="form-check-label text-white" for="doTryCompressWaveforms">
                        Yes, reduce the number of points in the graph
                    </label>
                </div>
                <div class="form-check">
                    <input data-cy="OperationPointImport-dont-compress-waveform-radio" class="form-check-input" type="radio" name="tryCompressWaveforms" id="dontTryCompressWaveformsBoth" value="keepUncompressedWaveforms" v-model="tryCompressWaveformsPicked">
                    <label class="form-check-label text-white" for="dontTryCompressWaveformsBoth">
                        No, keep as it is.
                    </label>
                </div>
            </div>
        </div>

        <button data-cy="OperationPointImport-import-button" class="mt-5 btn text-light bg-primary float-start fs-5 px-4" data-bs-dismiss="offcanvas" @click="onImport">Import</button>
    </div>
</div>

</template>