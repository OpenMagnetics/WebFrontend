<script setup>
import { removeTrailingZeroes, getMultiplier } from '/WebSharedComponents/assets/js/utils.js'
import { useMasStore } from '/src/stores/mas'

import { defaultTimeExponent } from '/WebSharedComponents/assets/js/defaults.js'

</script>

<script>

export default {
    props: {
        modelValue:{
            type: Object,
            required: true
        },
        name: {
            type: Number,
            required: true,
        },
        signalDescriptor: {
            type: String,
            required: false,
            default: "current",
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        const localData = {
            data: {
                value: null
            },
            time: {
                multiplier: null,
                scaledValue: null
            }
        };

        const aux = getMultiplier(this.modelValue.time[this.name], 0.001);
        localData.time.scaledValue = removeTrailingZeroes(aux.scaledValue);
        localData.time.multiplier = aux.multiplier;
        localData.data.value = removeTrailingZeroes(this.modelValue.data[this.name], 3);
        const errorMessages = '';

        return {
            localData,
            masStore,
            errorMessages,
        }
    },
    computed: {
        getExponentLabel() {
            if (Math.log10(this.localData.time.multiplier) == 0)
                return '';
            else
                return 'e' + (Math.log10(this.localData.time.multiplier));
        },
    },
    watch: { 
        modelValue(newValue, oldValue) {
            var actualValue = this.modelValue.time[this.name];
            const aux = getMultiplier(actualValue, 0.001);
            this.localData.time.scaledValue = removeTrailingZeroes(aux.scaledValue);
            this.localData.time.multiplier = aux.multiplier;
            this.localData.data.value = removeTrailingZeroes(this.modelValue.data[this.name], 3);
        },
    },
    mounted () {
        this.masStore.$onAction((action) => {
            if (action.name == "updatedInputExcitationWaveformUpdatedFromProcessed") {
                var actualValue = this.modelValue.time[this.name];
                const aux = getMultiplier(actualValue, 0.001);
                this.localData.time.scaledValue = removeTrailingZeroes(aux.scaledValue);
                this.localData.time.multiplier = aux.multiplier;
                this.localData.data.value = removeTrailingZeroes(this.modelValue.data[this.name], 3);
            }
        })
    },
    methods: {
        onTimeChange(event) {
            var actualValue = event.target.value * this.localData.time.multiplier;

            actualValue = Math.max(actualValue, this.modelValue.time[this.name - 1]);
            actualValue = Math.min(actualValue, this.modelValue.time[this.name + 1]);

            const aux = getMultiplier(actualValue, 0.001);
            this.localData.time.scaledValue = removeTrailingZeroes(aux.scaledValue);
            this.localData.time.multiplier = aux.multiplier;

            this.modelValue.time[this.name] = actualValue;

            this.$emit("updatedTime");
        },
        onValueChange(event) {
            if (this.localData.data.value != '' && this.localData.data.value != undefined) {
                this.errorMessages = '';
                this.modelValue.data[this.name] = this.localData.data.value;
                this.$emit("updatedData");
            }
            else {
                this.errorMessages = 'Data field cannot be empty';
            }
        },
        onAddPointBelow(event) {

            const newItemTime = (this.modelValue.time[this.name] + this.modelValue.time[this.name + 1]) / 2;
            const newItemData = (this.modelValue.data[this.name] + this.modelValue.data[this.name + 1]) / 2;
            this.modelValue.time.splice(this.name + 1, 0, newItemTime);
            this.modelValue.data.splice(this.name + 1, 0, newItemData);
            this.$emit("addedOrRemovedPoint");
        },
        onRemovePoint(event) {
            this.modelValue.time.splice(this.name, 1);
            this.modelValue.data.splice(this.name, 1);
            this.$emit("addedOrRemovedPoint");
        },

    }
}
</script>

<template>
    <div class="container-flex text-white">
        <div class="row">
            <label class="fs-5 col-md-1 col-2 m-0 p-0 ps-2 pt-1">x: </label>
            <input :data-cy="dataTestLabel + '-time-input'" type="number" :disabled="name == 0 || name == (modelValue.data.length - 1)"  v-model="localData.time.scaledValue" @change="onTimeChange" class="rounded-2 bg-light text-white col-md-3 col-6  p-0 ps-1 my-1"/>
            <input class="fs-6 bg-light text-white bg-dark border-0 col-md-1 col-2  m-0 p-0 ps-1  pt-1" style="width: 30px;" :value="getExponentLabel" disabled/>
            <label class="fs-5 col-md-1 col-2  m-0 p-0  pt-1" style="width: 10px;">{{'s'}}</label>

            <label class="fs-5 col-md-1 col-2 p-0 ps-2 pt-1">y: </label>
            <input :data-cy="dataTestLabel + '-value-input'" type="number" v-model=" localData.data.value" @change="onValueChange" class=" rounded-2 bg-light text-white col-md-3 col-6  p-0 ps-1  my-1"/>
            <label class="fs-5 col-md-1 col-2  p-0 ps-1 pt-1" style="width: 10px;">{{signalDescriptor == "current"? 'A' : 'V'}}</label>
            <div class="col-md-2 col-12 p-0 m-0 ps-2 container-flex" style="height: 40px;">
                <div class="row m-0 p-0  pt-2" style="height: 40px;">
                    <button :data-cy="dataTestLabel + '-add-point-below-button'" v-if="name != (modelValue.data.length - 1)" type="button" class="btn btn-default btn-circle fa-1x bg-dark mb-1 me-2 me-md-1 col-6" @click="onAddPointBelow">
                        <i class="fa-solid fa-circle-plus text-secondary" > </i>
                    </button>
                    <button :data-cy="dataTestLabel + '-remove-point-button'" v-if="name != 0 && name != (modelValue.data.length - 1)" type="button" class="btn btn-default fa-1x btn-circle bg-dark mb-1 ms-2 ms-md-0 col-6" @click="onRemovePoint">
                        <i class="fa-solid fa-circle-minus text-danger"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="row">
            <label :data-cy="dataTestLabel + '-error-text'" class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


<style type="text/css">
    
.btn-circle {
    width: 1.2vw;
    height: 1.2vw;
    padding: 0px 0px;
    border-radius: 12.5px;
    text-align: center;
    font-size: 1.2vw;
    line-height: 0
}

</style>
