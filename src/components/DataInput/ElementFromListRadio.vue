<script setup>
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'

</script>
<script>
export default {
    props: {
        name:{
            type: String,
            required: true
        },
        modelValue:{
            type: Object,
            required: true
        },
        options:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        replaceTitle:{
            type: String
        },
        titleSameRow:{
            type: Boolean,
            default: false
        },
        altText:{
            type: String
        },
        optionsToDisable: {
            type: Array,
            default: [],
        },
    },
    data() {
        return {
        }
    },
    computed: {
        selectedLabel() {
        }
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        changedCheckedValue(checkedValue) {
            this.modelValue[this.name] = checkedValue;
            this.$emit("update", checkedValue, this.name);
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex">
        <div class="row">
            <input :data-cy="dataTestLabel + '-alt-title-label'" v-if="altText != null && !titleSameRow" type="text" class="rounded-2 fs-5 ms-3 bg-dark text-white col-11 p-0 mb-2 border-0" @change="$emit('changeText', $event.target.value)" :value="altText">
            <label :data-cy="dataTestLabel + '-title'" v-if="altText == null && !titleSameRow" class="rounded-2 fs-5 ms-3">{{replaceTitle == null? toTitleCase(name) : toTitleCase(replaceTitle)}}</label>
        </div>
        <div class="row">
            <label :data-cy="dataTestLabel + '-same-row-label'" v-if="titleSameRow" class="rounded-2 fs-5 col-4">{{replaceTitle == null? toTitleCase(name) : toTitleCase(replaceTitle)}}</label>
            <div  v-if="!titleSameRow" class=" col-sm-0 col-md-2">
            </div>
            <div class="form-check ms-4 col-lg-6 col-xl-2" v-for="[key, value] in Object.entries(options)">
                <input  :disabled="optionsToDisable.includes(value)"  :data-cy="dataTestLabel + '-' + value + '-radio-input'" :ref="key" class="form-check-input" type="radio" :checked="modelValue[name].includes(value)"  :id="name + '-radio-input'" @change="changedCheckedValue(value)">
                <label class="form-check-label" :for="name + '-radio-input'">
                    {{value}}
                </label>
            </div>
        </div>
    </div>
</template>

