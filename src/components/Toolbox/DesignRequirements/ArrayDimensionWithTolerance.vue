<script setup>
import { useMasStore } from '/src/stores/mas'
import { toTitleCase, getMultiplier, combinedStyle, combinedClass } from '/WebSharedComponents/assets/js/utils.js'
import DimensionWithTolerance from '/WebSharedComponents/DataInput/DimensionWithTolerance.vue'
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
        defaultField:{
            type: String,
            default: "nominal"
        },
        defaultValue:{
            type: Object
        },
        dataTestLabel: {
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
        disabledScaling: {
            type: Boolean,
            default: false
        },
        allowNegative:{
            type: Boolean,
            default: false
        },
        allowAllNull:{
            type: Boolean,
            default: false
        },
        addButtonStyle: {
            type: Object,
            default: {},
        },
        valueFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        titleFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        removeButtonBgColor: {
            type: String,
            default: "bg-danger",
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
        unitExtraStyleClass:{
            type: String,
            default: ''
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
                    newElement[this.defaultField] = this.defaultValue[this.defaultField];
                    newElements.push(newElement);
                }
            }
            this.masStore.mas.inputs.designRequirements[this.name] = newElements;
        },
        addElementBelow(index) {
            const newElement = {};
            newElement[this.defaultField] = this.defaultValue[this.defaultField];
            this.masStore.mas.inputs.designRequirements[this.name].splice(index + 1, 0, newElement);
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
            <label
                :style="combinedStyle([titleFontSize, labelBgColor, textColor])"
                :data-cy="dataTestLabel + '-title'"
                class="rounded-2 ms-3"
                :class="combinedClass([maximumNumberElements != null? 'col-sm-6 col-md-3' : 'col-12', titleFontSize, labelBgColor, textColor])"
            >
                {{toTitleCase(name)}}
            </label>
        </div>
        <div :data-cy="dataTestLabel + '-' + requirementIndex + '-container'" class="row" v-for="requirement, requirementIndex in masStore.mas.inputs.designRequirements[name]">
            <DimensionWithTolerance
                :dataTestLabel="dataTestLabel + '-' + requirementIndex" 
                :allowNegative="allowNegative"
                :allowAllNull="allowAllNull"
                :min="min"
                :max="max"
                :disabledScaling="disabledScaling"
                :varText="true"
                :defaultValue="defaultValue"
                :name="masStore.mas.magnetic.coil.functionalDescription[requirementIndex + 1] == null? isolationSideOrdered[requirementIndex + 1] : masStore.mas.magnetic.coil.functionalDescription[requirementIndex + 1].name"
                :unit="unit"
                v-model="masStore.mas.inputs.designRequirements[name][requirementIndex]"
                @hasError="$emit('hasError')"
                @changeText="changeText($event, requirementIndex + 1)"
                :addButtonStyle="addButtonStyle"
                :removeButtonBgColor="removeButtonBgColor"
                :titleFontSize='valueFontSize'
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                class="offset-1 col-11"
            />            
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


