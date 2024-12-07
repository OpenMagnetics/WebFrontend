<script setup>
import { toTitleCase, getMultiplier } from '/src/assets/js/utils.js'

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
        optionsToDisable: {
            type: Array,
            default: [],
        },
        classInput: {
            type: String,
            default: 'col-lg-6 col-xl-2',
        },
        justifyContent: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
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
            var found = false;
            var newList = [];
            for (let [key, value] of Object.entries(this.modelValue[this.name])) {
                if (value == checkedValue) {
                    found = true;
                }
                else {
                    newList.push(value);
                }
        
            }
            if (!found) {
                this.modelValue[this.name].push(checkedValue);
            }
            else {
                this.modelValue[this.name] = newList;
            }
            this.$emit("update", checkedValue, this.name);
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex ">
        <div class="row">
            <label :data-cy="dataTestLabel + '-title'" class="rounded-2 fs-5 " :class="justifyContent? 'text-start ms-0' : 'ms-3'">{{toTitleCase(name)}}</label>
        <div class="row">
        </div>
            <div :class="classInput" class="form-check ms-4 " v-for="[key, value] in Object.entries(options)">
                <input :disabled="optionsToDisable.includes(value) || disabled" :data-cy="dataTestLabel + '-' + value + '-checkbox-input'" :ref="key" class="form-check-input" type="checkbox" :checked="modelValue[name].includes(value)"  :id="name + '-checkbox-input'" @change="changedCheckedValue(value)">
                <label class="form-check-label" :for="name + '-checkbox-input'">
                    {{value}}
                </label>
            </div>
        </div>
    </div>
</template>


