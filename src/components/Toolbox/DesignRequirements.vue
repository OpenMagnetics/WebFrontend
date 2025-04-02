<script setup>
import { ref } from 'vue'
import { useMasStore } from '../../stores/mas'
import { toTitleCase, toPascalCase } from '/WebSharedComponents/assets/js/utils.js'
import { tooltipsMagneticSynthesisDesignRequirements } from '/WebSharedComponents/assets/js/texts.js'
import { defaultDesignRequirements, compulsoryRequirements, designRequirementsOrdered, isolationSideOrdered, IsolationSideOrdered, minimumMaximumScalePerParameter} from '/WebSharedComponents/assets/js/defaults.js'
import { Market, ConnectionType, Topology } from '/WebSharedComponents/assets/ts/MAS.ts'
import Insulation from './DesignRequirements/Insulation.vue'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import MaximumDimensions from './DesignRequirements/MaximumDimensions.vue'
import Impedances from './DesignRequirements/Impedances.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import ArrayDimensionWithTolerance from './DesignRequirements/ArrayDimensionWithTolerance.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import ArrayElementFromList from './DesignRequirements/ArrayElementFromList.vue'
import Name from './DesignRequirements/Name.vue'
</script>
<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        var numberWindings = 1;
        if (masStore.mas.inputs.designRequirements.turnsRatios != null) {
            numberWindings = masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
        }
        const numberWindingsAux = {
            numberWindings: numberWindings
        }

        return {
            numberWindingsAux,
            masStore,
        }
    },
    computed: {
        getNumberPossibleWindings() {
            if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.Power) {
                return Array.from({length: 12}, (_, i) => i + 1);
            }
            else if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.CommonModeChoke) {
                return [2, 3];
            }
            return Array.from({length: 12}, (_, i) => i + 1);
        },
        shortenedLabels() {
            const shortenedLabels = {"numberWindings": "No. Windings"};
            designRequirementsOrdered[this.$stateStore.getCurrentApplication()].forEach((value) => {
                var label = value;
                if (window.innerWidth < 1050 && label.length > 10) {
                    var slice = 3;
                    if (window.innerWidth <= 768) {
                        slice = 8;
                    }
                    else{
                        if (window.innerWidth >= 850 && window.innerWidth < 970) {
                            slice = 5;
                        }
                        if (window.innerWidth >= 970 && window.innerWidth < 1050) {
                            slice = 7;
                        }
                    }

                    label = toTitleCase(label).split(' ')
                        .map(item => item.length < slice? item + ' ' : item.slice(0, slice) + '. ')
                        .join('')
                }
                shortenedLabels[value] = label;
            })
            return shortenedLabels
        },
        styleTooltip() {
            var relative_placement;
            relative_placement = 'right'
            return {
                theme: {
                    placement: relative_placement,
                    width: '400px',
                    "text-align": "start",
                },
            }
        },

    },
    watch: { 
    },
    created () {
        for (var i = 0; i < this.masStore.mas.inputs.designRequirements.turnsRatios[i] + 1; i++) {
            if (i < this.masStore.mas.magnetic.coil.functionalDescription.length) {
                newElementsCoil.push(this.masStore.mas.magnetic.coil.functionalDescription[i]);
            }
            else {
                newElementsCoil.push({'name': toTitleCase(isolationSideOrdered[i])});
            }
        }
    },
    mounted () {
        this.masStore.$subscribe((mutation, state) => {
            this.$emit("canContinue", this.canContinue(state));
        })
        this.$emit("canContinue", this.canContinue(this.masStore));
    },
    methods: {
        canContinue(store){
            var canContinue = store.mas.inputs.designRequirements.magnetizingInductance != null;
            canContinue &= store.mas.inputs.designRequirements.name != '';
            canContinue &= store.mas.inputs.designRequirements.magnetizingInductance.minimum != null ||
                           store.mas.inputs.designRequirements.magnetizingInductance.nominal != null ||
                           store.mas.inputs.designRequirements.magnetizingInductance.maximum != null;
            for (var index in store.mas.inputs.designRequirements.turnsRatios) {
                canContinue &= store.mas.inputs.designRequirements.turnsRatios[index].minimum != null ||
                               store.mas.inputs.designRequirements.turnsRatios[index].nominal != null ||
                               store.mas.inputs.designRequirements.turnsRatios[index].maximum != null;

            }
            return Boolean(canContinue);
        },
        requirementButtonClicked(requirementName) {
            if (this.masStore.mas.inputs.designRequirements[requirementName] == null) {
                this.masStore.mas.inputs.designRequirements[requirementName] = defaultDesignRequirements[requirementName];
            }
            else {
                this.masStore.mas.inputs.designRequirements[requirementName] = null;
            }
        },
        updatedNumberElements(newLength, name) {
            if (name == 'numberWindings') {
                const newElementsCoil = [];
                const newElementsTurnsRatios = [];
                for (var i = 0; i < newLength - 1; i++) {
                    if (i < this.masStore.mas.inputs.designRequirements.turnsRatios.length) {
                        newElementsTurnsRatios.push(this.masStore.mas.inputs.designRequirements.turnsRatios[i]);
                    }
                    else {
                        newElementsTurnsRatios.push({'nominal': 1});
                    }
                }
                for (var i = 0; i < newLength; i++) {
                    if (i < this.masStore.mas.magnetic.coil.functionalDescription.length) {
                        newElementsCoil.push(this.masStore.mas.magnetic.coil.functionalDescription[i]);
                    }
                    else {
                        newElementsCoil.push({'name': toTitleCase(isolationSideOrdered[i])});
                    }
                }
                for (var operationPointIndex = 0; operationPointIndex < this.masStore.mas.inputs.operatingPoints.length; operationPointIndex++) {
                    const newExcitationsPerWinding = [];

                    for (var i = 0; i < newLength; i++) {
                        if (i < this.masStore.mas.inputs.operatingPoints[operationPointIndex].excitationsPerWinding.length) {
                            newExcitationsPerWinding.push(this.masStore.mas.inputs.operatingPoints[operationPointIndex].excitationsPerWinding[i]);
                        }
                        else {
                            newExcitationsPerWinding.push(null);
                        }
                    }
                    this.masStore.mas.inputs.operatingPoints[operationPointIndex].excitationsPerWinding = newExcitationsPerWinding;
                }

                this.masStore.mas.inputs.designRequirements.turnsRatios = newElementsTurnsRatios;
                this.masStore.mas.magnetic.coil.functionalDescription = newElementsCoil;
                this.masStore.updatedTurnsRatios();
            }
        },
        hasError() {
            this.$emit("canContinue", false);
        },
        updatedIsolationSides(value, index) {
            this.masStore.mas.magnetic.coil.functionalDescription[index].isolationSide = value;
        }
    }
}
</script>


<template>
    <div class="container">
        <div v-tooltip="styleTooltip" class="row">
            <div class="col-sm-12 col-md-4 text-start border" style="max-width: 360px; height: 75vh" :style="$styleStore.designRequirements.main">
                <div class="my-2 row px-2" v-for="requirementName in designRequirementsOrdered[$stateStore.getCurrentApplication()]" >
                    <label v-tooltip="tooltipsMagneticSynthesisDesignRequirements[requirementName]"  class="rounded-2 fs-5 col-8">{{toTitleCase(shortenedLabels[requirementName])}}</label>
                
                    <button 
                        :style="masStore.mas.inputs.designRequirements[requirementName]==null? $styleStore.designRequirements.addButton : $styleStore.designRequirements.removeButton"
                        :data-cy="dataTestLabel + '-' + toPascalCase(requirementName) + '-add-remove-button'"
                        v-if="!compulsoryRequirements[$stateStore.getCurrentApplication()].includes(requirementName)"
                        class="btn float-end col-4"
                        @click="requirementButtonClicked(requirementName)">
                        {{masStore.mas.inputs.designRequirements[requirementName]==null? 'Add Req.' : 'Remove'}}
                    </button>
                    <button
                        :style="$styleStore.designRequirements.requiredButton"
                        :data-cy="dataTestLabel + '-' + toPascalCase(requirementName) + '-required-button'"
                        v-if="compulsoryRequirements[$stateStore.getCurrentApplication()].includes(requirementName)"
                        class="btn float-end disabled col-4">
                        {{(requirementName == 'turnsRatios' && masStore.mas.inputs.designRequirements.turnsRatios.length == 0) ? 'Not Req.' : "Required"}}
                    </button>
                </div>
            </div>
            <div class="col-sm-12 col-md-8 text-start pe-0">
<!--                 <Name class="border-bottom border-top py-2" 
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    :name="'name'"
                    :dataTestLabel="dataTestLabel + '-Name'"
                    :defaultValue="defaultDesignRequirements.name"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    @hasError="hasError"
                /> -->

                <ElementFromList class="border-bottom border-top py-2 ps-4"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    :name="'numberWindings'"
                    :dataTestLabel="dataTestLabel + '-NumberWindings'"
                    :options="getNumberPossibleWindings"
                    :titleSameRow="true"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    v-model="numberWindingsAux"
                    @update="updatedNumberElements"
                />

                <DimensionWithTolerance class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.magnetizingInductance != null"
                    :name="'magnetizingInductance'"
                    unit="H"
                    :dataTestLabel="dataTestLabel + '-MagnetizingInductance'"
                    :defaultValue="defaultDesignRequirements.magnetizingInductance" 
                    :defaultField="'minimum'"
                    :min="minimumMaximumScalePerParameter['inductance']['min']"
                    :max="minimumMaximumScalePerParameter['inductance']['max']"
                    v-model="masStore.mas.inputs.designRequirements.magnetizingInductance"
                    :unitExtraStyleClass="'py-1 ps-1 mt-1'"
                    :addButtonStyle="$styleStore.designRequirements.requirementButton"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    @hasError="hasError"
                />

                <Impedances class="border-bottom py-2 px-0"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.minimumImpedance != null"
                    :dataTestLabel="dataTestLabel + '-MinimumImpedance'"
                    :addElementButtonColor="$styleStore.designRequirements.addElementButtonColor"
                    :removeElementButtonColor="$styleStore.designRequirements.removeElementButtonColor"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    :unitExtraStyleClass="'py-1 ps-1'"
                />

                <ArrayDimensionWithTolerance class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="!$stateStore.hasCurrentApplicationMirroredWindings() && masStore.mas.inputs.designRequirements.turnsRatios != null && masStore.mas.inputs.designRequirements.turnsRatios.length > 0"
                    :name="'turnsRatios'"
                    :dataTestLabel="dataTestLabel + '-TurnsRatios'"
                    :defaultField="'nominal'"
                    :defaultValue="{'nominal': 1}"
                    :disabledScaling="true"
                    :maximumNumberElements="12"
                    :addButtonStyle="$styleStore.designRequirements.requirementButton"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    @hasError="hasError"
                />

                <Insulation class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.insulation != null"
                    :dataTestLabel="dataTestLabel + '-Insulation'"
                    :defaultValue="defaultDesignRequirements.insulation"
                    v-model="masStore.mas.inputs.designRequirements"
                    :addButtonStyle="$styleStore.designRequirements.requirementButton"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                />

                <ArrayDimensionWithTolerance class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.leakageInductance != null"
                    :name="'leakageInductance'"
                    unit="H"
                    :dataTestLabel="dataTestLabel + '-LeakageInductance'"
                    :defaultField="'maximum'"
                    :defaultValue="defaultDesignRequirements.leakageInductance[0]"
                    :allowAllNull="true"
                    :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length"
                    :min="minimumMaximumScalePerParameter['leakageInductance']['min']"
                    :max="minimumMaximumScalePerParameter['leakageInductance']['max']"
                    :addButtonStyle="$styleStore.designRequirements.requirementButton"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    @hasError="hasError"
                />

                <ArrayDimensionWithTolerance class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.strayCapacitance != null"
                    :name="'strayCapacitance'"
                    unit="F"
                    :dataTestLabel="dataTestLabel + '-StrayCapacitance'"
                    :defaultField="'maximum'"
                    :defaultValue="defaultDesignRequirements.strayCapacitance[0]"
                    :allowAllNull="true"
                    :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length"
                    :min="minimumMaximumScalePerParameter['strayCapacitance']['min']"
                    :max="minimumMaximumScalePerParameter['strayCapacitance']['max']"
                    :addButtonStyle="$styleStore.designRequirements.requirementButton"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    @hasError="hasError"
                />

                <DimensionWithTolerance class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.operatingTemperature != null"
                    :name="'operatingTemperature'"
                    unit="°C"
                    :dataTestLabel="dataTestLabel + '-OperatingTemperature'"
                    :allowNegative="true"
                    :min="minimumMaximumScalePerParameter['temperature']['min']"
                    :max="minimumMaximumScalePerParameter['temperature']['max']"
                    :defaultValue="defaultDesignRequirements.operatingTemperature"
                    v-model="masStore.mas.inputs.designRequirements.operatingTemperature"
                    :addButtonStyle="$styleStore.designRequirements.requirementButton"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    @hasError="hasError"
                />
              
                <Dimension class="border-bottom py-2 ps-4"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.maximumWeight != null"
                    :name="'maximumWeight'"
                    unit="g"
                    :dataTestLabel="dataTestLabel + '-MaximumWeight'"
                    :min="minimumMaximumScalePerParameter['weight']['min']"
                    :max="minimumMaximumScalePerParameter['weight']['max']"
                    :defaultValue="300"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                />

                <MaximumDimensions class="border-bottom py-2 ps-4"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.maximumDimensions != null"
                    unit="m"
                    :dataTestLabel="dataTestLabel + '-MaximumDimensions'"
                    :min="minimumMaximumScalePerParameter['dimension']['min']"
                    :max="minimumMaximumScalePerParameter['dimension']['max']"
                    :defaultValue="defaultDesignRequirements.maximumDimensions"
                    v-model="masStore.mas.inputs.designRequirements.maximumDimensions"
                    :addButtonStyle="$styleStore.designRequirements.requirementButton"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                />

                <ArrayElementFromList class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.terminalType != null"
                    :name="'terminalType'"
                    :dataTestLabel="dataTestLabel + '-TerminalType'"
                    :defaultValue="new Array(Object.keys(ConnectionType).length).fill(Object.keys(ConnectionType)[0])"
                    :options="ConnectionType" 
                    :titleSameRow="true"
                    :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length + 1"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                />

                <ArrayElementFromList class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.isolationSides != null"
                    :name="'isolationSides'"
                    :dataTestLabel="dataTestLabel + '-IsolationSides'"
                    :defaultValue="Object.keys(IsolationSideOrdered)"
                    :options="IsolationSideOrdered" 
                    :titleSameRow="true"
                    :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length + 1"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :titleFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    @update="updatedIsolationSides"
                />

                <ElementFromList class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.topology != null"
                    :name="'topology'"
                    :dataTestLabel="dataTestLabel + '-Topology'"
                    :options="Object.values(Topology)"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                />

                <ElementFromList class="border-bottom py-2"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    :name="'market'"
                    v-if="masStore.mas.inputs.designRequirements.market != null"
                    :dataTestLabel="dataTestLabel + '-Market'"
                    :options="Object.values(Market)"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                />

            </div>
        </div>
    </div>
</template>


