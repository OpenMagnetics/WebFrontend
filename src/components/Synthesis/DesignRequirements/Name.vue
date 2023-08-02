<script setup>
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import * as Utils from '/src/assets/js/utils.js'
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
        defaultValue:{
            type: String,
            required: true
        }
    },
    data() {
        var localData = "";

        if (this.modelValue[this.name] == null &&
            this.defaultValue != null) {
            localData = this.defaultValue;
        }

        if (this.modelValue[this.name] != null) {
            localData = this.modelValue[this.name];
        }

        return {
            localData
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        changeText(newValue) {
            this.modelValue[this.name] = newValue;
        }
    }
}
</script>


<template>
    <div class="container-flex">
        <div class="row">
            <label :for="name + '-text-input'" class="rounded-2 fs-5 ms-3 col-3">Reference</label>
            <input type="text" class="m-0 px-0 col-8 bg-light text-white" :id="name + '-text-input'" @change="changeText($event.target.value)" :value="localData">
        </div>
    </div>
</template>


