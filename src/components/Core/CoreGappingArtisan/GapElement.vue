<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { Form, Field } from 'vee-validate';
import VueNumberInput from '/src/components/VueNumberInput.vue';
import * as Yup from 'yup';
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
import { useCoreStore } from '/src/stores/core'
</script>
<script>
const schema = Yup.object().shape({
    gapLength: Yup.number(),
    gapHeight: Yup.number(),
});

export default {
    props: {
        columnIndex: {
            type: Number,
            required: true
        },
        gapIndex: {
            type: Number,
            required: true
        },
        globalGapIndex: {
            type: Number,
            required: true
        },
        gapLength: {
            type: Number,
            required: true
        },
        gapHeight: {
            type: Number,
            required: true
        },
        heightEnabled: {
            type: Boolean,
            required: false,
            default: true
        },
        lengthEnabled: {
            type: Boolean,
            required: false,
            default: true
        },
    },
    data() {
        const coreStore = useCoreStore();
        const gapLengthSelected = this.$userStore.globalCore['functionalDescription']['gapping'][this.globalGapIndex]['length'] * 1000
        const gapHeightSelected = this.$userStore.globalCore['functionalDescription']['gapping'][this.globalGapIndex]['coordinates'][1] * 1000
        return {
            coreStore,
            gapLengthSelected,
            gapHeightSelected,
        }
    },
    watch: { 
        gapLength: function(newVal, oldVal) {
            this.gapLengthSelected = this.gapLength * 1000
        },
        gapHeight: function(newVal, oldVal) {
            this.gapHeightSelected = this.gapHeight * 1000
        },
        heightEnabled: function(newVal, oldVal) {
        },
        lengthEnabled: function(newVal, oldVal) {
        },
    },
    computed: {
        fringingColor() {
            if (Number(this.$slots.fringingFactor()[0].children.split(" ")[0]) > 20) {
                return "text-danger"
            }
            else {
                return "text-white"
            }
        },
        styleTooltip() {
            var relative_placement;
            if (this.columnIndex == 0) {
                relative_placement = 'top'
            }
            else if (this.columnIndex == 1) {
                relative_placement = 'left'
            }
            else if (this.columnIndex == 2) {
                relative_placement = 'right'
            }
            return {
                    theme: {
                        placement: relative_placement,
                        width: '200px',
                        "text-align": "center",
                    },
                }
        },
    },
    mounted () {
        this.gapLengthSelected = this.gapLength * 1000
        this.gapHeightSelected = this.gapHeight * 1000

        this.coreStore.$onAction((action) => {
            if (action.name == "updateAllLengths") {
                this.gapLengthSelected = action.args[0] * 1000
            }
        })

    },
    methods: {
        validate(value, field) {
            if (this.$refs.formRef != undefined) {
                const label = field == "gapLength"? "Gap length" : "Gap height"
                if (value == 0 && field == "gapLength") {
                    this.$refs.formRef.setFieldError(field, label + " must greater than 0. Do you mean to use Residual type?")
                    return false
                }
                else if (isNaN(value)) {
                    this.$refs.formRef.setFieldError(field, label + " cannot be empty. Do you mean to use Residual type?")
                    return false
                }
                else {
                    this.$refs.formRef.setFieldError(field, "")
                    return true
                }
            }
        },
        handleSubmit() {
            this.validate(this.gapLengthSelected, "gapLength")
            this.validate(this.gapHeightSelected, "gapHeight")
        },
        onLengthUpdate(name, newValue, oldValue) {
            if (newValue != oldValue) {
                this.gapLengthSelected = newValue
                if (this.validate(newValue, "gapLength")) {
                    this.$emit("onGapLengthChange", newValue / 1000, this.gapIndex)
                }

                const gapping = this.$userStore.globalCore['functionalDescription']['gapping']
            }
        },
        onHeightUpdate(name, newValue, oldValue) {
            this.gapHeightSelected = Number(Utils.removeTrailingZeroes(Utils.roundWithDecimals(newValue, 0.00001), 5))
            if (this.validate(newValue, "gapHeight")) {
                this.$emit("onGapHeightChange", newValue / 1000, this.gapIndex)
            }
        },


    }
}
</script>

<template>
    <div v-tooltip="styleTooltip" class="card bg-transparent border-primary p-0">
        <div class="card-body">
            <div class="container px-0">
                <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline row text-white" @submit="handleSubmit($event, onSubmit)">
                    <label v-tooltip="lengthEnabled? 'Length of the gap, in mm' : 'Residual length cannot be changed'" class="small-text col-4 text-start">Length:</label>
                    <vue-number-input controls class=" col-6"  :class="{ 'is-invalid': errors.gapLength }" 
                        :modelValue="gapLengthSelected"
                        @update:model-value="onLengthUpdate"
                        :size="'small'"
                        :name="'gapLength'"
                        :center="true"
                        :readonly="!lengthEnabled"
                        :min="0"
                        :step="0.01"
                        :max="1000">
                        </vue-number-input>
                    <label class="small-text col-2 text-end p-0">mm</label>

                    <label v-if="heightEnabled" v-tooltip="'Vertical position of gap, with origin in the center of the column, in mm'" class="small-text col-4 text-start mt-1">Height:</label>
                    <vue-number-input  v-if="heightEnabled" controls class=" col-6 mt-1"  :class="{ 'is-invalid': errors.gapHeight }" 
                        :modelValue="gapHeightSelected"
                        @update:model-value="onHeightUpdate"
                        :size="'small'"
                        :name="'gapHeight'"
                        :center="true"
                        :min="-1000"
                        :step="0.1"
                        :max="1000">
                        </vue-number-input>
                    <label v-if="heightEnabled" class="small-text col-2 text-end p-0  mt-1">mm</label>


                    <div class="card-footer border-primary p-0 mt-2 ">

                        <div class="accordion bg-transparent" :id="'gapOutputAccordion' + columnIndex + gapIndex">
                            <div class="accordion-item border-0 bg-transparent">
                                <h2 class="accordion-header bg-transparent" :id="'headingGapOutput' + columnIndex + gapIndex">
                                    <button class="fs-6 p-1 accordion-button bg-transparent text-primary border-primary collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="'#collapseGapOutput' + columnIndex + gapIndex" aria-expanded="true" :aria-controls="'collapseGapOutput' + columnIndex + gapIndex">
                                        Advanced Details
                                    </button>
                                </h2>
                                <div :id="'collapseGapOutput' + columnIndex + gapIndex" class="accordion-collapse bg-transparent text-white collapse " :aria-labelledby="'headingGapOutput' + columnIndex + gapIndex" :data-bs-parent="'#gapOutputAccordion' + columnIndex + gapIndex">
                                    <div class="accordion-body p-1">

                                        <label v-tooltip="'Magnetic reluctance of the gap, including fringing effect, calculated using TBD model'" class="small-text col-6 text-start">Reluctance:</label>
                                        <label class="small-text bg-transparent text-white text-end float-end col-6"><slot name="reluctance"></slot></label>
                                        <!-- <label class="small-text bg-transparent text-white text-end float-end col-6">{{4232 + " H⁻¹"}}</label> -->

                                        <label v-tooltip="'Energy that can be stored in this gap'" class="small-text col-7 text-start">Max. energy:</label>
                                        <label class="small-text bg-transparent text-white text-end float-end col-5"><slot name="maximumEnergy"></slot></label>

                                        <label v-tooltip="'How much the fringing effect increases the volume of the gap, calculated using TBD model. More than 20% is not recommended'" class="small-text col-8 text-start">Fringing factor:</label>
                                        <label :class="fringingColor" class="small-text bg-transparent text-end float-end col-4"><slot name="fringingFactor"></slot></label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="invalid-feedback m-0">{{errors.gapLength}}</div>
                    <div class="invalid-feedback m-0">{{errors.gapHeight}}</div>
                    <div v-if="$slots.overlappingError != ''" class="text-danger m-0" style="font-size: 0.9em"><slot name="overlappingError"></slot></div>

                </Form>
            </div>
        </div>
    </div>
</template>
