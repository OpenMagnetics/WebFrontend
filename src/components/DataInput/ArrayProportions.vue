<script setup>
import { toTitleCase, getMultiplier } from '/src/assets/js/utils.js'
import Dimension from '/src/components/DataInput/Dimension.vue'
import { isolationSideOrdered } from '/src/assets/js/defaults.js'
</script>

<script>
export default {
    props: {
        name:{
            type: String,
            required: true
        },
        replaceTitle:{
            type: String,
            default: null
        },
        suffix:{
            type: String,
            default: ""
        },
        modelValue:{
            type: Array,
            required: true
        },
        unit:{
            type: String,
            required: false
        },
        maximumNumberElements:{
            type: Number
        },
        fixedNumberElements:{
            type: Number
        },
        defaultField:{
            type: String,
            default: "nominal"
        },
        defaultValue:{
            type: Object
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        min:{
            type: Number,
            default: 1
        },
        max:{
            type: Number,
            default: 100
        },
        allowNegative:{
            type: Boolean,
            default: false
        },
    },
    data() {
        const errorMessages = "";
        const localData = {};
        const forceUpdate = 1;

        this.modelValue.forEach((elem, index) => {
            localData[String(index)] = elem * 100;
        })

        return {
            errorMessages,
            localData,
            forceUpdate,
        }
    },
    computed: {    },
    watch: { 
        'modelValue': {
            handler(newValue, oldValue) {
                this.modelValue.forEach((elem, index) => {
                    this.localData[String(index)] = elem * 100;
                })
                this.update(newValue[0], 0, true);
            },
            deep: true
        },
    },
    mounted () {
        if (this.modelValue != this.fixedNumberElements &&
            this.maximumNumberElements == null &&
            this.fixedNumberElements != null) {
            this.resizeArray(this.fixedNumberElements);
        }
    },
    methods: {
        resizeArray(newLength) {
            const newElements = [];
            for (var i = 0; i < newLength; i++) {
                if (i < this.modelValue.length) {
                    newElements.push(this.modelValue[i]);
                }
                else {
                    const newElement = {};
                    newElement[this.defaultField] = this.defaultValue[this.defaultField];
                    newElements.push(newElement);
                }
            }
            this.modelValue = newElements;
        },
        addElementBelow(index) {
            const newElement = {};
            newElement[this.defaultField] = this.defaultValue[this.defaultField];
            this.modelValue.splice(index + 1, 0, newElement);
        },
        removeElement(index) {
            this.modelValue.splice(index, 1)
        },
        update(updatedValue, updatedIndex, force=false) {
            var total = 0;
            for (const [key, value] of Object.entries(this.localData)) {
                total += value;
            }

            if (total != this.max || force) {
                const fixedValue = this.localData[updatedIndex];
                const remaining = Math.max(this.min, this.max - fixedValue);

                for (var index = 0; index < this.modelValue.length; index++) {
                    if (index != updatedIndex) {
                        this.localData[index] = remaining / (this.modelValue.length - 1);
                    }
                }

                this.forceUpdate += 1;
                for (var index = 0; index < this.modelValue.length; index++) {
                    this.modelValue[index] = this.localData[index] / 100;
                }
                this.$emit('update');
            }

        },
    }
}
</script>


<template>
    <div class="container-flex">
        <div class="row">
            <label v-if="replaceTitle == null" :data-cy="dataTestLabel + '-title'" class="rounded-2 fs-5 m-0 text-start" :class="maximumNumberElements != null? 'col-lg-6 col-md-12' : 'col-12'">{{toTitleCase(name)}}</label>
            <label v-if="replaceTitle != null" :data-cy="dataTestLabel + '-title'" class="rounded-2 fs-5 m-0 text-start" :class="maximumNumberElements != null? 'col-lg-6 col-md-12' : 'col-12'">{{replaceTitle}}</label>
            <div class="col-lg-6 col-md-12">
                <div class="row m-0 p-0">
                    <div :data-cy="dataTestLabel + '-' + index + '-container'" class="col-6 " v-for="_, index in modelValue">
                        <div class=" m-0 p-0">
                            <Dimension :dataTestLabel="dataTestLabel + '-' + index"
                                :allowNegative="allowNegative"
                                :min="min"
                                :max="max"
                                :defaultValue="defaultValue"
                                :name="String(index)"
                                :replaceTitle="suffix + String(index + 1)"
                                :unit="unit" 
                                :forceUpdate="forceUpdate" 
                                v-model="localData" 
                                class="col-12"
                                styleClassInput="m-0 px-0 col-8"
                                labelStyleClass="col-4 p-0"
                                dimensionStyleClass="col-8 p-0"
                                @update="update"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row">
            <label class="text-danger text-center col-12 pt-1" style="font-size: 0.9em; white-space: pre-wrap;">{{errorMessages}}</label>
        </div>
    </div>
</template>


