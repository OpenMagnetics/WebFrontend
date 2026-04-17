<script setup>
import { ref } from 'vue'
import { useMasStore } from '../../stores/mas'
import { toTitleCase, toPascalCase, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import { tooltipsMagneticSynthesisDesignRequirements } from '/WebSharedComponents/assets/js/texts.js'
import { defaultDesignRequirements, compulsoryRequirements, designRequirementsOrdered, isolationSideOrdered, IsolationSideOrdered, minimumMaximumScalePerParameter} from '/WebSharedComponents/assets/js/defaults.js'
import { Market, ConnectionType, Topologies } from '/WebSharedComponents/assets/ts/MAS.ts'
import Insulation from './DesignRequirements/Insulation.vue'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import MaximumDimensions from './DesignRequirements/MaximumDimensions.vue'
import Impedances from './DesignRequirements/Impedances.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import ElementFromListRadio from '/WebSharedComponents/DataInput/ElementFromListRadio.vue'
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
        const wiringTechnologyOptions = {
            "Planar": "Printed",
            "Wound": "Wound",
        }

        return {
            numberWindingsAux,
            masStore,
            wiringTechnologyOptions,
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
                if (window.innerWidth < 1200 && label.length > 10) {
                    var slice = 3;
                    if (window.innerWidth <= 768) {
                        slice = 8;
                    }
                    else{
                        if (window.innerWidth >= 850 && window.innerWidth < 970) {
                            slice = 5;
                        }
                        if (window.innerWidth >= 970 && window.innerWidth < 1200) {
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
        },
        updatedWiringTechnologies(value, index) {
            if (this.masStore.mas.magnetic.coil.turnsDescription != null) {
                if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.Power) {
                    this.masStore.resetMagnetic("power");
                }
                if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.CommonModeChoke) {
                    this.masStore.resetMagnetic("filter");
                }
            }
        },
    }
}
</script>


<template>
    <div class="dr-container">
        <div class="dr-layout">
            <!-- Left: Requirements list panel -->
            <div class="dr-list-panel">
                <div class="dr-panel-header">
                    <i class="fa-solid fa-clipboard-list"></i>
                    <span>Requirements</span>
                </div>
                <div class="dr-list-body">
                    <div class="dr-req-item"
                         v-for="requirementName in designRequirementsOrdered[$stateStore.getCurrentApplication()]"
                         :key="requirementName"
                         :class="{
                            'dr-req-item-active': masStore.mas.inputs.designRequirements[requirementName] != null
                                && !compulsoryRequirements[$stateStore.getCurrentApplication()].includes(requirementName),
                            'dr-req-item-required': compulsoryRequirements[$stateStore.getCurrentApplication()].includes(requirementName)
                         }">
                        <label v-tooltip="tooltipsMagneticSynthesisDesignRequirements[requirementName]"
                               class="dr-req-label">{{ toTitleCase(shortenedLabels[requirementName]) }}</label>
                        <button
                            :data-cy="dataTestLabel + '-' + toPascalCase(requirementName) + '-add-remove-button'"
                            v-if="!compulsoryRequirements[$stateStore.getCurrentApplication()].includes(requirementName)"
                            :class="masStore.mas.inputs.designRequirements[requirementName]==null ? 'dr-btn dr-btn-add' : 'dr-btn dr-btn-remove'"
                            @click="requirementButtonClicked(requirementName)">
                            <i :class="masStore.mas.inputs.designRequirements[requirementName]==null ? 'fa-solid fa-plus' : 'fa-solid fa-xmark'"></i>
                            <span>{{ masStore.mas.inputs.designRequirements[requirementName]==null ? 'Add' : 'Remove' }}</span>
                        </button>
                        <button
                            :data-cy="dataTestLabel + '-' + toPascalCase(requirementName) + '-required-button'"
                            v-if="compulsoryRequirements[$stateStore.getCurrentApplication()].includes(requirementName)"
                            class="dr-btn dr-btn-required"
                            disabled>
                            <i class="fa-solid fa-lock"></i>
                            <span>{{ (requirementName == 'turnsRatios' && masStore.mas.inputs.designRequirements.turnsRatios.length == 0) ? 'Not Req.' : 'Required' }}</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Right: Configuration panel -->
            <div class="dr-detail-panel">
                <div class="dr-panel-header">
                    <i class="fa-solid fa-sliders"></i>
                    <span>Configuration</span>
                </div>
                <div class="dr-detail-body">
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

                <DimensionWithTolerance class="border-bottom py-2 ps-2"
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
                <ElementFromListRadio class="border-bottom py-2 ps-4"
                    v-if="!$stateStore.hasCurrentApplicationMirroredWindings() && masStore.mas.inputs.designRequirements.wiringTechnology != null"
                    :name="'wiringTechnology'"
                    :dataTestLabel="dataTestLabel + '-WiringTechnology'"
                    :options="wiringTechnologyOptions"
                    :titleSameRow="true"
                    v-model="masStore.mas.inputs.designRequirements"
                    :labelWidthProportionClass="'col-5'"
                    :valueWidthProportionClass="'col-3'"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                    @update="updatedWiringTechnologies"
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

                <DimensionWithTolerance class="border-bottom py-2 ps-3"
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

                <ArrayElementFromList class="border-bottom py-2 ps-0"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.terminalType != null"
                    :name="'terminalType'"
                    :dataTestLabel="dataTestLabel + '-TerminalType'"
                    :defaultValue="new Array(Object.keys(ConnectionType).length).fill(Object.keys(ConnectionType)[0])"
                    :options="Object.values(ConnectionType)" 
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

                <ElementFromList class="border-bottom py-2 ps-4"
                    :style = "$styleStore.designRequirements.inputBorderColor"
                    v-if="masStore.mas.inputs.designRequirements.topology != null"
                    :name="'topology'"
                    :dataTestLabel="dataTestLabel + '-Topology'"
                    :options="Object.values(Topologies)"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="$styleStore.designRequirements.inputFontSize"
                    :labelFontSize="$styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor="$styleStore.designRequirements.inputLabelBgColor"
                    :valueBgColor="$styleStore.designRequirements.inputValueBgColor"
                    :textColor="$styleStore.designRequirements.inputTextColor"
                />

                <ElementFromList class="border-bottom py-2 ps-4"
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
    </div>
</template>


<style scoped>
/* Match Magnetic Builder's palette: primary-tinted transparent panel, var(--bs-dark) input surfaces */
.dr-container {
    --dr-border: rgba(var(--bs-primary-rgb), 0.15);
    --dr-border-soft: rgba(var(--bs-primary-rgb), 0.12);
    --dr-text: #f2f2f2;
    --dr-text-muted: rgba(242, 242, 242, 0.7);

    padding: 0.5rem 0.75rem;
}

.dr-layout {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
}

/* ============ Shared panel ============ */
.dr-list-panel,
.dr-detail-panel {
    display: flex;
    flex-direction: column;
    background:
        linear-gradient(145deg,
            rgba(var(--bs-primary-rgb), 0.06) 0%,
            rgba(var(--bs-primary-rgb), 0.02) 100%),
        var(--bs-dark);
    border: 1px solid var(--dr-border);
    border-radius: 14px;
    box-shadow:
        0 4px 20px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
    overflow: hidden;
}

.dr-list-panel {
    width: 340px;
    flex-shrink: 0;
    max-height: 80vh;
}

.dr-detail-panel {
    flex: 1;
    min-width: 0;
    max-height: 80vh;
}

.dr-panel-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.9rem;
    background: rgba(var(--bs-primary-rgb), 0.1);
    border-bottom: 1px solid var(--dr-border-soft);
    color: var(--bs-primary);
    font-weight: 600;
    font-size: 0.95rem;
    letter-spacing: 0.02em;
    flex-shrink: 0;
}

.dr-panel-header i {
    font-size: 1rem;
    filter: drop-shadow(0 0 4px rgba(var(--bs-primary-rgb), 0.45));
}

.dr-list-body {
    padding: 0.45rem 0.5rem 0.6rem 0.5rem;
    overflow-y: auto;
    flex: 1;
}

.dr-detail-body {
    padding: 0;
    overflow-y: auto;
    flex: 1;
}

/* Neutralise Bootstrap border-top/border-bottom on the form rows and
   draw a single clean divider between sections instead, so there are no
   "dark holes" between them. */
.dr-detail-body :deep(> *) {
    border-top: 0 !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
    padding: 0.55rem 0.85rem !important;
    background: transparent !important;
}

.dr-detail-body :deep(> *:last-child) {
    border-bottom: 0 !important;
}

.dr-detail-body :deep(> *:hover) {
    background: rgba(255, 255, 255, 0.025) !important;
}

/* ============ Requirement list item ============ */
.dr-req-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.38rem 0.55rem;
    margin: 0;
    background: transparent;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 0;
    transition: background 0.15s;
}

.dr-req-item:last-child {
    border-bottom: 0;
}

.dr-req-item:hover {
    background: rgba(255, 255, 255, 0.03);
}

.dr-req-item-active {
    background: rgba(var(--bs-primary-rgb), 0.05);
}

.dr-req-item-active:hover {
    background: rgba(var(--bs-primary-rgb), 0.09);
}

.dr-req-item-required {
    background: transparent;
}

.dr-req-label {
    flex: 1;
    min-width: 0;
    color: var(--dr-text);
    font-size: 0.88rem;
    font-weight: 500;
    cursor: help;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ============ List buttons ============ */
.dr-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    padding: 0.3rem 0.65rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    border: 1px solid transparent;
    transition: filter 0.15s, box-shadow 0.2s, transform 0.1s, background 0.15s, color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
    min-width: 5.5rem;
}

.dr-btn:hover:not(:disabled) {
    filter: brightness(1.15);
    transform: translateY(-1px);
}

.dr-btn:disabled {
    cursor: default;
    opacity: 0.75;
}

.dr-btn-add {
    background: linear-gradient(135deg,
        color-mix(in srgb, var(--bs-primary) 115%, transparent 0%) 0%,
        var(--bs-primary) 55%,
        rgb(var(--bs-primary-rgb) / 0.85) 100%);
    color: #ffffff;
    border: 1px solid color-mix(in srgb, var(--bs-primary) 70%, #ffffff 30%);
    box-shadow:
        0 0 0 1px rgb(var(--bs-primary-rgb) / 0.3),
        0 2px 6px rgb(var(--bs-primary-rgb) / 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.25);
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
}

.dr-btn-remove {
    background: rgb(var(--bs-danger-rgb) / 0.2);
    border: 1px solid rgb(var(--bs-danger-rgb) / 0.6);
    color: var(--bs-danger);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.dr-btn-remove:hover:not(:disabled) {
    background: rgb(var(--bs-danger-rgb) / 0.3);
    border-color: rgb(var(--bs-danger-rgb) / 0.8);
}

.dr-btn-required {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.55);
}
</style>