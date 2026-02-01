<script setup>
import { useMasStore } from '../../stores/mas'
import { useTaskQueueStore } from '../../stores/taskQueue'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import TripleOfDimensions from '/WebSharedComponents/DataInput/TripleOfDimensions.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultIsolatedBuckWizardInputs, defaultIsolatedBuckBoostWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import MaximumDimensions from '../Toolbox/DesignRequirements/MaximumDimensions.vue'
import LineVisualizer from '/WebSharedComponents/Common/LineVisualizer.vue'
</script>

<script>
export default {
    props: {
        converterName: {
            type: String,
            default: 'Isolated Buck',
        },
        dataTestLabel: {
            type: String,
            default: 'CmcWizard',
        },
        labelWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-9'
        },
        valueWidthProportionClass:{
            type: String,
            default: 'col-xs-12 col-md-3'
        },
    },
    data() {
        const masStore = useMasStore();
        const taskQueueStore = useTaskQueueStore();
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const currentOptions = ['The output current ratio', 'The maximum switch current'];
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        const errorMessage = "";
        var localData;
        if (this.converterName == "Isolated Buck") {
            localData = deepCopy(defaultIsolatedBuckWizardInputs);
        }
        else {
            localData = deepCopy(defaultIsolatedBuckBoostWizardInputs);
        }
        localData["currentOptions"] = currentOptions[0];
        return {
            masStore,
            taskQueueStore,
            designLevelOptions,
            currentOptions,
            insulationTypes,
            localData,
            errorMessage,
            simulatingWaveforms: false,
            waveformError: "",
            simulatedOperatingPoints: [],
            designRequirements: null,
            magneticWaveforms: [],
            converterWaveforms: [],
            waveformViewMode: 'magnetic',
            forceWaveformUpdate: 0,
        }
    },
    computed: {
    },
    watch: {
        waveformViewMode() {
            this.$nextTick(() => {
                this.forceWaveformUpdate += 1;
            });
        },
    },
    methods: {
        async pruneHarmonicsForInputs(inputs) {
            // Prune harmonics for all operating points and excitations
            const currentThreshold = 0.1;
            const voltageThreshold = 0.3;
            
            for (const op of inputs.operatingPoints) {
                if (op.excitationsPerWinding) {
                    for (const excitation of op.excitationsPerWinding) {
                        // Prune current harmonics
                        if (excitation.current?.harmonics?.amplitudes?.length > 1) {
                            const mainIndexes = await this.taskQueueStore.getMainHarmonicIndexes(excitation.current.harmonics, currentThreshold, 1);
                            const prunedHarmonics = {
                                amplitudes: [excitation.current.harmonics.amplitudes[0]],
                                frequencies: [excitation.current.harmonics.frequencies[0]]
                            };
                            for (let i = 0; i < mainIndexes.length; i++) {
                                prunedHarmonics.amplitudes.push(excitation.current.harmonics.amplitudes[mainIndexes[i]]);
                                prunedHarmonics.frequencies.push(excitation.current.harmonics.frequencies[mainIndexes[i]]);
                            }
                            excitation.current.harmonics = prunedHarmonics;
                        }
                        
                        // Prune voltage harmonics
                        if (excitation.voltage?.harmonics?.amplitudes?.length > 1) {
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
                    }
                }
            }
            return inputs;
        },
        updateErrorMessage() {
            this.errorMessage = "";
        },
        updateNumberOutputs(newNumber) {
            if (newNumber > this.localData.outputsParameters.length) {
                const diff = newNumber - this.localData.outputsParameters.length;
                for (let i = 0; i < diff; i++) {
                    var newOutput;
                    if (this.localData.outputsParameters.length == 0) {
                        if (this.converterName == "Isolated Buck") {
                            newOutput = {
                                voltage: defaultIsolatedBuckWizardInputs.outputsParameters[0].voltage,
                                current: defaultIsolatedBuckWizardInputs.outputsParameters[0].current,
                                turnsRatio: defaultIsolatedBuckWizardInputs.outputsParameters[0].turnsRatio,
                            }
                        }
                        else {
                            newOutput = {
                                voltage: defaultIsolatedBuckBoostWizardInputs.outputsParameters[0].voltage,
                                current: defaultIsolatedBuckBoostWizardInputs.outputsParameters[0].current,
                                turnsRatio: defaultIsolatedBuckBoostWizardInputs.outputsParameters[0].turnsRatio,
                            }
                        }
                    }
                    else {
                        newOutput = {
                            voltage: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].voltage,
                            current: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].current,
                            turnsRatio: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].turnsRatio,
                        }
                    }

                    this.localData.outputsParameters.push(newOutput);
                }
            }
            else if (newNumber < this.localData.outputsParameters.length) {
                const diff = this.localData.outputsParameters.length - newNumber;
                this.localData.outputsParameters.splice(-diff, diff);
            }
            this.updateErrorMessage();
        },

        async process() {
            this.masStore.resetMas("power");

            try {
                const aux = {};
                aux['inputVoltage'] = this.localData.inputVoltage;
                aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
                aux['efficiency'] = this.localData.efficiency;
                if (this.localData.designLevel == 'I know the design I want') {
                    aux['desiredInductance'] = this.localData.inductance;
                    const auxDesiredDutyCycle = []
                    if (this.localData.inputVoltage.minimum != null) {
                        if (this.localData.dutyCycle.minimum != null) {
                            auxDesiredDutyCycle.push(this.localData.dutyCycle.minimum);   
                        }
                        else {
                            this.errorMessage = "Missing duty cycle for minimum voltage";
                            return;
                        }
                    }

                    if (this.localData.inputVoltage.nominal != null) {
                        if (this.localData.dutyCycle.nominal != null) {
                            auxDesiredDutyCycle.push(this.localData.dutyCycle.nominal);   
                        }
                        else {
                            this.errorMessage = "Missing duty cycle for nominal voltage";
                            return;
                        }
                    }
                    if (this.localData.inputVoltage.maximum != null) {
                        if (this.localData.dutyCycle.maximum != null) {
                            auxDesiredDutyCycle.push(this.localData.dutyCycle.maximum);   
                        }
                        else {
                            this.errorMessage = "Missing duty cycle for maximum voltage";
                            return;
                        }
                    }
                    aux['desiredDutyCycle'] = [auxDesiredDutyCycle];
                    aux['desiredTurnsRatios'] = [];
                }
                else {
                    if (this.localData.currentOptions == 'The output current ratio') {
                        aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                    }
                    else {
                        aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                    }
                    aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                }

                const auxOperatingPoint = {};
                auxOperatingPoint['outputVoltages'] = [];
                auxOperatingPoint['outputCurrents'] = [];
                this.localData.outputsParameters.forEach((elem) => {
                    auxOperatingPoint['outputVoltages'].push(elem.voltage);
                    auxOperatingPoint['outputCurrents'].push(elem.current);
                    if (this.localData.designLevel == 'I know the design I want') {
                        aux['desiredTurnsRatios'].push(elem.turnsRatio);
                    }
                })
                auxOperatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                auxOperatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                aux['operatingPoints'] = [auxOperatingPoint];

                var inputs;
                if (this.localData.designLevel == 'I know the design I want') {
                    if (this.converterName == "Isolated Buck") {
                        inputs = await this.taskQueueStore.calculateAdvancedIsolatedBuckInputs(aux);
                    }
                    else {
                        inputs = await this.taskQueueStore.calculateAdvancedIsolatedBuckBoostInputs(aux);
                    }
                }
                else {
                    if (this.converterName == "Isolated Buck") {
                        inputs = await this.taskQueueStore.calculateIsolatedBuckInputs(aux);
                    }
                    else {
                        inputs = await this.taskQueueStore.calculateIsolatedBuckBoostInputs(aux);
                    }
                }

                // Prune harmonics for better Fourier graph display
                inputs = await this.pruneHarmonicsForInputs(inputs);

                this.masStore.mas.inputs = inputs;

                if (this.localData.insulationType != 'No') {

                    this.masStore.mas.inputs.designRequirements.insulation = defaultDesignRequirements.insulation;
                    this.masStore.mas.inputs.designRequirements.insulation.insulationType = this.localData.insulationType;
                }

                this.masStore.mas.magnetic.coil.functionalDescription = []
                this.masStore.mas.inputs.operatingPoints[0].excitationsPerWinding.forEach((elem, index) => {
                    this.masStore.mas.magnetic.coil.functionalDescription.push({
                            "name": elem.name,
                            "numberTurns": 0,
                            "numberParallels": 0,
                            "isolationSide": this.masStore.mas.inputs.designRequirements.isolationSides[index],
                            "wire": ""
                        });
                })
                this.errorMessage = "";

            } catch (error) {
                console.error(error);
                this.errorMessage = error;
            }

        },
        async processAndReview() {
            await this.process();

            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            this.$stateStore.operatingPoints.modePerPoint = [];
            this.masStore.mas.magnetic.coil.functionalDescription.forEach((_) => {
                this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
            })
            if (this.errorMessage == "") {
                await this.$nextTick();
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            }
            else {
                setTimeout(() => {this.errorMessage = ""}, 5000);
            }
        },
        async processAndAdvise() {
            await this.process();
            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsection("magneticBuilder");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            this.$stateStore.operatingPoints.modePerPoint = [this.$stateStore.OperatingPointsMode.Manual];
            if (this.errorMessage == "") {
                await this.$nextTick();
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            }
            else {
                setTimeout(() => {this.errorMessage = ""}, 5000);
            }
        },
        async simulateIdealWaveforms() {
            this.simulatingWaveforms = true;
            this.waveformError = "";
            this.magneticWaveforms = [];
            this.converterWaveforms = [];
            
            try {
                // Build the converter parameters for simulation
                const aux = {};
                aux['inputVoltage'] = this.localData.inputVoltage;
                aux['diodeVoltageDrop'] = this.localData.diodeVoltageDrop;
                aux['efficiency'] = this.localData.efficiency;
                
                if (this.localData.designLevel == 'I know the design I want') {
                    aux['desiredInductance'] = this.localData.inductance;
                    const auxDesiredDutyCycle = []
                    if (this.localData.inputVoltage.minimum != null) {
                        auxDesiredDutyCycle.push(this.localData.dutyCycle?.minimum || 0.4);
                    }
                    if (this.localData.inputVoltage.nominal != null) {
                        auxDesiredDutyCycle.push(this.localData.dutyCycle?.nominal || 0.4);
                    }
                    if (this.localData.inputVoltage.maximum != null) {
                        auxDesiredDutyCycle.push(this.localData.dutyCycle?.maximum || 0.4);
                    }
                    aux['desiredDutyCycle'] = [auxDesiredDutyCycle];
                    aux['desiredTurnsRatios'] = [];
                    this.localData.outputsParameters.forEach((elem) => {
                        aux['desiredTurnsRatios'].push(elem.turnsRatio);
                    });
                } else {
                    if (this.localData.currentOptions == 'The output current ratio') {
                        aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                    } else {
                        aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                    }
                }
                
                const auxOperatingPoint = {};
                auxOperatingPoint['outputVoltages'] = [];
                auxOperatingPoint['outputCurrents'] = [];
                this.localData.outputsParameters.forEach((elem) => {
                    auxOperatingPoint['outputVoltages'].push(elem.voltage);
                    auxOperatingPoint['outputCurrents'].push(elem.current);
                });
                auxOperatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                auxOperatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                aux['operatingPoints'] = [auxOperatingPoint];
                
                // Call the WASM simulation
                var result = await this.taskQueueStore.simulateIsolatedBuckBoostIdealWaveforms(aux);
                console.log("Simulation result:", result);
                
                this.simulatedOperatingPoints = result.operatingPoints || [];
                this.designRequirements = result.designRequirements || null;
                this.magneticWaveforms = result.magneticWaveforms || [];
                this.converterWaveforms = result.converterWaveforms || [];
                
                this.$nextTick(() => {
                    this.forceWaveformUpdate += 1;
                    if (this.$refs.waveformSection) {
                        this.$refs.waveformSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                
            } catch (error) {
                console.error("Error simulating waveforms:", error);
                this.waveformError = error.message || "Failed to simulate waveforms";
            }
            
            this.simulatingWaveforms = false;
        },
        getWaveformsList(waveforms, operatingPointIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            return waveforms[operatingPointIndex].waveforms;
        },
        getSingleWaveformDataForVisualizer(waveforms, operatingPointIndex, waveformIndex) {
            if (!waveforms || !waveforms[operatingPointIndex] || !waveforms[operatingPointIndex].waveforms) {
                return [];
            }
            
            const wf = waveforms[operatingPointIndex].waveforms[waveformIndex];
            if (!wf) return [];
            
            let yData = wf.y;
            const isVoltageWaveform = wf.unit === 'V';
            const isCurrentWaveform = wf.unit === 'A';
            
            if (isVoltageWaveform && yData && yData.length > 0) {
                const sorted = [...yData].sort((a, b) => a - b);
                const p1 = sorted[Math.floor(sorted.length * 0.01)];
                const p99 = sorted[Math.floor(sorted.length * 0.99)];
                
                const range = p99 - p1;
                const margin = range * 0.2;
                const clipMin = p1 - margin;
                const clipMax = p99 + margin;
                
                yData = yData.map(v => Math.max(clipMin, Math.min(clipMax, v)));
            }
            
            let waveformColor = '#ffffff';
            if (isVoltageWaveform) {
                waveformColor = this.$styleStore.operatingPoints?.voltageGraph?.color || '#b18aea';
            } else if (isCurrentWaveform) {
                waveformColor = this.$styleStore.operatingPoints?.currentGraph?.color || '#4CAF50';
            }
            
            return [{
                label: wf.label,
                data: {
                    x: wf.x,
                    y: yData,
                },
                colorLabel: waveformColor,
                type: 'value',
                position: 'left',
                unit: wf.unit,
                numberDecimals: 6,
            }];
        },
        getTimeAxisOptions() {
            return {
                label: 'Time',
                colorLabel: '#d4d4d4',
                type: 'value',
                unit: 's',
            };
        },
    }
}
</script>

<template>
    <div class="container ps-5">
        <div class="row my-3 ps-2">
            <label
                :style="$styleStore.wizard.title"
                :data-cy="dataTestLabel + '-title'"
                class="rounded-2 col-12 p-0 text-center"
            >
                {{converterName}}
            </label>
        </div>
        <div class="row">
            <div class="col-6 container">
                <div class="row mt-2 ps-2">
                    <ElementFromListRadio class="ps-3"
                        :name="'designLevel'"
                        :dataTestLabel="dataTestLabel + '-NumberPhases'"
                        :replaceTitle="'Design converter from scratch?'"
                        :options="designLevelOptions"
                        :titleSameRow="false"
                        v-model="localData"
                        :labelWidthProportionClass="'col-12'"
                        :valueWidthProportionClass="'ms-5 col-12'"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputLabelBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
                <div
                    v-if="localData.designLevel == 'I know the design I want'"
                    class="row mt-2 ps-2"
                    >
                    <Dimension class="ps-3"
                        :name="'inductance'"
                        :replaceTitle="'What is your target inductance?'"
                        unit="H"
                        :dataTestLabel="dataTestLabel + '-Inductance'"
                        :min="minimumMaximumScalePerParameter['inductance']['min']"
                        :max="minimumMaximumScalePerParameter['inductance']['max']"
                        v-model="localData"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="'col-2'"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
                <div
                    v-if="localData.designLevel == 'Help me with the design'"
                    class="row mt-2 ps-2"
                    >
                    <ElementFromListRadio class="ps-3"
                        :name="'currentOptions'"
                        :dataTestLabel="dataTestLabel + '-CurrentOptions'"
                        :replaceTitle="'What requirement do you have on your current?'"
                        :options="currentOptions"
                        :titleSameRow="false"
                        v-model="localData"
                        :labelWidthProportionClass="'col-12'"
                        :valueWidthProportionClass="'ms-5 col-12'"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputLabelBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
                <div
                    v-if="localData.designLevel == 'Help me with the design' && localData.currentOptions == 'The maximum switch current'"
                    class="row mt-2 ps-2"
                >
                    <Dimension class="ps-3"
                        :name="'maximumSwitchCurrent'"
                        :replaceTitle="'What maximum drain-source voltage can the switch withstand?'"
                        unit="A"
                        :dataTestLabel="dataTestLabel + '-MaximumSwitchCurrent'"
                        :min="minimumMaximumScalePerParameter['voltage']['min']"
                        :max="minimumMaximumScalePerParameter['voltage']['max']"
                        v-model="localData"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="'col-2'"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
                <div 
                    v-if="localData.designLevel == 'Help me with the design' && localData.currentOptions == 'The output current ratio'"
                    class="row mt-2 ps-2"
                >
                    <Dimension class="ps-3"
                        :name="'currentRippleRatio'"
                        :replaceTitle="'What is the maximum current ripple you can have?'"
                        unit="%"
                        :visualScale="100"
                        :dataTestLabel="dataTestLabel + '-CurrentRippleRatio'"
                        :min="0.01"
                        :max="1"
                        v-model="localData"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="'col-2'"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
                <div class="row mt-2 ps-2">
                    <Dimension class="ps-3"
                        :name="'ambientTemperature'"
                        :replaceTitle="'What is the ambient temperature around the component?'"
                        unit="°C"
                        :dataTestLabel="dataTestLabel + '-AmbientTemperature'"
                        :min="minimumMaximumScalePerParameter['temperature']['min']"
                        :max="minimumMaximumScalePerParameter['temperature']['max']"
                        :allowNegative="true"
                        :allowZero="true"
                        v-model="localData"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="'col-2'"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
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
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
            </div>
            <div class="col-6 container">
                <div class="row mt-2 ps-2">
                    <DimensionWithTolerance class="ps-1"
                        :name="'inputVoltage'"
                        :replaceTitle="'What is your input voltage?'"
                        unit="V"
                        :dataTestLabel="dataTestLabel + '-InputVoltage'"
                        :min="minimumMaximumScalePerParameter['voltage']['min']"
                        :max="minimumMaximumScalePerParameter['voltage']['max']"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="'col-2'"
                        v-model="localData.inputVoltage"
                        :severalRows="true"
                        :addButtonStyle="$styleStore.wizard.addButton"
                        :removeButtonBgColor="$styleStore.wizard.removeButton['background-color']"
                        :titleFontSize="$styleStore.wizard.inputLabelFontSize"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
                <div class="row mt-2 ps-2">
                    <ElementFromList class="ps-3"
                        :name="'numberOutputs'"
                        :replaceTitle="'How many outputs?'"
                        :dataTestLabel="dataTestLabel + '-NumberOutputs'"
                        :options="Array.from({length: 10}, (_, i) => i + 1)"
                        :titleSameRow="true"
                        v-model="localData"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="valueWidthProportionClass"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateNumberOutputs"
                    />
                </div>
                <div class="row mt-2 ps-2">
                    <div class="col-12" v-for="(datum, index) in localData.outputsParameters" :key="index">
                        <PairOfDimensions
                            v-if="localData.designLevel == 'Help me with the design'"
                            class="border-top border-bottom pt-2"
                            :names="['voltage', 'current']"
                            :units="['V', 'A']"
                            :dataTestLabel="dataTestLabel + '-outputsParameters'"
                            :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
                            :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
                            v-model="localData.outputsParameters[index]"
                            :labelWidthProportionClass="'col-xs-12 col-md-6'"
                            :valueWidthProportionClass="'col-xs-12 col-md-6'"
                            :valueFontSize="$styleStore.wizard.inputFontSize"
                            :labelFontSize="$styleStore.wizard.inputFontSize"
                            :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                            :valueBgColor="$styleStore.wizard.inputValueBgColor"
                            :textColor="localData.outputsParameters[index].voltage <= 0 || localData.outputsParameters[index].current <= 0? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                            @update="updateErrorMessage"
                        />
                        <TripleOfDimensions
                            v-else
                            class="border-top border-bottom pt-2"
                            :names="['voltage', 'current', 'turnsRatio']"
                            :units="['V', 'A', null]"
                            :dataTestLabel="dataTestLabel + '-outputsParameters'"
                            :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min'], 0]"
                            :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max'], 1000]"
                            v-model="localData.outputsParameters[index]"
                            :labelWidthProportionClass="'col-xs-12 col-md-6'"
                            :valueWidthProportionClass="'col-xs-12 col-md-6'"
                            :valueFontSize="$styleStore.wizard.inputFontSize"
                            :labelFontSize="$styleStore.wizard.inputFontSize"
                            :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                            :valueBgColor="$styleStore.wizard.inputValueBgColor"
                            :textColor="localData.outputsParameters[index].voltage <= 0 || localData.outputsParameters[index].current <= 0? $styleStore.wizard.inputErrorTextColor : $styleStore.wizard.inputTextColor"
                            @update="updateErrorMessage"
                        />
                    </div>
                </div>
                <div class="row mt-2 ps-2">
                    <Dimension class="ps-3"
                        :name="'switchingFrequency'"
                        :replaceTitle="'At what frequency do you want to switch?'"
                        unit="Hz"
                        :dataTestLabel="dataTestLabel + '-switchingFrequency'"
                        :min="minimumMaximumScalePerParameter['frequency']['min']"
                        :max="minimumMaximumScalePerParameter['frequency']['max']"
                        v-model="localData"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="'col-2'"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
                <div class="row mt-2 ps-2">
                    <Dimension class="ps-3"
                        :name="'diodeVoltageDrop'"
                        :replaceTitle="'What is the voltage drop in the diode?'"
                        unit="V"
                        :dataTestLabel="dataTestLabel + '-DiodeVoltageDrop'"
                        :min="minimumMaximumScalePerParameter['voltage']['min']"
                        :max="minimumMaximumScalePerParameter['voltage']['max']"
                        :allowZero="true"
                        v-model="localData"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="'col-2'"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
                <div class="row mt-2 ps-2">
                    <Dimension class="ps-3"
                        :name="'efficiency'"
                        :replaceTitle="'What is target efficiency?'"
                        unit="%"
                        :visualScale="100"
                        :dataTestLabel="dataTestLabel + '-Efficiency'"
                        :min="0.01"
                        :max="1"
                        v-model="localData"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="'col-2'"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputValueBgColor"
                        :textColor="$styleStore.wizard.inputTextColor"
                        @update="updateErrorMessage"
                    />
                </div>
            </div>
            
            <!-- Waveform Simulation Section -->
            <div class="col-12 mt-4">
                <div class="row">
                    <div class="col-12">
                        <button
                            :disabled="errorMessage != '' || simulatingWaveforms"
                            :style="$styleStore.wizard.reviewButton"
                            class="btn px-4 mb-3"
                            @click="simulateIdealWaveforms"
                        >
                            <span v-if="simulatingWaveforms">
                                <i class="fa-solid fa-spinner fa-spin me-2"></i>Simulating...
                            </span>
                            <span v-else>
                                <i class="fa-solid fa-wave-square me-2"></i>Simulate Waveforms
                            </span>
                        </button>
                    </div>
                </div>
                
                <div ref="waveformSection">
                    <div v-if="waveformError" class="alert alert-danger" role="alert">
                        <i class="fa-solid fa-exclamation-triangle me-2"></i>{{ waveformError }}
                    </div>
                    
                    <div v-if="magneticWaveforms.length > 0 || converterWaveforms.length > 0" class="row">
                        <div class="col-12 mb-3">
                            <div class="p-3 rounded border" :style="{ backgroundColor: $styleStore.wizard.inputLabelBgColor }">
                                <h6 :style="$styleStore.wizard.inputLabelFontSize" class="mb-2">Design Parameters</h6>
                                <div v-if="designRequirements" class="row mb-3">
                                    <div class="col-6">
                                        <strong>Magnetizing Inductance:</strong>
                                        {{ designRequirements.magnetizingInductance?.nominal ? 
                                           (designRequirements.magnetizingInductance.nominal * 1e6).toFixed(2) + ' µH' :
                                           designRequirements.magnetizingInductance?.minimum ?
                                           (designRequirements.magnetizingInductance.minimum * 1e6).toFixed(2) + ' µH (min)' : 'N/A' }}
                                    </div>
                                    <div class="col-6">
                                        <strong>Duty Cycle:</strong>
                                        {{ simulatedOperatingPoints.length > 0 && simulatedOperatingPoints[0].dutyCycle ?
                                           (simulatedOperatingPoints[0].dutyCycle * 100).toFixed(1) + '%' : 'N/A' }}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-12 mb-3">
                            <div class="btn-group" role="group" aria-label="Waveform view mode">
                                <button 
                                    type="button" 
                                    class="btn btn-sm"
                                    :class="waveformViewMode === 'magnetic' ? 'btn-primary' : 'btn-outline-primary'"
                                    @click="waveformViewMode = 'magnetic'"
                                >
                                    <i class="fa-solid fa-magnet me-1"></i>Magnetic View
                                </button>
                                <button 
                                    type="button" 
                                    class="btn btn-sm"
                                    :class="waveformViewMode === 'converter' ? 'btn-primary' : 'btn-outline-primary'"
                                    @click="waveformViewMode = 'converter'"
                                >
                                    <i class="fa-solid fa-plug me-1"></i>Converter View
                                </button>
                            </div>
                        </div>
                        
                        <div class="col-12">
                            <div 
                                v-for="(op, opIndex) in (waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms)" 
                                :key="'op-' + opIndex + '-' + waveformViewMode"
                                class="mb-4"
                            >
                                <h6 
                                    class="mb-2"
                                    :style="$styleStore.wizard.inputLabelFontSize"
                                >
                                    Operating Point {{ opIndex + 1 }} - {{ waveformViewMode === 'magnetic' ? 'Magnetic' : 'Converter' }} Waveforms
                                </h6>
                                
                                <div class="row">
                                    <div 
                                        v-for="(wf, wfIndex) in getWaveformsList(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex)"
                                        :key="'wf-' + opIndex + '-' + wfIndex + '-' + waveformViewMode"
                                        class="col-12 col-md-6 mb-3"
                                    >
                                        <div 
                                            class="border rounded p-2"
                                            :style="{ backgroundColor: $styleStore.wizard.inputValueBgColor }"
                                        >
                                            <LineVisualizer 
                                                v-if="getSingleWaveformDataForVisualizer(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, wfIndex).length > 0"
                                                :data="getSingleWaveformDataForVisualizer(waveformViewMode === 'magnetic' ? magneticWaveforms : converterWaveforms, opIndex, wfIndex)"
                                                :xAxisOptions="getTimeAxisOptions()"
                                                :title="wf.label"
                                                :titleFontSize="14"
                                                :forceUpdate="forceWaveformUpdate"
                                                :bgColor="$styleStore.wizard.inputValueBgColor['background-color'] || 'transparent'"
                                                :lineColor="$styleStore.wizard.inputTextColor?.color || '#b18aea'"
                                                :textColor="$styleStore.wizard.inputTextColor?.color || '#ffffff'"
                                                :chartStyle="'height: 200px'"
                                                :toolbox="true"
                                            />
                                            <div v-else class="text-center text-muted py-3">
                                                No data available.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div v-if="magneticWaveforms.length == 0 && !simulatingWaveforms && !waveformError" 
                         class="text-muted text-center py-3"
                         :style="$styleStore.wizard.inputFontSize"
                    >
                        <i class="fa-solid fa-info-circle me-2"></i>
                        Click "Simulate Waveforms" to preview the expected voltage and current waveforms
                    </div>
                </div>
            </div>
            
            <label
                class="text-danger col-12 pt-1"
                :style="$styleStore.wizard.inputFontSize">
            {{errorMessage}}</label>
            <div class="row mt-4 ps-2">
                <div class="offset-1 col-10 row">
                    <button
                        :disabled="errorMessage != ''"
                        :style="$styleStore.wizard.reviewButton"
                        class="col-6 m-0 px-xl-3 px-md-0 btn"
                        @click="processAndReview"
                    >
                    <i class="me-2 fa-solid fa-redo"></i>{{'I want to review the specification'}}
                    </button>
                    <button
                        :disabled="errorMessage != ''"
                        :style="$styleStore.wizard.acceptButton"
                        class="col-6 m-0 px-xl-3 px-md-0 btn"
                        @click="processAndAdvise"
                    >
                    <i class="me-2 fa-regular fa-eye"></i>{{'I want go directly to designing'}}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template><style scoped>
.btn-group .btn {
    transition: all 0.2s ease-in-out;
}

.btn-group .btn-primary {
    z-index: 2;
}

.border {
    border-color: rgba(177, 138, 234, 0.3) !important;
}
</style>