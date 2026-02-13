<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import { defaultCmcWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: 'CmcWizard',
        },
        labelWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-8'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-4'
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const numberPhasesOptions = ['Two phases', 'Three phases'];
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        const errorMessage = "";
        const localData = deepCopy(defaultCmcWizardInputs);
        return {
            masStore,
            taskQueueStore,
            numberPhasesOptions,
            insulationTypes,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            simulationError: "",
            simulationResults: null,
            impedanceChartData: null,
        }
    },
    computed: {
    },
    methods: {
        updateErrorMessage() {
            this.errorMessage = "";
            if (this.localData.mainSignalFrequency <= 0) {
                if (this.errorMessage == "")
                    this.errorMessage = "Main signal frequency must be positive";
            }

            this.localData.extraHarmonics.forEach((elem, index) => {
                if (elem.frequency <= 0) {
                    if (this.errorMessage == "")
                        this.errorMessage = "Harmonic frequency cannot be zero";
                }
                if (elem.amplitude <= 0) {
                    if (this.errorMessage == "")
                        this.errorMessage = "Harmonic amplitude cannot be zero";
                }
            })

            this.localData.impedancePoints.forEach((elem, index) => {
                if (elem.frequency <= 0) {
                    if (this.errorMessage == "")
                        this.errorMessage = "Impedance frequency cannot be zero";
                }
                if (elem.impedance <= 0) {
                    if (this.errorMessage == "")
                        this.errorMessage = "Impedance impedance cannot be zero";
                }
            })

        },
        numberPhasesSelected(numberPhases) {
            this.localData.numberPhases = numberPhases;
            this.updateErrorMessage();
        },
        updateHarmonicPoints(newNumber) {
            if (newNumber > this.localData.extraHarmonics.length) {
                const diff = newNumber - this.localData.extraHarmonics.length;
                for (let i = 0; i < diff; i++) {
                    var newHarmonic;
                    if (this.localData.extraHarmonics.length == 0) {
                        newHarmonic = {
                            frequency: defaultCmcWizardInputs.extraHarmonics[0].frequency,
                            amplitude: defaultCmcWizardInputs.extraHarmonics[0].amplitude,
                        }
                    }
                    else {
                        newHarmonic = {
                            frequency: this.localData.extraHarmonics[this.localData.extraHarmonics.length - 1].frequency * 2,
                            amplitude: this.localData.extraHarmonics[this.localData.extraHarmonics.length - 1].amplitude / 2,
                        }
                    }

                    this.localData.extraHarmonics.push(newHarmonic);
                }
            }
            else if (newNumber < this.localData.extraHarmonics.length) {
                const diff = this.localData.extraHarmonics.length - newNumber;
                this.localData.extraHarmonics.splice(-diff, diff);
            }
            this.updateErrorMessage();
        },
        updateImpedancePoints(newNumber) {
            if (newNumber > this.localData.impedancePoints.length) {
                const diff = newNumber - this.localData.impedancePoints.length;
                for (let i = 0; i < diff; i++) {
                    var newPoint;
                    if (this.localData.impedancePoints.length == 0) {
                        newPoint = {
                            frequency: defaultCmcWizardInputs.impedancePoints[0].frequency,
                            amplitude: defaultCmcWizardInputs.impedancePoints[0].impedance,
                        }
                    }
                    else {
                        newPoint = {
                            frequency: this.localData.impedancePoints[this.localData.impedancePoints.length - 1].frequency * 2,
                            impedance: this.localData.impedancePoints[this.localData.impedancePoints.length - 1].impedance * 2,
                        }
                    }
                    this.localData.impedancePoints.push(newPoint);
                }
            }
            else if (newNumber < this.localData.impedancePoints.length) {
                const diff = this.localData.impedancePoints.length - newNumber;
                this.localData.impedancePoints.splice(-diff, diff);
            }
            this.updateErrorMessage();
        },
        async process() {
            this.masStore.resetMas("filter")
            this.masStore.mas.inputs.designRequirements = {
                name: "My CMC",
                magnetizingInductance: {
                    minimum: this.localData.minimumInductance
                },
                minimumImpedance: [],
                turnsRatios: [],
                insulation: null,
            }

            if (this.localData.insulationType != 'No') {

                this.masStore.mas.inputs.designRequirements.insulation = defaultDesignRequirements.insulation;
                this.masStore.mas.inputs.designRequirements.insulation.insulationType = this.localData.insulationType;
            }

            this.localData.impedancePoints.forEach((point) => {
                this.masStore.mas.inputs.designRequirements.minimumImpedance.push(
                    {
                        frequency: point.frequency,
                        impedance: {magnitude: point.impedance}
                    }
                );
            })
            if (this.localData.numberPhases == 'Two phases') {
                this.masStore.mas.inputs.designRequirements.turnsRatios = [{nominal: 1}];
            }
            else {
                this.masStore.mas.inputs.designRequirements.turnsRatios = [{nominal: 1}, {nominal: 1}];
            }
            const voltageRms = this.localData.mainSignalRmsCurrent * 2 * Math.PI * this.localData.mainSignalFrequency * this.localData.minimumInductance;
            const excitation = {
                frequency: this.localData.mainSignalFrequency,
                current: {
                    harmonics: {
                        frequencies: [0, this.localData.mainSignalFrequency],
                        amplitudes: [0, this.localData.mainSignalRmsCurrent * Math.sqrt(2)],
                    }
                },
                voltage: {
                    processed: {
                        dutyCycle : 0.5,
                        peak : voltageRms * Math.sqrt(2),
                        peakToPeak : voltageRms * Math.sqrt(2) * 2,
                        rms : voltageRms,
                        offset : 0,
                        label: "Sinusoidal"

                    }
                }
            }
            this.localData.extraHarmonics.forEach((harmonic) => {
                excitation.current.harmonics.frequencies.push(harmonic.frequency);
                excitation.current.harmonics.amplitudes.push(harmonic.amplitude);
            })

            {
                excitation.current = await this.taskQueueStore.standardizeSignalDescriptor(excitation.current, this.localData.mainSignalFrequency);
            }


            {
                excitation.voltage = await this.taskQueueStore.standardizeSignalDescriptor(excitation.voltage, this.localData.mainSignalFrequency);
            }


            {
                excitation.voltage.harmonics = await this.taskQueueStore.calculateHarmonics(excitation.voltage.waveform, this.localData.mainSignalFrequency);
                // Prune harmonics to reduce number shown in Fourier graph
                const voltageThreshold = 0.3;
                const mainIndexes = await this.taskQueueStore.getMainHarmonicIndexes(excitation.voltage.harmonics, voltageThreshold, 1);
                const prunedHarmonics = {
                    amplitudes: [excitation.voltage.harmonics.amplitudes[0]],
                    frequencies: [excitation.voltage.harmonics.frequencies[0]]
                };
                for (let i = 0; i < mainIndexes.length; i++) {
                    prunedHarmonics.amplitudes.push(excitation.voltage.harmonics.amplitudes[mainIndexes[i]]);
                    prunedHarmonics.frequencies.push(excitation.voltage.harmonics.frequencies[mainIndexes[i]]);
                }
                excitation.voltage.harmonics = prunedHarmonics;
            }

            this.masStore.mas.inputs.operatingPoints = [];
            if (this.localData.numberPhases == 'Two phases') {
                this.masStore.mas.inputs.operatingPoints.push({
                    name: "Main op. point",
                    conditions: {
                        ambientTemperature: this.localData.ambientTemperature,
                    },
                    excitationsPerWinding: [excitation, excitation]
                })
            }
            else {
                this.masStore.mas.inputs.operatingPoints.push({
                    name: "Main op. point",
                    conditions: {
                        ambientTemperature: this.localData.ambientTemperature,
                    },
                    excitationsPerWinding: [excitation, excitation, excitation]
                })
            }


            if (this.localData.numberPhases == 'Two phases') {

                this.masStore.mas.magnetic.coil.functionalDescription = [
                    {
                        "name": "Primary",
                        "numberTurns": 0,
                        "numberParallels": 0,
                        "isolationSide": "primary",
                        "wire": ""
                    },
                    {
                        "name": "Secondary",
                        "numberTurns": 0,
                        "numberParallels": 0,
                        "isolationSide": "primary",
                        "wire": ""
                    }
                ];
            }
            else {
                this.masStore.mas.magnetic.coil.functionalDescription = [
                    {
                        "name": "Primary",
                        "numberTurns": 0,
                        "numberParallels": 0,
                        "isolationSide": "primary",
                        "wire": ""
                    },
                    {
                        "name": "Secondary",
                        "numberTurns": 0,
                        "numberParallels": 0,
                        "isolationSide": "primary",
                        "wire": ""
                    },
                    {
                        "name": "Tertiary",
                        "numberTurns": 0,
                        "numberParallels": 0,
                        "isolationSide": "primary",
                        "wire": ""
                    }
                ];
            }

            this.$stateStore.operatingPoints.modePerPoint[0] = this.$stateStore.OperatingPointsMode.HarmonicsList;

        },
        async processAndReview() {
            this.process();
            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.CommonModeChoke);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
        async processAndAdvise() {
            this.process();
            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.CommonModeChoke);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
        async simulateImpedance() {
            this.simulatingWaveforms = true;
            this.simulationError = "";
            this.simulationResults = null;
            this.impedanceChartData = null;

            try {
                // Build CMC parameters for backend
                const cmcParams = {
                    configuration: this.localData.numberPhases === 'Two phases' ? 'SINGLE_PHASE' : 'THREE_PHASE',
                    operatingVoltage: { nominal: 230 }, // Typical mains voltage
                    operatingCurrent: this.localData.mainSignalRmsCurrent,
                    lineFrequency: this.localData.mainSignalFrequency,
                    minimumImpedance: this.localData.impedancePoints.map(p => ({
                        frequency: p.frequency,
                        impedance: { magnitude: p.impedance }
                    })),
                    ambientTemperature: this.localData.ambientTemperature
                };

                // Call backend to simulate CMC waveforms
                const inductance = this.localData.minimumInductance;
                const waveforms = await this.taskQueueStore.simulateCmcWaveforms(cmcParams, inductance);

                // Process results for display
                this.simulationResults = waveforms.map(wf => ({
                    frequency: wf.frequency,
                    measuredImpedance: wf.commonModeImpedance,
                    theoreticalImpedance: wf.theoreticalImpedance,
                    attenuation: wf.commonModeAttenuation,
                    requiredImpedance: this.localData.impedancePoints.find(p => Math.abs(p.frequency - wf.frequency) < wf.frequency * 0.01)?.impedance || 0,
                    passed: wf.commonModeImpedance >= (this.localData.impedancePoints.find(p => Math.abs(p.frequency - wf.frequency) < wf.frequency * 0.01)?.impedance || 0)
                }));

                // Build impedance chart data
                this.buildImpedanceChart(waveforms);

            } catch (error) {
                console.error("CMC simulation error:", error);
                this.simulationError = error.message || "Simulation failed";
            } finally {
                this.simulatingWaveforms = false;
            }
        },
        buildImpedanceChart(waveforms) {
            if (!waveforms || waveforms.length === 0) return;

            // Sort by frequency
            const sorted = [...waveforms].sort((a, b) => a.frequency - b.frequency);

            // Build chart data with frequency on x-axis, impedance on y-axis
            const frequencies = sorted.map(wf => wf.frequency);
            const measuredImpedance = sorted.map(wf => wf.commonModeImpedance);
            const theoreticalImpedance = sorted.map(wf => wf.theoreticalImpedance);
            const requiredImpedance = sorted.map(wf => {
                const req = this.localData.impedancePoints.find(p => Math.abs(p.frequency - wf.frequency) < wf.frequency * 0.01);
                return req ? req.impedance : null;
            });

            this.impedanceChartData = {
                frequencies,
                measuredImpedance,
                theoreticalImpedance,
                requiredImpedance
            };
        },
        formatFrequency(freq) {
            if (freq >= 1e9) return (freq / 1e9).toFixed(1) + ' GHz';
            if (freq >= 1e6) return (freq / 1e6).toFixed(1) + ' MHz';
            if (freq >= 1e3) return (freq / 1e3).toFixed(1) + ' kHz';
            return freq.toFixed(0) + ' Hz';
        },
        formatImpedance(imp) {
            if (imp >= 1e6) return (imp / 1e6).toFixed(1) + ' MΩ';
            if (imp >= 1e3) return (imp / 1e3).toFixed(1) + ' kΩ';
            return imp.toFixed(1) + ' Ω';
        },
    }
}
</script>

<template>
    <div class="container ps-5">
        <div class="row my-3 ps-2">
            <label
                :style="combinedStyle([$styleStore.wizard.inputTitleFontSize, $styleStore.wizard.inputLabelBgColor, $styleStore.wizard.inputTextColor])"
                :data-cy="dataTestLabel + '-title'"
                class="rounded-2 col-12 p-0 text-center"
                :class="combinedClass([$styleStore.wizard.inputTitleFontSize, $styleStore.wizard.inputLabelBgColor, $styleStore.wizard.inputTextColor])"
            >
                {{'CMC Wizard'}}
            </label>
        </div>
        <div class="row mt-2 ps-2">
            <ElementFromListRadio class="ps-3"
                :name="'numberPhases'"
                :dataTestLabel="dataTestLabel + '-NumberPhases'"
                :replaceTitle="'How many phases do you need?'"
                :options="numberPhasesOptions"
                :titleSameRow="true"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-2'"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputLabelBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>
        <div class="row mt-2 ps-2">
            <Dimension class="ps-3"
                :name="'mainSignalFrequency'"
                :replaceTitle="'What is your main frequency?'"
                unit="Hz"
                :dataTestLabel="dataTestLabel + '-MainSignalFrequency'"
                :min="minimumMaximumScalePerParameter['frequency']['min']"
                :max="minimumMaximumScalePerParameter['frequency']['max']"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                v-model="localData"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>
        <div class="row mt-2 ps-2">
            <Dimension class="ps-3"
                :name="'mainSignalRmsCurrent'"
                :replaceTitle="'What the RMS current of main signal?'"
                unit="A"
                :dataTestLabel="dataTestLabel + '-MainSignalRmsCurrent'"
                :min="minimumMaximumScalePerParameter['current']['min']"
                :max="minimumMaximumScalePerParameter['current']['max']"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>
        <div class="row mt-2 ps-2">
            <ElementFromList class="ps-3"
                :name="'numberExtraHarmonics'"
                :replaceTitle="'Do you have harmonics? how many?'"
                :dataTestLabel="dataTestLabel + '-NumberExtraHarmonics'"
                :options="Array.from({length: 13}, (_, i) => i)"
                :titleSameRow="true"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="valueWidthProportionClass"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateHarmonicPoints"
            />
        </div>
        <div class="row mt-2 ps-2">
            <div class="offset-2 col-9" v-for="(datum, index) in localData.extraHarmonics" :key="'harmonic-' + index">
                <PairOfDimensions
                    class="ps-3 border-top border-bottom pt-2"
                    :names="['frequency', 'amplitude']"
                    :units="['Hz', 'A']"
                    :dataTestLabel="dataTestLabel + '-ExtraHarmonics'"
                    :mins="[minimumMaximumScalePerParameter['frequency']['min'], minimumMaximumScalePerParameter['current']['min']]"
                    :maxs="[minimumMaximumScalePerParameter['frequency']['max'], minimumMaximumScalePerParameter['current']['max']]"
                    v-model="localData.extraHarmonics[index]"
                    :labelWidthProportionClass="labelWidthProportionClass"
                    :valueWidthProportionClass="valueWidthProportionClass"
                    :valueFontSize="$styleStore.wizard.inputFontSize"
                    :labelFontSize="$styleStore.wizard.inputFontSize"
                    :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                    :valueBgColor="$styleStore.wizard.inputValueBgColor"
                    :textColor="localData.extraHarmonics[index].frequency <= 0 || localData.extraHarmonics[index].current <= 0? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                    @update="updateErrorMessage"
                />
            </div>
        </div>
        <div class="row mt-2 ps-2">
            <Dimension class="ps-3"
                :name="'minimumInductance'"
                :replaceTitle="'What the minimum inductance you need?'"
                unit="H"
                :dataTestLabel="dataTestLabel + '-MinimumInductance'"
                :min="minimumMaximumScalePerParameter['inductance']['min']"
                :max="minimumMaximumScalePerParameter['inductance']['max']"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>
        <div class="row mt-2 ps-2">
            <ElementFromList class="ps-3"
                :name="'numberImpedancePoints'"
                :replaceTitle="'How many impedance points do you want to define?'"
                :dataTestLabel="dataTestLabel + '-NumberExtraHarmonics'"
                :options="Array.from({length: 13}, (_, i) => i)"
                :titleSameRow="true"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="valueWidthProportionClass"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateImpedancePoints"
            />
        </div>
        <div class="row mt-2 ps-2">
            <div class="offset-2 col-9" v-for="(datum, index) in localData.impedancePoints" :key="'impedance-' + index">
                <PairOfDimensions
                    class="ps-3 border-top border-bottom pt-2"
                    :names="['frequency', 'impedance']"
                    :units="['Hz', 'Ω']"
                    :dataTestLabel="dataTestLabel + '-ImpedancePoints'"
                    :mins="[minimumMaximumScalePerParameter['frequency']['min'], minimumMaximumScalePerParameter['impedance']['min']]"
                    :maxs="[minimumMaximumScalePerParameter['frequency']['max'], minimumMaximumScalePerParameter['impedance']['max']]"
                    v-model="localData.impedancePoints[index]"
                    :labelWidthProportionClass="labelWidthProportionClass"
                    :valueWidthProportionClass="valueWidthProportionClass"
                    :valueFontSize="$styleStore.wizard.inputFontSize"
                    :labelFontSize="$styleStore.wizard.inputFontSize"
                    :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                    :valueBgColor="$styleStore.wizard.inputValueBgColor"
                    :textColor="localData.impedancePoints[index].frequency <= 0 || localData.impedancePoints[index].impedance <= 0? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                    @update="updateErrorMessage"
                />
            </div>
        </div>
        <div class="row mt-2 ps-2">
            <Dimension class="ps-3"
                :name="'ambientTemperature'"
                :replaceTitle="'What is the ambient temperature around the component?'"
                unit="°C"
                :dataTestLabel="dataTestLabel + '-AmbientTemperature'"
                :min="minimumMaximumScalePerParameter['temperature']['min']"
                :max="minimumMaximumScalePerParameter['temperature']['max']"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>
        <div class="row mt-2 ps-2">
            <ElementFromList class="ps-3"
                :name="'insulationType'"
                :replaceTitle="'Do you need insulation?'"
                :dataTestLabel="dataTestLabel + '-InsulationType'"
                :options="insulationTypes"
                :titleSameRow="true"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="valueWidthProportionClass"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateErrorMessage"
            />
        </div>
        <label
            class="text-danger col-12 pt-1"
            :style="$styleStore.wizard.inputFontSize">
        {{errorMessage}}</label>

        <!-- Impedance Verification Section -->
        <div class="row mt-4 ps-2">
            <div class="col-12">
                <div class="card border-secondary">
                    <div class="card-header d-flex justify-content-between align-items-center" :style="$styleStore.wizard.inputLabelBgColor">
                        <span :style="$styleStore.wizard.inputTextColor"><i class="fa-solid fa-wave-square me-2"></i>Impedance Verification</span>
                        <button
                            :disabled="errorMessage != '' || simulatingWaveforms || localData.impedancePoints.length === 0"
                            class="btn btn-sm"
                            :style="$styleStore.wizard.acceptButton"
                            @click="simulateImpedance"
                        >
                            <span v-if="simulatingWaveforms"><i class="fa-solid fa-spinner fa-spin me-1"></i>Simulating...</span>
                            <span v-else><i class="fa-solid fa-play me-1"></i>Verify Impedance</span>
                        </button>
                    </div>
                    <div class="card-body" :style="$styleStore.wizard.inputValueBgColor">
                        <!-- Error message -->
                        <div v-if="simulationError" class="alert alert-danger mb-3">
                            <i class="fa-solid fa-exclamation-circle me-1"></i>{{ simulationError }}
                        </div>
                        
                        <!-- Results table -->
                        <div v-if="simulationResults && simulationResults.length > 0">
                            <table class="table table-sm" :style="$styleStore.wizard.inputTextColor">
                                <thead>
                                    <tr>
                                        <th>Frequency</th>
                                        <th>Required Z</th>
                                        <th>Measured Z</th>
                                        <th>Theoretical Z</th>
                                        <th>Attenuation</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(result, index) in simulationResults" :key="index">
                                        <td>{{ formatFrequency(result.frequency) }}</td>
                                        <td>{{ result.requiredImpedance > 0 ? formatImpedance(result.requiredImpedance) : '-' }}</td>
                                        <td>{{ formatImpedance(result.measuredImpedance) }}</td>
                                        <td>{{ formatImpedance(result.theoreticalImpedance) }}</td>
                                        <td>{{ result.attenuation.toFixed(1) }} dB</td>
                                        <td>
                                            <span v-if="result.passed" class="text-success"><i class="fa-solid fa-check-circle"></i> Pass</span>
                                            <span v-else class="text-warning"><i class="fa-solid fa-exclamation-triangle"></i> Below req.</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Empty state -->
                        <div v-else class="text-center py-3" :style="$styleStore.wizard.inputTextColor">
                            <i class="fa-solid fa-chart-line fa-2x mb-2 opacity-50"></i>
                            <p class="mb-0 opacity-75">Click "Verify Impedance" to simulate the CMC performance at your specified frequencies</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mt-4 ps-2">
            <div class="offset-1 col-10 row">
                <button
                    :disabled="errorMessage != ''"
                    :style="$styleStore.wizard.reviewButton"
                    class="col-6 m-0 px-xl-3 px-md-0 btn"
                    @click="processAndReview"
                >
                {{'I want to review the specification'}}
                </button>
                <button
                    :disabled="errorMessage != ''"
                    :style="$styleStore.wizard.acceptButton"
                    class="col-6 m-0 px-xl-3 px-md-0 btn"
                    @click="processAndAdvise"
                >
                {{'I want go directly to designing'}}
                </button>
            </div>
        </div>
    </div>
</template>
