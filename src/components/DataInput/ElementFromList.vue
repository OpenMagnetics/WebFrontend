<script setup>
import { isNumber, toTitleCase, getMultiplier, isString } from '/src/assets/js/utils.js'
import DimensionUnit from '/src/components/DataInput/DimensionUnit.vue'
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
        dataTestLabel: {
            type: String,
            default: '',
        },
        optionsToDisable: {
            type: Array,
            default: [],
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
        computedOptions() {
            if (this.options.constructor.name === "Array") {
                return this.options;
            }
            else {
                const computedOptions = []
                for (let [key, value] of Object.entries(this.options)) {
                    computedOptions.push(value)
                }
                return computedOptions;
            }
                
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
            this.$emit("update", event.target.value, this.name);
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" v-tooltip="styleTooltip" class="container-flex">
        <div v-tooltip="tooltipsMagneticSynthesisDesignRequirements['changeNameWindings']" class="row">
            <input :data-cy="dataTestLabel + '-alt-title-label'" v-if="altText != null && !titleSameRow" type="text" class="rounded-2 fs-5 ms-3 bg-dark text-white col-11 p-0 mb-2 border-0" @change="$emit('changeText', $event.target.value)" :value="altText">
            <label :data-cy="dataTestLabel + '-title'" v-if="altText == null && !titleSameRow" class="rounded-2 fs-5 ms-3">{{replaceTitle == null? toTitleCase(name) : toTitleCase(replaceTitle)}}</label>
        </div>
        <div class="row" :class="justifyContent? 'd-flex justify-content-between' : ''">
            <label :data-cy="dataTestLabel + '-same-row-label'" v-if="titleSameRow" class="rounded-2 fs-5 col-4">{{replaceTitle == null? toTitleCase(name) : toTitleCase(replaceTitle)}}</label>
            <div  v-if="!titleSameRow" class=" col-sm-0 col-md-2">
            </div>
            <select :disabled="disabled" :data-cy="dataTestLabel + '-select'"  class="form-select bg-light text-white m-0 col-8 mt-1"  @change="changeOption" style="width:auto; max-height: 3em;" :value="modelValue[name]" >
                <option :disabled="optionsToDisable.includes(value)" v-for="value in computedOptions">
                    {{value}}
                </option>
            </select>
        </div>
    </div>
</template>