<script setup>
import { useMasStore } from '/src/stores/mas'
import { Form, Field, configure} from 'vee-validate';
import * as Yup from 'yup';
import { toTitleCase } from '/src/assets/js/utils.js'
import { defaultDesignRequirements } from '/src/assets/js/defaults.js'
import DimensionWithTolerance from '/src/components/Synthesis/DesignRequirements/DimensionWithTolerance.vue'
import ArrayDimensionWithTolerance from '/src/components/Synthesis/DesignRequirements/ArrayDimensionWithTolerance.vue'
</script>
<script>
export default {
    props: {
    },
    data() {
        const compulsoryRequirements = ["magnetizingInductance", "turnsRatios"];
        const masStore = useMasStore();
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
            masStore
        }
    },
    computed: {
        shortenedLabels() {
            const shortenedLabels = []
            return shortenedLabels
        }
    },
    watch: { 
    },
    mounted () {
        this.masStore.mas.inputs.designRequirements.maximumWeight = 5;
        console.log(this.masStore.mas);
        console.log(Object.keys(this.masStore.mas.inputs.designRequirements));
        console.log(this.masStore.mas.inputs.designRequirements['maximumWeight']);
    },
    methods: {
        requirementButtonClicked(requirementName) {
            if (this.masStore.mas.inputs.designRequirements[requirementName] == null) {
                this.masStore.mas.inputs.designRequirements[requirementName] = defaultDesignRequirements[requirementName];
            }
            else {
                this.masStore.mas.inputs.designRequirements[requirementName] = null;
            }
            console.log(requirementName);
            console.log(this.masStore.mas.inputs.designRequirements[requirementName]);
        },
        updatedNumberElements(name) {
            console.log("updated number elements");
            console.log(name);
            if (name == 'turnsRatios') {
                this.masStore.updatedTurnsRatios();
            }
        },
    }
}
</script>


<template>
    <div class="container">
        <div class="row">
            <div class="col-4 text-start border border-primary">
                <div class="my-3" v-for="requirement, requirementName in masStore.mas.inputs.designRequirements" >
                    <label class="rounded-2 fs-5 ms-3 ">{{toTitleCase(requirementName)}}</label>
                
                    <button v-if="!compulsoryRequirements.includes(requirementName)" class="btn btn-primary float-end" @click="requirementButtonClicked(requirementName)">
                        {{masStore.mas.inputs.designRequirements[requirementName]==null? 'Add' : 'Remove'}}
                    </button>
                </div>
            </div>
            <div class="col-8 text-start pe-0">

                <DimensionWithTolerance class="border-bottom" :name="'magnetizingInductance'" v-if="masStore.mas.inputs.designRequirements.magnetizingInductance != null" v-model="masStore.mas.inputs.designRequirements.magnetizingInductance" unit="H"/>
                <ArrayDimensionWithTolerance class="border-bottom" :name="'turnsRatios'" v-if="masStore.mas.inputs.designRequirements.turnsRatios != null" defaultField="nominal" :defaultValue="1" :maximumNumberElements="12" @updatedNumberElements="updatedNumberElements"/>

                <ArrayDimensionWithTolerance class="border-bottom" :name="'leakageInductance'" v-if="masStore.mas.inputs.designRequirements.leakageInductance != null" defaultField="minimum" :defaultValue="2e-6" unit="H" :fixedNumberElements="masStore.mas.inputs.designRequirements.turnsRatios.length"/>


<!--                 <div v-if="true" class="my-3" v-for="requirement, requirementName in masStore.mas.inputs.designRequirements" >
                    <div v-if="masStore.mas.inputs.designRequirements[requirementName] != null">
                        <label class="rounded-2 fs-5 ms-3 ">{{toTitleCase(requirementName)}}</label>
                        <DesignRequirement :name="requirementName" :fields="requirement">
                        </DesignRequirement>
                    </div>
                </div> -->
            </div>
        </div>
    </div>
<!--     <div class="container-flex col-4 text-white mt-2 mb-3 pb-3 border-bottom text-start border border-primary">
                <div class="" v-for="requirement, requirementName in masStore.mas.inputs.designRequirements" >
                    <label class="rounded-2 fs-5 ms-3 ">{{toTitleCase(requirementName)}}</label>
                
                    <button class="btn btn-primary">
                        {{'Add'}}
                    </button>
        </div>
    </div> -->
</template>


