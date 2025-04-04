<script setup>
import { useMasStore } from '../../stores/mas'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { defaultFlybackWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
import MaximumDimensions from '../Toolbox/DesignRequirements/MaximumDimensions.vue'
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
        const numberPhasesOptions = ['Two phases', 'Three phases'];
        const insulationTypes = ['No', 'Basic', 'Reinforced'];
        const errorMessage = "";
        const localData = deepCopy(defaultFlybackWizardInputs);
        return {
            masStore,
            numberPhasesOptions,
            insulationTypes,
            localData,
            errorMessage,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        updateErrorMessage() {
            this.errorMessage = "";
            if (this.localData.switchingFrequency <= 0) {
                if (this.errorMessage == "")
                    this.errorMessage = "Main signal frequency must be positive";
            }

        },
        updateNumberOutputs(newNumber) {
            if (newNumber > this.localData.outputsParameters.length) {
                const diff = newNumber - this.localData.outputsParameters.length;
                for (let i = 0; i < diff; i++) {
                    var newOutput;
                    console.log(deepCopy(defaultFlybackWizardInputs))
                    if (this.localData.outputsParameters.length == 0) {
                        newOutput = {
                            voltage: defaultFlybackWizardInputs.outputsParameters[0].voltage,
                            current: defaultFlybackWizardInputs.outputsParameters[0].current,
                        }
                    }
                    else {
                        newOutput = {
                            voltage: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].voltage,
                            current: this.localData.outputsParameters[this.localData.outputsParameters.length - 1].current,
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
                aux['maximumDrainSourceVoltage'] = this.localData.maximumDrainSourceVoltage;
                aux['currentRippleRatio'] = this.localData.currentRippleRatio;
                aux['efficiency'] = this.localData.efficiency;
                const auxOperatingPoint = {};
                auxOperatingPoint['outputVoltages'] = [];
                auxOperatingPoint['outputCurrents'] = [];
                this.localData.outputsParameters.forEach((elem) => {
                    auxOperatingPoint['outputVoltages'].push(elem.voltage);
                    auxOperatingPoint['outputCurrents'].push(elem.current);
                })
                auxOperatingPoint['switchingFrequency'] = this.localData.switchingFrequency;
                auxOperatingPoint['ambientTemperature'] = this.localData.ambientTemperature;
                aux['operatingPoints'] = [auxOperatingPoint];

                const result = this.$mkf.calculate_flyback_inputs(JSON.stringify(aux));

                if (result.startsWith("Exception")) {
                    console.error(result);
                    return;
                }
                else {
                    this.masStore.mas.inputs = JSON.parse(result);
                }

                if (this.localData.insulationType != 'No') {

                    this.masStore.mas.inputs.designRequirements.insulation = defaultDesignRequirements.insulation;
                    this.masStore.mas.inputs.designRequirements.insulation.insulationType = this.localData.insulationType;
                }
                console.log(deepCopy(this.masStore.mas.inputs))

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


            }).catch(error => {
                console.error(error);
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
            console.log("deepCopy(this.masStore.mas.inputs)")
            // console.log(deepCopy(this.masStore.mas.inputs))
            // setTimeout(() => {console.warn(deepCopy(this.masStore.mas.inputs.operatingPoints[0]));}, 100);
            setTimeout(() => {this.$router.push('/magnetic_tool');}, 100);
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
            setTimeout(() => {this.$router.push('/magnetic_tool');}, 100);
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
                {{'Flyback Wizard'}}
            </label>
        </div>
        <div class="row mt-2 ps-2">
            <DimensionWithTolerance class="ps-1"
                :name="'inputVoltage'"
                :replaceTitle="'What is your input voltage?'"
                unit="V"
                :dataTestLabel="dataTestLabel + '-InputVoltage'"
                :min="minimumMaximumScalePerParameter['voltage']['min']"
                :max="minimumMaximumScalePerParameter['voltage']['max']"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="'col-lg-1 col-md-2'"
                v-model="localData.inputVoltage"
                :addButtonStyle="$styleStore.wizard.addButton"
                :removeButtonBgColor="$styleStore.wizard.removeButton.background"
                :titleFontSize="$styleStore.wizard.inputTitleFontSize"
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
                :name="'numberOutputs'"
                :replaceTitle="'How many outputs?'"
                :dataTestLabel="dataTestLabel + '-NumberOutputs'"
                :options="Array.from({length: 10}, (_, i) => i + 1)"
                :titleSameRow="true"
                v-model="localData"
                :labelWidthProportionClass="labelWidthProportionClass"
                :valueWidthProportionClass="valueWidthProportionClass"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :labelFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :textColor="$styleStore.wizard.inputTextColor"
                @update="updateNumberOutputs"
            />
        </div>
        <div class="row mt-2 ps-2">
            <div class="offset-2 col-9" v-for="datum, index in localData.outputsParameters">
                <PairOfDimensions
                    class="ps-3 border-top border-bottom pt-2"
                    :names="['voltage', 'current']"
                    :units="['V', 'A']"
                    :dataTestLabel="dataTestLabel + '-outputsParameters'"
                    :mins="[minimumMaximumScalePerParameter['voltage']['min'], minimumMaximumScalePerParameter['current']['min']]"
                    :maxs="[minimumMaximumScalePerParameter['voltage']['max'], minimumMaximumScalePerParameter['current']['max']]"
                    v-model="localData.outputsParameters[index]"
                    :labelWidthProportionClass="labelWidthProportionClass"
                    :valueWidthProportionClass="valueWidthProportionClass"
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
            <Dimension class="ps-3"
                :name="'diodeVoltageDrop'"
                :replaceTitle="'What is the voltage drop in the diode?'"
                unit="V"
                :dataTestLabel="dataTestLabel + '-DiodeVoltageDrop'"
                :min="minimumMaximumScalePerParameter['voltage']['min']"
                :max="minimumMaximumScalePerParameter['voltage']['max']"
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
            <Dimension class="ps-3"
                :name="'maximumDrainSourceVoltage'"
                :replaceTitle="'What maximum drain-source voltage can the switch withstand?'"
                unit="V"
                :dataTestLabel="dataTestLabel + '-MaximumDrainSourceVoltage'"
                :min="minimumMaximumScalePerParameter['voltage']['min']"
                :max="minimumMaximumScalePerParameter['voltage']['max']"
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
            <Dimension class="ps-3"
                :name="'currentRippleRatio'"
                :replaceTitle="'What is the maximum current ripple you can have?'"
                unit="%"
                :visualScale="100"
                :dataTestLabel="dataTestLabel + '-CurrentRippleRatio'"
                :min="0"
                :max="1"
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
            <Dimension class="ps-3"
                :name="'efficiency'"
                :replaceTitle="'What is target efficiency?'"
                unit="%"
                :visualScale="100"
                :dataTestLabel="dataTestLabel + '-Efficiency'"
                :min="0"
                :max="1"
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
