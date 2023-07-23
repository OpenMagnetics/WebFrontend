<script setup>
import { getOperationPointData } from '/src/assets/js/utils.js'
import { useCurrentStore,
         useVoltageStore,
         useCommonStore } from '/src/stores/waveform'
import * as download from 'downloadjs'
</script>

<script>
export default {
    emits: ['exported'],
    components: {
    },
    props: {
    },
    data() {

        const commonStore = useCommonStore()
        const currentStore = useCurrentStore()
        const voltageStore = useVoltageStore()
        const waveformTypePicked = "compressedWaveform"
        const numberEquidistantPointsPicked = 512
        const waveformAndProcessedPicked = "onlyWaveform"
        const waveformAndFourierPicked = "withoutHarmonics"
        const exported = false
        return {
            commonStore,
            currentStore,
            voltageStore,
            waveformTypePicked,
            numberEquidistantPointsPicked,
            waveformAndProcessedPicked,
            waveformAndFourierPicked,
            exported,
        }
    },
    methods: {
        onExport(event) {
            const configuration = {
                numberPoints: this.numberEquidistantPointsPicked,
                exportEquidistant: this.waveformTypePicked == "equidistantWaveform",
                includeProcessed: this.waveformAndProcessedPicked == "waveformAndProcessed",
                includeHarmonics: this.waveformAndFourierPicked == "withHarmonics"
            }
            const exportedData = getOperationPointData(this.commonStore, this.currentStore, this.voltageStore, configuration)
            download(JSON.stringify(exportedData, null, 4), this.commonStore.operationPointName + ".json", "text/plain");
            this.$emit("exported")
            this.exported = true
            setTimeout(() => this.exported = false, 2000);
        }

    },
    computed: {

    },
    mounted() {
    },
}

</script>

<template>
    <div class="offcanvas offcanvas-end bg-light" tabindex="-1" id="ExportOffCanvas" aria-labelledby="UserOffCanvasLabel">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title text-white fs-3" id="UserOffCanvasLabel">Export options</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="ExportOffCanvasClose"></button>
    </div>
    <div class="offcanvas-body">
        <div class="accordion " id="accordionAdvancedOptions">
            <div class="border-primary accordion-item">
                <h2 class="accordion-header bg-light" id="headingOne">
                    <button data-test-id="OperationPointExport-configuration-menu-button" class="accordion-button bg-light text-primary border-primary collapsed fs-5" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
                        Configuration
                    </button>
                </h2>
                <div id="collapseOne" class="accordion-collapse collapse bg-light text-primary" aria-labelledby="headingOne" data-bs-parent="#accordionAdvancedOptions">
                    <div class="accordion-body">
                        <div class="mt-2">
                            <label class="fs-5 text-white mt-3 mb-2"> How do you want to export your data? </label>
                            <div class="form-check">
                                <input data-test-id="OperationPointExport-configuration-compressed-waveformType-radio" class="form-check-input" type="radio" name="waveformTypeRadio" id="waveformTypeRadioCompressed" v-model="waveformTypePicked" value="compressedWaveform">
                                <label class="form-check-label text-white" for="waveformTypeRadioCompressed">
                                    in MAS format. Lossless and recommended
                                </label>
                            </div>
                            <div class="form-check">
                                <input data-test-id="OperationPointExport-configuration-equidistant-waveformType-radio-input" class="form-check-input" type="radio" name="waveformTypeRadio" id="waveformTypeRadioEquidistant" v-model="waveformTypePicked" value="equidistantWaveform">
                                <label class="form-check-label text-white" for="waveformTypeRadioEquidistant">
                                    With equidistant points. Some signal information may be lost due to sampling.
                                </label>
                            </div>
                        </div>

                        <div class="mt-2">
                            <label class="fs-5 text-white mt-5 mb-2"> Choose number of equidistant points </label>
                            <select data-test-id="OperationPointExport-configuration-number-equidistant-points-select-input" :disabled="waveformTypePicked != 'equidistantWaveform'" class="form-select bg-light text-white" aria-label="Select number points" v-model="numberEquidistantPointsPicked">
                                <option data-test-id="OperationPointExport-configuration-number-equidistant-points-NA-option-input" v-if="waveformTypePicked != 'equidistantWaveform'" value="disabled">Not available for minimum points mode</option>
                                <option data-test-id="OperationPointExport-configuration-number-equidistant-points-128-option-input" v-if="waveformTypePicked == 'equidistantWaveform'" value="128">128</option>
                                <option data-test-id="OperationPointExport-configuration-number-equidistant-points-512-option-input" v-if="waveformTypePicked == 'equidistantWaveform'" selected value="512">512</option>
                                <option data-test-id="OperationPointExport-configuration-number-equidistant-points-2048-option-input" v-if="waveformTypePicked == 'equidistantWaveform'" value="2048">2048</option>
                            </select>
                        </div>

                        <div class="mt-2">
                            <label class="fs-5 text-white mt-5 mb-2"> Add parameters? </label>
                            <div class="form-check">
                                <input data-test-id="OperationPointExport-configuration-processed-yes-radio-input" class="form-check-input" type="radio" name="waveformAndProcessedRadio" id="waveformAndProcessedRadioOnly" value="onlyWaveform" checked v-model="waveformAndProcessedPicked" >
                                <label class="form-check-label text-white" for="waveformAndProcessedRadioOnly">
                                    Export only waveform.
                                </label>
                            </div>
                            <div class="form-check">
                                <input data-test-id="OperationPointExport-configuration-processed-no-radio-input" class="form-check-input" type="radio" name="waveformAndProcessedRadio" id="waveformAndProcessedRadioBoth" value="waveformAndProcessed" v-model="waveformAndProcessedPicked" >
                                <label class="form-check-label text-white" for="waveformAndProcessedRadioBoth">
                                    Export waveform and parameters.
                                </label>
                            </div>
                        </div>

                        <div class="mt-2">
                            <label class="fs-5 text-white mt-5 mb-2"> Add Harmonics? </label>
                            <div class="form-check">
                                <input data-test-id="OperationPointExport-configuration-fourier-yes-radio-input" class="form-check-input" type="radio" name="waveformAndFourierRadio" id="waveformAndFourierRadioOnly" value="withoutHarmonics" checked v-model="waveformAndFourierPicked">
                                <label class="form-check-label text-white" for="waveformAndFourierRadioOnly">
                                    Don't append list of harmonics.
                                </label>
                            </div>
                            <div class="form-check">
                                <input data-test-id="OperationPointExport-configuration-fourier-no-radio-input" class="form-check-input" type="radio" name="waveformAndFourierRadio" id="waveformAndFourierRadioBoth" value="withHarmonics" v-model="waveformAndFourierPicked">
                                <label class="form-check-label text-white" for="waveformAndFourierRadioBoth">
                                    Append list of harmonics (this might increased the size of the file significantly).
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>


        <button data-test-id="OperationPointExport-export-button" class="mt-5 btn text-light bg-primary float-start fs-5 px-4" :disabled="exported" @click="onExport">{{exported? 'Exported' : 'Export'}}</button>
    </div>
</div>

</template>