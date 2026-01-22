<script setup>
import { useMasStore } from '../../stores/mas'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import TripleOfDimensions from '/WebSharedComponents/DataInput/TripleOfDimensions.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultBuckWizardInputs, defaultBoostWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import MaximumDimensions from '../Toolbox/DesignRequirements/MaximumDimensions.vue'
</script>

<script>
export default {
    props: {
        converterName: {
            type: String,
            default: 'Buck',
        },
        dataTestLabel: {
            type: String,
            default: 'BuckWizard',
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
        const currentOptions = ['The output current ratio', 'The maximum switch current'];
        const errorMessage = "";
        var localData = {};
        if (this.converterName == "Buck") {
            localData = deepCopy(defaultBuckWizardInputs);
        }
        else {
            localData = deepCopy(defaultBoostWizardInputs);
        }

        localData["currentOptions"] = currentOptions[0];
        return {
            masStore,
            designLevelOptions,
            currentOptions,
            localData,
            errorMessage,
        }
    },
    computed: {
    },
    mounted () {
        this.updateErrorMessage();
    },
    methods: {
        updateErrorMessage() {
            this.errorMessage = "";
            if (this.converterName == "Buck") {
                if (this.localData.inputVoltage.minimum < this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Minimum input voltage cannot be smaller than output voltage";
                }
                if (this.localData.inputVoltage.maximum < this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Maximum input voltage cannot be smaller than output voltage";
                }
            }
            else {
                if (this.localData.inputVoltage.minimum > this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Minimum input voltage cannot be larger than output voltage";
                }
                if (this.localData.inputVoltage.maximum > this.localData.outputsParameters.voltage) {
                    this.errorMessage = "Maximum input voltage cannot be larger than output voltage";
                }
            }
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
                }
                else {
                    if (this.localData.currentOptions == 'The output current ratio') {
                        aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                    }
                    else {
                        aux['maximumSwitchCurrent'] = this.localData.maximumSwitchCurrent;
                    }
                }

                const auxOperatingPoint = {};
                auxOperatingPoint['outputVoltage'] = this.localData.outputsParameters.voltage;
                auxOperatingPoint['outputCurrent'] = this.localData.outputsParameters.current;
                auxOperatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                auxOperatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                aux['operatingPoints'] = [auxOperatingPoint];

                var result;
                if (this.localData.designLevel == 'I know the design I want') {
                    if (this.converterName == "Buck") {
                        result = this.$mkf.calculate_advanced_buck_inputs(JSON.stringify(aux));
                    }
                    else {
                        result = this.$mkf.calculate_advanced_boost_inputs(JSON.stringify(aux));
                    }
                }
                else {
                    if (this.converterName == "Buck") {
                        result = this.$mkf.calculate_buck_inputs(JSON.stringify(aux));
                    }
                    else {
                        result = this.$mkf.calculate_boost_inputs(JSON.stringify(aux));
                    }
                }

                if (result.startsWith("Exception")) {
                    this.errorMessage = result;
                    return;
                }
                else {
                    this.masStore.mas.inputs = JSON.parse(result);
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
            console.log(this.errorMessage);
            console.log(this.errorMessage);
            });

        },
        async processAndReview() {
            await this.process();
            console.log(this.errorMessage);
            console.log(this.errorMessage);
            console.log(this.errorMessage);

            if (this.errorMessage == "") {
                this.$stateStore.resetMagneticTool();
                this.$stateStore.designLoaded();
                this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
                this.$stateStore.selectWorkflow("design");
                this.$stateStore.selectTool("agnosticTool");
                this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
                this.$stateStore.operatingPoints.modePerPoint = [];
                this.masStore.mas.inputs.operatingPoints.forEach((_) => {
                    this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
                })
                if (this.errorMessage == "") {
                    setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
                }
                else {
                    setTimeout(() => {this.errorMessage = ""}, 5000);
                }
            }
        },
        async processAndAdvise() {
            await this.process();
            if (this.errorMessage == "") {
                this.$stateStore.resetMagneticTool();
                this.$stateStore.designLoaded();
                this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
                this.$stateStore.selectWorkflow("design");
                this.$stateStore.selectTool("agnosticTool");
                this.$stateStore.setCurrentToolSubsection("toolSelector");
                this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
                this.$stateStore.operatingPoints.modePerPoint = [];
                this.masStore.mas.inputs.operatingPoints.forEach((_) => {
                    this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
                })
                if (this.errorMessage == "") {
                    setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
                }
                else {
                    setTimeout(() => {this.errorMessage = ""}, 5000);
                }
            }
        },
    }
}
</script>

<template>
    <div class="container px-5">
        <div class="row my-3">
            <label
                :style="$styleStore.wizard.title"
                :data-cy="dataTestLabel + '-title'"
                class="rounded-2 col-12 p-0 text-center"
            >
                {{`${converterName} Wizard`}}
            </label>
        </div>
        <div class="row">
            <div class="col-6 container">
                <div class="row mt-2 ps-2">
                    <ElementFromListRadio class="ps-3"
                        :name="'designLevel'"
                        :dataTestLabel="dataTestLabel + '-DesignLevel'"
                        :replaceTitle="'Design converter from scratch?'"
                        :options="designLevelOptions"
                        v-model="localData"
                        :labelWidthProportionClass="'col-12'"
                        :valueWidthProportionClass="'col-12 mt-3 ms-5'"
                        :titleSameRow="false"
                        :valueFontSize="$styleStore.wizard.inputFontSize"
                        :labelFontSize="$styleStore.wizard.inputLabelFontSize"
                        :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                        :valueBgColor="$styleStore.wizard.inputLabelBgColor"
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
                        :dataTestLabel="dataTestLabel + '-NumberPhases'"
                        :replaceTitle="'What requirement do you have on your current?'"
                        :options="currentOptions"
                        :titleSameRow="false"
                        v-model="localData"
                        :labelWidthProportionClass="'col-12'"
                        :valueWidthProportionClass="'col-12 mt-3 ms-5'"
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
                        :replaceTitle="'What maximum switch current can the switch withstand?'"
                        unit="A"
                        :dataTestLabel="dataTestLabel + '-MaximumSwitchCurrent'"
                        :min="minimumMaximumScalePerParameter['current']['min']"
                        :max="minimumMaximumScalePerParameter['current']['max']"
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
            </div>
            <div class="col-6 container">
                <div class="row mt-2 ps-2">
                    <DimensionWithTolerance class="ps-1"
                        :name="'inputVoltage'"
                        :replaceTitle="'What is your input voltage?'"
                        :severalRows="true"
                        unit="V"
                        :dataTestLabel="dataTestLabel + '-InputVoltage'"
                        :min="minimumMaximumScalePerParameter['voltage']['min']"
                        :max="minimumMaximumScalePerParameter['voltage']['max']"
                        :labelWidthProportionClass="labelWidthProportionClass"
                        :valueWidthProportionClass="'col-lg-1 col-md-2'"
                        v-model="localData.inputVoltage"
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
                    <Dimension class="ps-3"
                        :name="'voltage'"
                        :replaceTitle="'What is your output voltage?'"
                        unit="V"
                        :dataTestLabel="dataTestLabel + '-outputVoltage'"
                        :min="minimumMaximumScalePerParameter['voltage']['min']"
                        :max="minimumMaximumScalePerParameter['voltage']['max']"
                        v-model="localData.outputsParameters"
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
                        :name="'current'"
                        :replaceTitle="'What is your output current?'"
                        unit="A"
                        :dataTestLabel="dataTestLabel + '-outputCurrent'"
                        :min="minimumMaximumScalePerParameter['current']['min']"
                        :max="minimumMaximumScalePerParameter['current']['max']"
                        v-model="localData.outputsParameters"
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
