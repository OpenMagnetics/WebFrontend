<script setup>
import { guessBasicGappingParameters } from '/src/assets/js/utils.js'
import { gapTypes } from '/src/assets/js/defaults.js'
import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import Dimension from '/src/components/DataInput/Dimension.vue'
</script>
<script>
export default {
    props: {
        title:{
            type: String,
            default: '',
        },
        core:{
            type: Object,
            required: true
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        forceUpdate:{
            type: Number,
            default: 0
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        autoupdate: {
            type: Boolean,
            default: true,
        },
        scale: {
            type: Number,
            default: 1000,
        },
    },
    data() {

        var localData = guessBasicGappingParameters(this.core, 1);

        const errorMessages = "";

        return {
            localData,
            errorMessages,
        }
    },
    computed: {
    },
    watch: {
        forceUpdate(newValue, oldValue) {
        },
    },
    mounted () {    
    },
    methods: {
        checkErrors() {
            var hasError = false;
            this.errorMessages = "";
            return hasError;
        },
        update() {
            const hasError = this.checkErrors();
            const gapping = [];
            const residualGap = {
                "length": 0.000005,
                "type": "residual"
            }
            if (this.localData.gapType == 'Ungapped') {
                gapping.push(residualGap);
                gapping.push(residualGap);
                gapping.push(residualGap);
            }
            else if (this.localData.gapType == 'Ground') {
                const coreGap = {
                    "length": this.localData.gapLength,
                    "type": "subtractive"
                }
                gapping.push(coreGap);
                gapping.push(residualGap);
                gapping.push(residualGap);
            }
            else if (this.localData.gapType == 'Spacer') {
                const coreGap = {
                    "length": this.localData.gapLength,
                    "type": "additive"
                }
                gapping.push(coreGap);
                gapping.push(coreGap);
                gapping.push(coreGap);
            }

            else if (this.localData.gapType == 'Distributed') {
                const coreGap = {
                    "length": this.localData.gapLength,
                    "type": "subtractive"
                }
                for (var i = this.localData.numberGaps - 1; i >= 0; i--) {
                    gapping.push(coreGap);
                }
                gapping.push(residualGap);
                gapping.push(residualGap);
            }

            if (this.autoupdate) {
                this.core['functionalDescription']['gapping'] = gapping;
            }

            if (!hasError) {
                this.$emit("update", gapping);
            }
        },
        gapTypeUpdated() {
        },
        gapLengthUpdated() {
        },
        numberGapsUpdated() {
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex" ref="container">
        <div class="row">
            <label :data-cy="dataTestLabel + '-title'" class="rounded-2 fs-5 col-12">{{title}}</label>
            <div class="offset-1 col-11">
                <ElementFromList
                    class="col-12 text-start"
                    :dataTestLabel="dataTestLabel + '-GapType'"
                    :name="'gapType'"
                    :replaceTitle="'Type'"
                    :disabled="disabled"
                    :justifyContent="true"
                    :titleSameRow="true"
                    v-model="localData"
                    :options="gapTypes"
                    @update="update"
                />

                <Dimension class="col-12 text-start"
                    v-if="localData.gapType != 'Ungapped'"
                    :name="'gapLength'"
                    :replaceTitle="'Length'"
                    :min="1e-6"
                    :max="0.1"
                    :disabled="disabled"
                    :justifyContent="true"
                    :unit="'m'"
                    :dataTestLabel="dataTestLabel + '-GapLength'"
                    :allowNegative="false"
                    :modelValue="localData"
                    @update="update"
                />

                <Dimension class="col-12 text-start"
                    :name="'numberGaps'"
                    v-if="localData.gapType == 'Distributed'"
                    :unit="null"
                    :disabled="disabled"
                    :justifyContent="true"
                    :min="1"
                    :max="100"
                    :dataTestLabel="dataTestLabel + '-NumberGaps'"
                    :allowNegative="false"
                    :modelValue="localData"
                    @update="update"
                />
            </div>
        </div>
    </div>
</template>


