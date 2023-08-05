<script setup>
import { ref } from 'vue'
import { useMasStore } from '/src/stores/mas'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import { toTitleCase } from '/src/assets/js/utils.js'
import { tooltipsMagneticSynthesisDesignRequirements } from '/src/assets/js/texts.js'
import { defaultDesignRequirements, designRequirementsOrdered, isolationSideOrdered, minimumMaximumScalePerParameter} from '/src/assets/js/defaults.js'
import { Market, TerminalType, Topology } from '/src/assets/ts/MAS.ts'
import Insulation from '/src/components/Synthesis/DesignRequirements/Insulation.vue'
import MaximumWeight from '/src/components/Synthesis/DesignRequirements/MaximumWeight.vue'
import MaximumDimensions from '/src/components/Synthesis/DesignRequirements/MaximumDimensions.vue'
import DimensionWithTolerance from '/src/components/Synthesis/DesignRequirements/DimensionWithTolerance.vue'
import ArrayDimensionWithTolerance from '/src/components/Synthesis/DesignRequirements/ArrayDimensionWithTolerance.vue'
import ElementFromList from '/src/components/Synthesis/DesignRequirements/ElementFromList.vue'
import ArrayElementFromList from '/src/components/Synthesis/DesignRequirements/ArrayElementFromList.vue'
import Name from '/src/components/Synthesis/DesignRequirements/Name.vue'
</script>
<script>
export default {
    props: {
    },
    data() {
        const compulsoryRequirements = ["numberWindings", "magnetizingInductance", "turnsRatios", "name"];
        const masStore = useMasStore();
        var numberWindings = 1;
        if (masStore.mas.inputs.designRequirements.turnsRatios != null) {
            numberWindings = masStore.mas.inputs.designRequirements.turnsRatios.length + 1;
        }
        const numberWindingsAux = {
            numberWindings: numberWindings
        }
        const schema = Yup.object().shape({
            switchingFrequencyValidator: Yup.number().required().typeError("The value for frequency must be a number").label("Switching Frequency").test(
                'Is positive?', 
                'Switching Frequency must be greater than 0!', 
                (value) => value > 0
            ),
            dutyCycleValidator: Yup.number().required().typeError("The value for duty cycle must be a number").min(0.01).max(99.99),
        });
        return {
            compulsoryRequirements,
            schema,
            numberWindingsAux,
            masStore
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
    mounted () {
    },
    methods: {
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
                this.masStore.mas.inputs.designRequirements.turnsRatios = newElementsTurnsRatios;
                this.masStore.mas.magnetic.coil.functionalDescription = newElementsCoil;
                this.masStore.updatedTurnsRatios();
                console.log(this.masStore.mas.magnetic.coil.functionalDescription)
            }
        },
    }
}
</script>


<template>
    <div class="container">
        <div v-tooltip="styleTooltip" class="row">
            <div class="col-sm-12 col-md-4 text-start border border-primary" style="max-width: 360px;">
                <div class="my-2 row px-2" v-for="requirementName in designRequirementsOrdered" >
                    <label v-tooltip="tooltipsMagneticSynthesisDesignRequirements[requirementName]"  class="rounded-2 fs-5 col-8">{{toTitleCase(shortenedLabels[requirementName])}}</label>
                
                    <button v-if="!compulsoryRequirements.includes(requirementName)" :class="masStore.mas.inputs.designRequirements[requirementName]==null? 'btn-info' : 'btn-danger'" class="btn float-end col-4" :style="'filter: brightness(70%)'" @click="requirementButtonClicked(requirementName)">
                        {{masStore.mas.inputs.designRequirements[requirementName]==null? 'Add Req.' : 'Remove'}}
                    </button>
                    <button v-if="compulsoryRequirements.includes(requirementName)" class="btn btn-light float-end disabled col-4">
                        Required
                    </button>
                </div>
            </div>
            <div class="col-sm-12 col-md-8 text-start pe-0">
                <Name :defaultValue="defaultDesignRequirements.name" class="border-bottom border-top py-2" :name="'name'" v-model="masStore.mas.inputs.designRequirements"/>

                <ElementFromList class="border-bottom py-2" :name="'numberWindings'" v-model="numberWindingsAux" :options="Array.from({length: 12}, (_, i) => i + 1)" @updatedNumberElements="updatedNumberElements" :titleSameRow="true"/>

                <DimensionWithTolerance :min="minimumMaximumScalePerParameter['inductance']['min']" :max="minimumMaximumScalePerParameter['inductance']['max']" class="border-bottom py-2" :name="'magnetizingInductance'" v-if="masStore.mas.inputs.designRequirements.magnetizingInductance != null" :defaultValue="defaultDesignRequirements.magnetizingInductance" v-model="masStore.mas.inputs.designRequirements.magnetizingInductance" unit="H"/>

                <ArrayDimensionWithTolerance class="border-bottom py-2" :name="'turnsRatios'" v-if="masStore.mas.inputs.designRequirements.turnsRatios != null" defaultField="nominal" :defaultValue="{'nominal': 1}" :maximumNumberElements="12"/>

                <Insulation :defaultValue="defaultDesignRequirements.insulation" class="border-bottom py-2" v-if="masStore.mas.inputs.designRequirements.insulation != null" v-model="masStore.mas.inputs.designRequirements"/>

                <ArrayDimensionWithTolerance :allowAllNull="true" :min="minimumMaximumScalePerParameter['leakageInductance']['min']" :max="minimumMaximumScalePerParameter['leakageInductance']['max']" class="border-bottom py-2" :name="'leakageInductance'" v-if="masStore.mas.inputs.designRequirements.leakageInductance != null" defaultField="maximum" :defaultValue="defaultDesignRequirements.leakageInductance[0]" unit="H" :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length"/>

                <ArrayDimensionWithTolerance :allowAllNull="true" :min="minimumMaximumScalePerParameter['strayCapacitance']['min']" :max="minimumMaximumScalePerParameter['strayCapacitance']['max']" class="border-bottom py-2" :name="'strayCapacitance'" v-if="masStore.mas.inputs.designRequirements.strayCapacitance != null" defaultField="maximum" :defaultValue="defaultDesignRequirements.strayCapacitance[0]" unit="F" :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length"/>

                <DimensionWithTolerance :allowNegative="true" :min="minimumMaximumScalePerParameter['temperature']['min']" :max="minimumMaximumScalePerParameter['temperature']['max']" class="border-bottom py-2" :name="'operatingTemperature'" v-if="masStore.mas.inputs.designRequirements.operatingTemperature != null" :defaultValue="defaultDesignRequirements.operatingTemperature" v-model="masStore.mas.inputs.designRequirements.operatingTemperature" unit="°C"/>
              
                <MaximumWeight :min="minimumMaximumScalePerParameter['weight']['min']" :max="minimumMaximumScalePerParameter['weight']['max']" class="border-bottom py-2" v-model="masStore.mas.inputs.designRequirements" v-if="masStore.mas.inputs.designRequirements.maximumWeight != null" :defaultValue="300" unit="g"/>

                <MaximumDimensions :min="minimumMaximumScalePerParameter['dimension']['min']" :max="minimumMaximumScalePerParameter['dimension']['max']" class="border-bottom py-2" v-if="masStore.mas.inputs.designRequirements.maximumDimensions != null" :defaultValue="defaultDesignRequirements.maximumDimensions" unit="m" v-model="masStore.mas.inputs.designRequirements.maximumDimensions"/>

                <ArrayElementFromList :defaultValue="defaultDesignRequirements.terminalType[0]" class="border-bottom py-2" :name="'terminalType'" v-model="masStore.mas.inputs.designRequirements" v-if="masStore.mas.inputs.designRequirements.terminalType != null" :options="TerminalType"  :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length + 1"/>

                <ElementFromList class="border-bottom py-2" :name="'topology'" v-model="masStore.mas.inputs.designRequirements" v-if="masStore.mas.inputs.designRequirements.topology != null" :options="Topology" />

                <ElementFromList class="border-bottom py-2" :name="'market'" v-model="masStore.mas.inputs.designRequirements" v-if="masStore.mas.inputs.designRequirements.market != null" :options="Market"/>

            </div>
        </div>
    </div>
</template>


