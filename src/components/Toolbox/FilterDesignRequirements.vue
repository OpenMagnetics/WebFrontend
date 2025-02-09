<script setup>
import { ref } from 'vue'
import { useMasStore } from '/src/stores/mas'
import { useStyleStore } from '/src/stores/style'
import { toTitleCase, toPascalCase } from '/WebSharedComponents/assets/js/utils.js'
import { tooltipsMagneticSynthesisDesignRequirements } from '/WebSharedComponents/assets/js/texts.js'
import { defaultDesignRequirements, designRequirementsOrdered, isolationSideOrdered, minimumMaximumScalePerParameter} from '/WebSharedComponents/assets/js/defaults.js'
import { Market, ConnectionType, Topology } from '/WebSharedComponents/assets/ts/MAS.ts'
import Insulation from '/src/components/Toolbox/DesignRequirements/Insulation.vue'
import Dimension from '/WebSharedComponents/DataInput/Dimension.vue'
import MaximumDimensions from '/src/components/Toolbox/DesignRequirements/MaximumDimensions.vue'
import Impedances from '/src/components/Toolbox/DesignRequirements/Impedances.vue'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import ArrayDimensionWithTolerance from '/src/components/Toolbox/DesignRequirements/ArrayDimensionWithTolerance.vue'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import ArrayElementFromList from '/src/components/Toolbox/DesignRequirements/ArrayElementFromList.vue'
import Name from '/src/components/Toolbox/DesignRequirements/Name.vue'
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
        const compulsoryRequirements = ["numberWindings", "magnetizingInductance", "minimumImpedance", "turnsRatios", "name"];
        const masStore = useMasStore();
        const styleStore = useStyleStore();
        var numberWindings = 2;

        if (masStore.mas.inputs.designRequirements.turnsRatios != null) {
            numberWindings = masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
        }
        const numberWindingsAux = {
            numberWindings: numberWindings
        }
        return {
            compulsoryRequirements,
            numberWindingsAux,
            masStore,
            styleStore,
        }
    },
    computed: {
        shortenedLabels() {
            const shortenedLabels = {"numberWindings": "No. Windings"};
            for (let [key, value] of Object.entries(this.masStore.mas.inputs.designRequirements)) {
                var label = key;
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
                shortenedLabels[key] = label;
            }
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

        this.updatedNumberElements(this.numberWindingsAux.numberWindings, 'numberWindings');
    },
    methods: {
        canContinue(store){
            var canContinue = store.mas.inputs.designRequirements.magnetizingInductance != null && store.mas.inputs.designRequirements.minimumImpedance != null;
            canContinue &= store.mas.inputs.designRequirements.name != '';
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
    }
}
</script>


<template>
    <div class="container">
        <div v-tooltip="styleTooltip" class="row">
            <div class="col-sm-12 col-md-4 text-start border border-primary" style="max-width: 360px; height: 75vh">
                <div class="my-2 row px-2" v-for="requirementName in designRequirementsOrdered" >
                    <label v-tooltip="tooltipsMagneticSynthesisDesignRequirements[requirementName]"  class="rounded-2 fs-5 col-8">{{toTitleCase(shortenedLabels[requirementName])}}</label>
                
                    <button :data-cy="dataTestLabel + '-' + toPascalCase(requirementName) + '-add-remove-button'" v-if="!compulsoryRequirements.includes(requirementName)" :class="masStore.mas.inputs.designRequirements[requirementName]==null? 'btn-info' : 'btn-danger'" class="btn float-end col-4" :style="'filter: brightness(70%)'" @click="requirementButtonClicked(requirementName)">
                        {{masStore.mas.inputs.designRequirements[requirementName]==null? 'Add Req.' : 'Remove'}}
                    </button>
                    <button :data-cy="dataTestLabel + '-' + toPascalCase(requirementName) + '-required-button'" v-if="compulsoryRequirements.includes(requirementName)" class="btn btn-light float-end disabled col-4">
                        {{(requirementName == 'turnsRatios' && masStore.mas.inputs.designRequirements.turnsRatios.length == 0) ? 'Not Req.' : "Required"}}
                    </button>
                </div>
            </div>
            <div class="col-sm-12 col-md-8 text-start pe-0">
                <Name class="border-bottom border-top py-2" 
                    :name="'name'"
                    :dataTestLabel="dataTestLabel + '-Name'"
                    :defaultValue="defaultDesignRequirements.name"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :labelFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                    @hasError="hasError"
                />

                <ElementFromList class="border-bottom py-2 ps-3"
                    :name="'numberWindings'"s
                    :dataTestLabel="dataTestLabel + '-NumberWindings'"
                    :options="Array.from({length: 12}, (_, i) => i + 1)"
                    :titleSameRow="true"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :labelFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                    v-model="numberWindingsAux"
                    @update="updatedNumberElements"
                />

                <DimensionWithTolerance class="border-bottom py-2"
                    v-if="masStore.mas.inputs.designRequirements.magnetizingInductance != null"
                    :name="'magnetizingInductance'"
                    unit="H"
                    :dataTestLabel="dataTestLabel + '-MagnetizingInductance'"
                    :defaultValue="defaultDesignRequirements.magnetizingInductance" 
                    :defaultField="'minimum'"
                    :min="minimumMaximumScalePerParameter['inductance']['min']"
                    :max="minimumMaximumScalePerParameter['inductance']['max']"
                    v-model="masStore.mas.inputs.designRequirements.magnetizingInductance"
                    :unitExtraStyleClass="'py-1 mt-1 '"
                    :addButtonStyle="styleStore.designRequirements.requirementButton"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :titleFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                    @hasError="hasError"
                />

                <Impedances class="border-bottom py-2"
                    v-if="masStore.mas.inputs.designRequirements.minimumImpedance != null"
                    :dataTestLabel="dataTestLabel + '-MinimumImpedance'"
                    :addElementButtonColor='styleStore.designRequirements.addElementButtonColor'
                    :removeElementButtonColor='styleStore.designRequirements.removeElementButtonColor'
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :titleFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                    :unitExtraStyleClass="' p-1'"
                />

                <ArrayDimensionWithTolerance class="border-bottom py-2"
                    v-if="masStore.mas.inputs.designRequirements.turnsRatios != null && masStore.mas.inputs.designRequirements.turnsRatios.length > 0"
                    :name="'turnsRatios'"
                    :dataTestLabel="dataTestLabel + '-TurnsRatios'"
                    :defaultField="'nominal'"
                    :defaultValue="{'nominal': 1}"
                    :disabledScaling="true"
                    :maximumNumberElements="12"
                    :unitExtraStyleClass="'py-1 mt-1'"
                    :addButtonStyle="styleStore.designRequirements.requirementButton"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :titleFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                    @hasError="hasError"
                />

                <Insulation class="border-bottom py-2"
                    v-if="masStore.mas.inputs.designRequirements.insulation != null"
                    :dataTestLabel="dataTestLabel + '-Insulation'"
                    :defaultValue="defaultDesignRequirements.insulation"
                    v-model="masStore.mas.inputs.designRequirements"
                    :unitExtraStyleClass="'p-1 mt-1'"
                    :addButtonStyle="styleStore.designRequirements.requirementButton"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :titleFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                />

                <ArrayDimensionWithTolerance class="border-bottom py-2"
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
                    :unitExtraStyleClass="'p-1 mt-1'"
                    :addButtonStyle="styleStore.designRequirements.requirementButton"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :titleFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                    @hasError="hasError"
                />

                <ArrayDimensionWithTolerance class="border-bottom py-2"
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
                    :unitExtraStyleClass="'p-1 mt-1'"
                    :addButtonStyle="styleStore.designRequirements.requirementButton"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :titleFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                    @hasError="hasError"
                />

                <DimensionWithTolerance class="border-bottom py-2"
                    v-if="masStore.mas.inputs.designRequirements.operatingTemperature != null"
                    :name="'operatingTemperature'"
                    unit="°C"
                    :dataTestLabel="dataTestLabel + '-OperatingTemperature'"
                    :allowNegative="true"
                    :min="minimumMaximumScalePerParameter['temperature']['min']"
                    :max="minimumMaximumScalePerParameter['temperature']['max']"
                    :defaultValue="defaultDesignRequirements.operatingTemperature"
                    v-model="masStore.mas.inputs.designRequirements.operatingTemperature"
                    :unitExtraStyleClass="'p-1 mt-1'"
                    :addButtonStyle="styleStore.designRequirements.requirementButton"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :titleFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                    @hasError="hasError"
                />
              
                <Dimension class="border-bottom py-2 ps-3"
                    v-if="masStore.mas.inputs.designRequirements.maximumWeight != null"
                    :name="'maximumWeight'"
                    unit="g"
                    :dataTestLabel="dataTestLabel + '-MaximumWeight'"
                    :min="minimumMaximumScalePerParameter['weight']['min']"
                    :max="minimumMaximumScalePerParameter['weight']['max']"
                    :defaultValue="300"
                    :unitExtraStyleClass="'p-1 mt-1'"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :labelFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                />

                <MaximumDimensions class="border-bottom py-2"
                    v-if="masStore.mas.inputs.designRequirements.maximumDimensions != null"
                    unit="m"
                    :dataTestLabel="dataTestLabel + '-MaximumDimensions'"
                    :min="minimumMaximumScalePerParameter['dimension']['min']"
                    :max="minimumMaximumScalePerParameter['dimension']['max']"
                    :defaultValue="defaultDesignRequirements.maximumDimensions"
                    :unitExtraStyleClass="'p-1 mt-1'"
                    :addButtonStyle="styleStore.designRequirements.requirementButton"
                    v-model="masStore.mas.inputs.designRequirements.maximumDimensions"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :titleFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                />
                <ArrayElementFromList class="border-bottom py-2"

                    v-if="masStore.mas.inputs.designRequirements.terminalType != null"
                    :name="'terminalType'"
                    :dataTestLabel="dataTestLabel + '-TerminalType'"
                    :defaultValue="defaultDesignRequirements.terminalType[0]"
                    :options="ConnectionType" 
                    :titleSameRow="true"
                    :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length + 1"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :titleFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                />

                <ElementFromList class="border-bottom py-2"
                    v-if="masStore.mas.inputs.designRequirements.topology != null"
                    :name="'topology'"
                    :dataTestLabel="dataTestLabel + '-Topology'"
                    :options="Object.values(Topology)"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :labelFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                />

                <ElementFromList class="border-bottom py-2"
                    :name="'market'"
                    v-if="masStore.mas.inputs.designRequirements.market != null"
                    :dataTestLabel="dataTestLabel + '-Market'"
                    :options="Object.values(Market)"
                    v-model="masStore.mas.inputs.designRequirements"
                    :valueFontSize="styleStore.designRequirements.inputFontSize"
                    :labelFontSize="styleStore.designRequirements.inputTitleFontSize"
                    :labelBgColor='styleStore.designRequirements.inputLabelBgColor'
                    :valueBgColor='styleStore.designRequirements.inputValueBgColor'
                    :textColor='styleStore.designRequirements.inputTextColor'
                />

            </div>
        </div>
    </div>
</template>


