<script setup>
import { useMasStore } from '/src/stores/mas'
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import DimensionWithTolerance from '/src/components/Synthesis/DesignRequirements/DimensionWithTolerance.vue'
import { isolationSideOrdered } from '/src/assets/js/defaults.js'
</script>

<script>
export default {
    props: {
        name:{
            type: String,
            required: true
        },
        unit:{
            type: String,
            required: false
        },
        maximumNumberElements:{
            type: Number
        },
        fixedNumberElements:{
            type: Number
        },
        defaultField:{
            type: String,
            default: "nominal"
        },
        defaultValue:{
            type: Number
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();

        const errorMessages = "";

        return {
            masStore,
            errorMessages,
        }
    },
    computed: {    },
    watch: { 
    },
    mounted () {

        if (this.masStore.mas.inputs.designRequirements[this.name] != this.fixedNumberElements &&
            this.maximumNumberElements == null &&
            this.fixedNumberElements != null) {
            this.resizeArray(this.fixedNumberElements);
        }


        this.masStore.$onAction((action) => {
            if (action.name == "updatedTurnsRatios") {
                this.resizeArray(this.masStore.mas.inputs.designRequirements.turnsRatios.length);
            }
        })
    },
    methods: {
        resizeArray(newLength) {
            const newElements = [];
            for (var i = 0; i < newLength; i++) {
                if (i < this.masStore.mas.inputs.designRequirements[this.name].length) {
                    newElements.push(this.masStore.mas.inputs.designRequirements[this.name][i]);
                }
                else {
                    const newElement = {};
                    newElement[this.defaultField] = this.defaultValue;
                    newElements.push(newElement);
                }
            }
            this.masStore.mas.inputs.designRequirements[this.name] = newElements;
        },
        addElementBelow(index) {
            const newElement = {};
            newElement[this.defaultField] = this.defaultValue;
            console.log(this.masStore.mas.inputs.designRequirements[this.name]);
            this.masStore.mas.inputs.designRequirements[this.name].splice(index + 1, 0, newElement);
        },
        removeElement(index) {
            this.masStore.mas.inputs.designRequirements[this.name].splice(index, 1)
            console.log(this.masStore.mas.inputs.designRequirements[this.name]);
        },
        changeNumberElements(event) {
            console.log(event.target.value);
            this.resizeArray(event.target.value);
            this.$emit("updatedNumberElements", this.name);
        },
    }
}
</script>


<template>
    <div class="container-flex border-bottom">
        <div class="row">
            <label class="rounded-2 fs-5 ms-3" :class="maximumNumberElements != null? 'col-sm-6 col-sm-6 col-md-3' : 'col-12'">{{toTitleCase(name)}}</label>
            <select v-if="maximumNumberElements != null" class="form-select bg-light text-white m-0 col-sm-4 col-sm-4 col-md-4 mt-1"  @change="changeNumberElements" style="width:auto; max-height: 3em;" :value="masStore.mas.inputs.designRequirements[name].length" >
                <option v-for="index in Number(maximumNumberElements) + 1">
                    {{index - 1}}
                </option>
            </select>
        </div>
        <div class="row" v-for="requirement, requirementIndex in masStore.mas.inputs.designRequirements[name]">
            <DimensionWithTolerance :name="isolationSideOrdered[requirementIndex]" :unit="unit" v-model="masStore.mas.inputs.designRequirements[name][requirementIndex]" class="offset-1 col-11"/>
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


