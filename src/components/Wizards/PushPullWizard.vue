<script setup>
import { useMasStore } from '../../stores/mas'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import TripleOfDimensions from '/WebSharedComponents/DataInput/TripleOfDimensions.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultPushPullWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import MaximumDimensions from '../Toolbox/DesignRequirements/MaximumDimensions.vue'
</script>

<script>
export default {
    props: {
        converterName: {
            type: String,
            default: 'Push-Pull',
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
        const designLevelOptions = ['Help me with the design', 'I know the design I want'];
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        const errorMessage = "";
        var localData = deepCopy(defaultPushPullWizardInputs);
        return {
            masStore,
            designLevelOptions,
            insulationTypes,
            localData,
            errorMessage,
        }
    },
    computed: {
    },
    methods: {
        updateErrorMessage() {
            this.errorMessage = "";
        },
        updateNumberOutputs(newNumber) {
            if (newNumber > this.localData.outputsParameters.length) {
                const diff = newNumber - this.localData.outputsParameters.length;
                for (let i = 0; i < diff; i++) {
                    var newOutput;
                    if (this.localData.outputsParameters.length == 0) {
                        newOutput = {
                            voltage: defaultPushPullWizardInputs.outputsParameters[0].voltage,
                            current: defaultPushPullWizardInputs.outputsParameters[0].current,
                            turnsRatio: defaultPushPullWizardInputs.outputsParameters[0].turnsRatio,
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

            this.$mkf.ready.then(_ => {

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

                aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;

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

                var result;
                if (this.localData.designLevel == 'I know the design I want') {
                    result = await this.$mkf.calculate_advanced_push_pull_inputs(JSON.stringify(aux));
                }
                else {
                    result = await this.$mkf.calculate_push_pull_inputs(JSON.stringify(aux));
                }

                if (result.startsWith("Exception")) {
                    console.error(result);
                    this.errorMessage = result;
                    return;
                }
                else {
                    this.masStore.mas.inputs = JSON.parse(result);
                }

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

            }).catch(error => {
                console.error(error);
                this.errorMessage = error;
            });

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
            this.$stateStore.setCurrentToolSubsection("toolSelector");
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
                <div class="row mt-2 ps-2">
                    <Dimension class="ps-3"
                        :name="'dutyCycle'"
                        :replaceTitle="'What is your duty cycle?'"
                        unit="%"
                        :dataTestLabel="dataTestLabel + '-DutyCycle'"
                        :visualScale="100"
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
                <div
                    class="row mt-2 ps-2"
                >
                    <Dimension class="ps-3"
                        :name="'maximumSwitchCurrent'"
                        :replaceTitle="'What maximum switch current can the switch withstand?'"
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
</template>
