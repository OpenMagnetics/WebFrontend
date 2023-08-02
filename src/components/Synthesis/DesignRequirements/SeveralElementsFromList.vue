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
        },
    }
}
</script>


<template>
    <div class="container-flex">
        <div class="row">
            <label class="rounded-2 fs-5 ms-3">{{toTitleCase(name)}}</label>
        <div class="row">
        </div>
            <div class="form-check ms-4 col-lg-6 col-xl-2" v-for="[key, value] in Object.entries(options)">
                <input :ref="key" class="form-check-input" type="checkbox" :checked="modelValue[name].includes(value)"  :id="name + '-checkbox-input'" @change="changedCheckedValue(value)">
                <label class="form-check-label" :for="name + '-checkbox-input'">
                    {{value}}
                </label>
            </div>
        </div>
    </div>
</template>


