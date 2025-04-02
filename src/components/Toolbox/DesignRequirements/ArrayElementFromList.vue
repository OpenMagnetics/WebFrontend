<script setup>
import { useMasStore } from '../../../stores/mas'
import { toTitleCase, getMultiplier, combinedStyle, combinedClass } from '/WebSharedComponents/assets/js/utils.js'
import ElementFromList from '/WebSharedComponents/DataInput/ElementFromList.vue'
import { isolationSideOrdered } from '/WebSharedComponents/assets/js/defaults.js'
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
            type: Array,
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
        titleSameRow:{
            type: Boolean,
            default: false
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        valueFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        titleFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        labelBgColor: {
            type: [String, Object],
            default: "bg-dark",
        },
        valueBgColor: {
            type: [String, Object],
            default: "bg-light",
        },
        textColor: {
            type: [String, Object],
            default: "text-white",
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
                    newElements.push(this.defaultValue[i]);
                }
            }
            this.masStore.mas.inputs.designRequirements[this.name] = newElements;
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
        update(value, index) {
            this.$emit("update", value, index);
        },
    }
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex border-bottom">
        <div class="row">
            <label
                :style="combinedStyle([titleFontSize, labelBgColor, textColor])"
                :data-cy="dataTestLabel + '-title'"
                class="rounded-2 fs-5 ms-3"
                :class="combinedClass([maximumNumberElements != null? 'col-sm-6 col-md-3' : 'col-12', titleFontSize, labelBgColor, textColor])"
            >
                {{toTitleCase(name)}}
            </label>
        </div>
        <div class="row ms-5">
            <ElementFromList
                :data-cy="dataTestLabel + '-' + (requirementIndex) + '-container'"
                :dataTestLabel="dataTestLabel + '-' + (requirementIndex - 1)"
                :min="min"
                :max="max"
                :titleSameRow="titleSameRow"
                v-for="requirementIndex in masStore.mas.inputs.designRequirements[name].length"
                :defaultValue="defaultValue[requirementIndex - 1]"
                class="py-2 col-12"
                :name="requirementIndex - 1"
                v-model="masStore.mas.inputs.designRequirements[name]"
                :options="options"
                :replaceTitle="isolationSideOrdered[requirementIndex - 1]"
                :labelFontSize='valueFontSize'
                :valueFontSize='valueFontSize'
                :labelBgColor='labelBgColor'
                :valueBgColor='valueBgColor'
                :textColor='textColor'
                @changeText="changeText($event, requirementIndex)"
                @update="update($event, requirementIndex - 1)"
            />
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


