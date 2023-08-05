<script setup>
import { isNumber, toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import DimensionUnit from '/src/components/Synthesis/DesignRequirements/DimensionUnit.vue'
import { tooltipsMagneticSynthesisDesignRequirements } from '/src/assets/js/texts.js'

</script>
<script>
export default {
    props: {
        name:{
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
    },
    data() {
        return {
        }
    },
    computed: {
        selectedLabel() {
        },
        styleTooltip() {
            var relative_placement;
            relative_placement = 'top'
            return {
                theme: {
                    placement: relative_placement,
                    width: '400px',
                    "text-align": "start",
                },
            }
        },
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        changeOption(event) {
            var chosen = null;

            for (let [key, value] of Object.entries(this.options)) {
                if (event.target.value == value) {
                    chosen = value;
                    break;
                }
            }
            this.modelValue[this.name] = chosen;
            this.$emit("updatedNumberElements", event.target.value, this.name);
        },
    }
}
</script>


<template>
    <div v-tooltip="styleTooltip" class="container-flex">
        <div v-tooltip="tooltipsMagneticSynthesisDesignRequirements['changeNameWindings']" class="row">
            <input  v-if="altText != null && !titleSameRow" type="text" class="rounded-2 fs-5 ms-3 bg-dark text-white col-11 p-0 mb-2 border-0" @change="$emit('changeText', $event.target.value)" :value="altText">
            <label v-if="altText == null && !titleSameRow" class="rounded-2 fs-5 ms-3">{{replaceTitle == null? toTitleCase(name) : toTitleCase(replaceTitle)}}</label>
        </div>
        <div class="row">
            <label v-if="titleSameRow" class="rounded-2 fs-5 ms-3 col-7">{{replaceTitle == null? toTitleCase(name) : toTitleCase(replaceTitle)}}</label>
            <div  v-if="!titleSameRow" class=" col-sm-0 col-md-2">
            </div>
            <select class="form-select bg-light text-white m-0 col-9 mt-1"  @change="changeOption" style="width:auto; max-height: 3em;" :value="modelValue[name]" >
                <option v-for="[key, value] in Object.entries(options)">
                    {{value}}
                </option>
            </select>
        </div>
    </div>
</template>


