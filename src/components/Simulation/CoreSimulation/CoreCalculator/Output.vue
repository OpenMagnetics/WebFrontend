<script setup>
import * as Utils from '/src/assets/js/utils.js'
import { useCoreStore } from '/src/stores/core'
import * as Defaults from '/src/assets/js/defaults.js'
import { useSimulationStore } from '/src/stores/simulation'

</script>
<script>

export default {
    data() {
        const posting = false;
        const coreStore = useCoreStore();
        const simulationStore = useSimulationStore();
        return {
            posting,
            simulationStore,
            coreStore,
            maximumCoreTemperatureRise: "",
            eddyCurrentLosses: "",
            hysteresisLosses: "",
            magneticFluxDensityPeak: "",
            magneticFluxDensityAcPeak: "",
            totalCoreLosses: "",
            totalCoreLossesUnit: '',
            volumetricCoreLosses: "",
            volumetricCoreLossesUnit: '',
            apparentPower: "",
            apparentPowerUnit: '',
            voltageRms: "",
            voltageRmsUnit: '',
            currentRms: "",
            currentRmsUnit: '',
            maximumCoreTemperatureRiseUnit: '',
            eddyCurrentLossesUnit: '',
            hysteresisLossesUnit: '',
            magneticFluxDensityPeakUnit: '',
            magneticFluxDensityAcPeakUnit: '',
            tryingToSend: false,
            recentChange: false,
            hasError: false,
        }
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
            return {
                    theme: {
                        placement: relative_placement,
                        width: '200px',
                        "text-align": "center",
                    },
                }
        },
    },
    methods: {
        formatOutputs(value) {
            var aux = Utils.formatPower(value['totalLosses'])
            this.totalCoreLosses = Utils.removeTrailingZeroes(aux['label'], 2)
            this.totalCoreLossesUnit = aux['unit']
            var aux = Utils.formatPowerDensity(value['totalVolumetricLosses'])
            console.log("Ea")
            console.log(aux)
            console.log(value['totalVolumetricLosses'])
            this.volumetricCoreLosses = Utils.removeTrailingZeroes(aux['label'], 2)
            this.volumetricCoreLossesUnit = aux['unit']

            if ('eddyCurrentLosses' in value) {
                aux = Utils.formatPower(value['eddyCurrentLosses'])
                this.eddyCurrentLosses = Utils.removeTrailingZeroes(aux['label'], 2)
                this.eddyCurrentLossesUnit = aux['unit']
            }
            else{
                this.eddyCurrentLosses = 'N/A'
                this.eddyCurrentLossesUnit = ''
            }
            if ('hysteresisLosses' in value) {
                aux = Utils.formatPower(value['hysteresisLosses'])
                this.hysteresisLosses = Utils.removeTrailingZeroes(aux['label'], 2)
                this.hysteresisLossesUnit = aux['unit']
            }
            else{
                this.hysteresisLosses = 'N/A'
                this.hysteresisLossesUnit = ''
            }

            aux = Utils.formatMagneticFluxDensity(value['magneticFluxDensityPeak'])
            this.magneticFluxDensityPeak = Utils.removeTrailingZeroes(aux['label'], 2)
            this.magneticFluxDensityPeakUnit = aux['unit']

            aux = Utils.formatMagneticFluxDensity(value['magneticFluxDensityAcPeak'])
            this.magneticFluxDensityAcPeak = Utils.removeTrailingZeroes(aux['label'], 2)
            this.magneticFluxDensityAcPeakUnit = aux['unit']

            aux = Utils.formatVoltage(value['voltageRms'])
            this.voltageRms = Utils.removeTrailingZeroes(aux['label'], 2)
            this.voltageRmsUnit = aux['unit']

            aux = Utils.formatCurrent(value['currentRms'])
            this.currentRms = Utils.removeTrailingZeroes(aux['label'], 2)
            this.currentRmsUnit = aux['unit']

            aux = Utils.formatApparentPower(value['apparentPower'])
            this.apparentPower = Utils.removeTrailingZeroes(aux['label'], 2)
            this.apparentPowerUnit = aux['unit']

            aux = Utils.formatTemperature(value['maximumCoreTemperatureRise'])
            this.maximumCoreTemperatureRise = Utils.removeTrailingZeroes(aux['label'], 2)
            this.maximumCoreTemperatureRiseUnit = aux['unit']

        },
        computeCoreLosses() {
            const url = import.meta.env.VITE_API_ENDPOINT + '/get_core_losses'

            const globalSimulation = Utils.deepCopy(this.$userStore.globalSimulation)

            const operationPoint = globalSimulation['inputs']['operationPoints'][0]['excitationsPerWinding'][0]
            if ('voltage' in operationPoint && this.$userStore.simulationUseCurrentAsInput == 1) {
                delete operationPoint['voltage'];
            }

            if ('current' in operationPoint && this.$userStore.simulationUseCurrentAsInput == 0) {
                delete operationPoint['current'];
            }

            if (typeof(globalSimulation['magnetic']['core']['functionalDescription']['material']) != 'string') {
                globalSimulation['magnetic']['core']['functionalDescription']['material'] = globalSimulation['magnetic']['core']['functionalDescription']['material']['name']
            }
            const data = {}
            data['simulation'] = globalSimulation
            if (!('gapReluctance' in this.$userStore.selectedModels)) {
                this.$userStore.selectedModels['gapReluctance'] = Defaults.reluctanceModelDefault
            }
            if (!('coreLosses' in this.$userStore.selectedModels)) {
                this.$userStore.selectedModels['coreLosses'] = Defaults.coreLossesModelDefault
            }
            if (!('coreTemperature' in this.$userStore.selectedModels)) {
                this.$userStore.selectedModels['coreTemperature'] = Defaults.coreTemperatureModelDefault
            }
            data['models'] = {coreLosses: this.$userStore.selectedModels['coreLosses'].toUpperCase(),
                              coreTemperature: this.$userStore.selectedModels['coreTemperature'].toUpperCase(),
                              gapReluctance: this.$userStore.selectedModels['gapReluctance'].toUpperCase().replace(" ", "_")}
            this.$axios.post(url, data)
            .then(response => {
                this.tryingToSend = false
                this.formatOutputs(response.data)
            })
            .catch(error => {
                this.tryingToSend = false
                console.error("Error getting core losses, resetting store")
                console.error(error.data)
                // this.$userStore.reset()
            });
        },
        tryToSend() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (!this.hasError) {
                        if (this.recentChange) {
                            this.tryingToSend = false
                            this.tryToSend()
                        }
                        else {
                            this.computeCoreLosses()
                        }
                    }
                }
                , 500);
            }
        },
    },
    mounted() {
        this.simulationStore.$onAction((action) => {
            if (action.name == "calculateCoreLosses") {
                setTimeout(() => this.tryToSend(), 10);
            }
        })
    }
}
</script>


<template>
    <div v-tooltip="styleTooltip" class="container-flex text-white mt-4 mb-3 pb-3 border-bottom me-2">
        <div class="row gx-5">
            <label class="fs-4 ms-3 mb-3 text-white col-12 text-center"> Outputs for core</label>
            <div class="col-xl-6 col-lg-12">
                <div class="container">
                    <div class="row">
                        <label v-tooltip="'Total losses of the magnetic core'" class="m-0 p-0 fs-5 col-8">Total core losses:</label>
                        <label data-test="SimulationCoreCalculatorOutput-totalCoreLosses-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{totalCoreLosses + ' ' + totalCoreLossesUnit}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'Volumetric losses of the magnetic core'" class="m-0 p-0 fs-5 col-8">Volumetric core losses:</label>
                        <label data-test="SimulationCoreCalculatorOutput-volumetricCoreLosses-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{volumetricCoreLosses + ' ' + volumetricCoreLossesUnit}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'Losses of the magnetic core due to eddy currents'" class="m-0 p-0 fs-5 col-8">Eddy Curr. losses:</label>
                        <label data-test="SimulationCoreCalculatorOutput-eddyCurrentLosses-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{eddyCurrentLosses + ' ' + eddyCurrentLossesUnit}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'Losses of the magnetic core due to hysteresis'" class="m-0 p-0 fs-5 col-8">Hysteresis losses:</label>
                        <label data-test="SimulationCoreCalculatorOutput-hysteresisLosses-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{hysteresisLosses + ' ' + hysteresisLossesUnit}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'Maximum temperature rise in the magnetic core'" class="m-0 p-0 fs-5 col-8">Max. Temp Rise:</label>
                        <label data-test="SimulationCoreCalculatorOutput-maximumCoreTemperatureRise-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{maximumCoreTemperatureRise + ' ' + maximumCoreTemperatureRiseUnit}}</label>
                    </div>
                </div>
            </div>
            <div class="col-xl-6 col-lg-12">
                <div class="container">
                    <div class="row">
                        <label v-tooltip="'Maximum value that of the magnetic flux density inside the core'" class="m-0 p-0 fs-5 col-8">Peak B (Bmax):</label>
                        <label data-test="SimulationCoreCalculatorOutput-magneticFluxDensityPeak-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{magneticFluxDensityPeak + ' ' + magneticFluxDensityPeakUnit}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'AC peak value of the magnetic flux density, without taking into account the DC bias'" class="m-0 p-0 fs-5 col-8">AC peak B:</label>
                        <label data-test="SimulationCoreCalculatorOutput-magneticFluxDensityAcPeak-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{magneticFluxDensityAcPeak + ' ' + magneticFluxDensityAcPeakUnit}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'Power that is falling in the magnetic'" class="m-0 p-0 fs-5 col-8">Apparent Power:</label>
                        <label data-test="SimulationCoreCalculatorOutput-apparentPower-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{apparentPower + ' ' + apparentPowerUnit}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'RMS voltage that is falling in the magnetic'" class="m-0 p-0 fs-5 col-8">Voltage RMS:</label>
                        <label data-test="SimulationCoreCalculatorOutput-voltageRms-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{voltageRms + ' ' + voltageRmsUnit}}</label>
                    </div>
                    <div class="row">
                        <label v-tooltip="'RMS current that is falling in the magnetic'" class="m-0 p-0 fs-5 col-8">Current RMS:</label>
                        <label data-test="SimulationCoreCalculatorOutput-currentRms-text" class="fs-5 bg-dark text-white float-end m-0 p-0 col-4" style=" text-align:right;">{{currentRms + ' ' + currentRmsUnit}}</label>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

