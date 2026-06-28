<script setup>
import { useMasStore } from '../../../stores/mas'
import { toTitleCase, getMultiplier, combinedStyle, combinedClass } from 'WebSharedComponents/assets/js/utils.js'
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
        <!-- Winding 1 is the reference winding: its turns ratio is fixed at 1 and
             not editable; only its label (name) can be changed. -->
        <div v-if="referenceWinding" :data-cy="dataTestLabel + '-reference-container'" class="grid">
            <div class="col-12 reference-winding-row">
                <input
                    :data-cy="dataTestLabel + '-reference-title'"
                    class="reference-winding-title"
                    type="text"
                    :value="masStore.mas.magnetic.coil.functionalDescription[0]?.name ?? 'Winding 1'"
                    @change="changeText($event.target.value, 0)" />
                <span class="reference-winding-ratio" title="Reference winding - turns ratio is always 1">1</span>
            </div>
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
.reference-winding-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.35rem 0;
}
.reference-winding-title {
    flex: 1 1 auto;
    min-width: 0;
    background: transparent;
    border: 0;
    border-bottom: 1px solid rgba(var(--p-white-rgb), 0.15);
    color: inherit;
    font-size: 0.95rem;
    font-weight: 600;
    text-align: center;
}
.reference-winding-ratio {
    flex: 0 0 auto;
    min-width: 3rem;
    text-align: center;
    padding: 0.25rem 0.75rem;
    border: 1px solid rgba(var(--p-white-rgb), 0.15);
    border-radius: 6px;
    opacity: 0.6;
    cursor: not-allowed;
    font-variant-numeric: tabular-nums;
}
</style>
