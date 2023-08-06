<script setup>
import { useMasStore } from '/src/stores/mas'
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import ElementFromList from '/src/components/Synthesis/DesignRequirements/ElementFromList.vue'
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
        options:{
            type: Object,
            required: true
        },
        defaultValue: {
            type: String,
            default: '',
        },
        min:{
            type: Number,
            default: 1e-12
        },
        max:{
            type: Number,
            default: 1e+9
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
                this.resizeArray(this.masStore.mas.inputs.designRequirements.turnsRatios.length + 1);
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
                    newElements.push(this.defaultValue);
                }
            }
            this.masStore.mas.inputs.designRequirements[this.name] = newElements;
        },
        addElementBelow(index) {
            this.masStore.mas.inputs.designRequirements[this.name].splice(index + 1, 0, this.defaultValue);
        },
        removeElement(index) {
            this.masStore.mas.inputs.designRequirements[this.name].splice(index, 1)
        },
        changeText(value, index) {
            if (value != '') {
                this.errorMessages = '';
                this.masStore.mas.magnetic.coil.functionalDescription[index].name = value;
            }
            else {
                this.errorMessages = "Winding name cannot be empty";
            }
        },
    }
}
</script>


<template>
    <div class="container-flex border-bottom">
        <div class="row">
            <label class="rounded-2 fs-5 ms-3" :class="maximumNumberElements != null? 'col-sm-6 col-md-3' : 'col-12'">{{toTitleCase(name)}}</label>
        </div>
        <div class="row">
            <ElementFromList :min="min" :max="max" v-for="requirementIndex in masStore.mas.inputs.designRequirements[name].length" :altText="masStore.mas.magnetic.coil.functionalDescription[requirementIndex - 1].name" :defaultValue="defaultValue" class="py-2 col-3" :name="requirementIndex - 1" v-model="masStore.mas.inputs.designRequirements[name]" :options="options" :replaceTitle="isolationSideOrdered[requirementIndex - 1]" @changeText="changeText($event, requirementIndex - 1)" />
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


