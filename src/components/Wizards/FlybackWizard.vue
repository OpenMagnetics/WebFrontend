<script setup>
import { useMasStore } from '../../stores/mas'
import { combinedStyle, combinedClass, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import PairOfDimensions from '/WebSharedComponents/DataInput/PairOfDimensions.vue'
import { defaultCmcWizardInputs, defaultDesignRequirements, minimumMaximumScalePerParameter, filterMas } from '/WebSharedComponents/assets/js/defaults.js'
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
            // if (newNumber > this.localData.extraHarmonics.length) {
            //     const diff = newNumber - this.localData.extraHarmonics.length;
            //     for (let i = 0; i < diff; i++) {
            //         var newHarmonic;
            //         console.log(deepCopy(defaultCmcWizardInputs))
            //         if (this.localData.extraHarmonics.length == 0) {
            //             newHarmonic = {
            //                 frequency: defaultCmcWizardInputs.extraHarmonics[0].frequency,
            //                 amplitude: defaultCmcWizardInputs.extraHarmonics[0].amplitude,
            //             }
            //         }
            //         else {
            //             newHarmonic = {
            //                 frequency: this.localData.extraHarmonics[this.localData.extraHarmonics.length - 1].frequency * 2,
            //                 amplitude: this.localData.extraHarmonics[this.localData.extraHarmonics.length - 1].amplitude / 2,
            //             }
            //         }

            //         this.localData.extraHarmonics.push(newHarmonic);
            //     }
            // }
            // else if (newNumber < this.localData.extraHarmonics.length) {
            //     const diff = this.localData.extraHarmonics.length - newNumber;
            //     this.localData.extraHarmonics.splice(-diff, diff);
            // }
            // this.updateErrorMessage();
        },

        process() {
            this.masStore.resetMas("power");

        },
        processAndReview() {
            this.process();
            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Flyback);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
            setTimeout(() => {this.$router.push('/magnetic_tool');}, 100);
        },
        processAndAdvise() {
            this.process();
            this.$stateStore.resetMagneticTool();
            this.$stateStore.designLoaded();
            console.log(this.$stateStore.SupportedApplications.Flyback)
            console.log(this.$stateStore.SupportedApplications.Flyback)
            console.log(this.$stateStore.SupportedApplications.Flyback)
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Flyback);
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.setCurrentToolSubsection("toolSelector");
            this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
            this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
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
            <div class="offset-2 col-9" v-for="datum, index in localData.extraHarmonics">
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
            <div class="offset-2 col-9" v-for="datum, index in localData.impedancePoints">
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
                :replaceTitle="'What ambiente temperature around the component?'"
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
        <div class="row mt-2 ps-2">

            <MaximumDimensions class="ps-3"
                :replaceTitle="'Do you have dimensional restrictions?'"
                :style="$styleStore.designRequirements.inputBorderColor"
                unit="m"
                :dataTestLabel="dataTestLabel + '-MaximumDimensions'"
                :defaultValue="defaultCmcWizardInputs.maximumDimensions"
                :min="minimumMaximumScalePerParameter['dimension']['min']"
                :max="minimumMaximumScalePerParameter['dimension']['max']"
                v-model="localData.maximumDimensions"
                :addButtonStyle="$styleStore.wizard.requirementButton"
                :valueFontSize="$styleStore.wizard.inputFontSize"
                :titleFontSize="$styleStore.wizard.inputTitleFontSize"
                :labelBgColor="$styleStore.wizard.inputLabelBgColor"
                :valueBgColor="$styleStore.wizard.inputValueBgColor"
                :errorTextColor="$styleStore.wizard.inputErrorTextColor"
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
