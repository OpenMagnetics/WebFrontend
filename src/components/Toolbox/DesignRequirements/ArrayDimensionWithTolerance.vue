<script setup>
import { useMasStore } from '../../../stores/mas'
import { toTitleCase, getMultiplier, combinedStyle, combinedClass, renameWinding } from 'WebSharedComponents/assets/js/utils.js'
import DimensionWithTolerance from 'WebSharedComponents/DataInput/DimensionWithTolerance.vue'
import { isolationSideOrdered } from 'WebSharedComponents/assets/js/defaults.js'
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
        referenceWinding:{
            type: Boolean,
            default: false
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
            default: () => ({}),
        },
        valueFontSize: {
            type: [String, Object],
            default: ''
        },
        titleFontSize: {
            type: [String, Object],
            default: ''
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
            referenceRatio: { nominal: 1 },
        }
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
                renameWinding(this.masStore.mas, index, value);
            }
            else {
                this.errorMessages = "Winding name cannot be empty";
            }
        },
    }
}
</script>


<template>
    <div class="container-flex border-bottom-1 border-solid border-300">
        <div class="grid">
            <label
                :style="combinedStyle([titleFontSize, labelBgColor, textColor])"
                :data-cy="dataTestLabel + '-title'"
                class="rounded-2 ml-3"
                :class="combinedClass([maximumNumberElements != null? 'col-6 md:col-3' : 'col-12', titleFontSize, labelBgColor, textColor])"
            >
                {{toTitleCase(name)}}
            </label>
        </div>
        <!-- Winding 1 is the reference winding: ratio fixed at 1 (locked), label editable.
             Uses the same DimensionWithTolerance as the rows below so the row is identical. -->
        <div v-if="referenceWinding" :data-cy="dataTestLabel + '-reference-container'" class="grid">
            <DimensionWithTolerance
                :dataTestLabel="dataTestLabel + '-reference'"
                :allowAllNull="true"
                :disabled="true"
                :disabledScaling="disabledScaling"
                :varText="true"
                :name="masStore.mas.magnetic.coil.functionalDescription[0]?.name ?? 'Winding 1'"
                :unit="unit"
                :modelValue="referenceRatio"
                @changeText="changeText($event, 0)"
                :addButtonStyle="addButtonStyle"
                :removeButtonBgColor="removeButtonBgColor"
                :titleFontSize="valueFontSize"
                :valueFontSize="valueFontSize"
                :labelBgColor="labelBgColor"
                :valueBgColor="valueBgColor"
                :textColor="textColor"
                :unitExtraStyleClass="unitExtraStyleClass"
                class="col-12 array-dwt-row reference-dwt"
            />
        </div>
        <div :data-cy="dataTestLabel + '-' + requirementIndex + '-container'" class="grid" v-for="(requirement, requirementIndex) in masStore.mas.inputs.designRequirements[name]" :key="requirementIndex">
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
                class="col-12 array-dwt-row"
            />            
        </div>
        <div class="grid">
            <label class="text-red-500 text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


<style scoped>
/* Winding 1 reference row: reuse the shared row layout, but lock the ratio
   value + add/remove controls. The label (title) stays editable. */
.reference-dwt :deep(.dwt-fields-row) {
    pointer-events: none;
}
/* The reference ratio is exactly 1 (no tolerance) - show only the locked
   nominal value, not the Min/Max add-fields or the removable 'Nom.' addon. */
.reference-dwt :deep(.dwt-fields-row > .dwt-field:not(:nth-child(2))) {
    display: none;
}
.reference-dwt :deep(.dwt-remove-addon) {
    display: none !important;
}
</style>


