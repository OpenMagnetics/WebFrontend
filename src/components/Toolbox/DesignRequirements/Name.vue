<script setup>
import { toTitleCase, getMultiplier, combinedStyle, combinedClass } from '/WebSharedComponents/assets/js/utils.js'
import * as Utils from '/WebSharedComponents/assets/js/utils.js'
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
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        valueFontSize: {
            type: [String, Object],
            default: 'fs-6'
        },
        labelFontSize: {
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
        var localData = "";

        if (this.modelValue[this.name] == null &&
            this.defaultValue != null) {
            localData = this.defaultValue;
        }

        if (this.modelValue[this.name] != null) {
            localData = this.modelValue[this.name];
        }

        const errorMessages = ''

        return {
            localData,
            errorMessages
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
            if (newValue == '') {
                this.errorMessages = "Reference cannot be empty. Please write a name."
                this.$emit("hasError")
            }
            else {
                this.errorMessages = ""
                this.modelValue[this.name] = newValue;
            }
        }
    }
}
</script>

<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex">
        <div class="row">
            <label
                :style="combinedStyle([labelFontSize, labelBgColor, textColor])"
                :data-cy="dataTestLabel + '-title'"
                :for="name + '-text-input'"
                :class="combinedClass([labelFontSize, labelBgColor, textColor])"
                class="rounded-2 fs-5 ms-3 col-3"
            >
                Reference
            </label>
            <input
                :style="combinedStyle([labelFontSize, labelBgColor, textColor])"
                :data-cy="dataTestLabel + '-text-input'"
                type="text"
                class="m-0 px-0 col-8"
                :id="name + '-text-input'"
                :class="combinedClass([valueFontSize, valueBgColor, textColor])"
                @change="changeText($event.target.value)"
                :value="localData"
            >
            <label
                class="text-danger text-center col-12 pt-1"
                style="font-size: 0.9em; white-space: pre-wrap;"
            >
                {{errorMessages}}
            </label>
        </div>
    </div>
</template>


