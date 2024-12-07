<script setup>
import { toTitleCase, getMultiplier, removeTrailingZeroes } from '/src/assets/js/utils.js'
import DimensionUnit from '/src/components/DataInput/DimensionUnit.vue'
</script>
<script>
export default {
    props: {
        name:{
            type: String,
            required: true
        },
        subscriptName:{
            type: String,
            default: ""
        },
        unit:{
            type: String,
            required: false
        },
        value:{
            default: 0
        },
        power:{
            type: Number,
            default: 1
        },
        min:{
            type: Number,
            default: 1e-12
        },
        max:{
            type: Number,
            default: 1e+9
        },
        numberDecimals:{
            type: Number,
            default: 6
        },
        dataTestLabel: {
            type: String,
            default: '',
        },
        altUnit:{
            type: String,
            default: ''
        },
        visualScale:{
            type: Number,
            default: 1
        },
        disableShortenLabels:{
            type: Boolean,
            default: false
        },
        styleClass:{
            type: String,
            default: 'fs-6'
        },
        labelStyleClass:{
            type: String,
            default: 'col-5'
        },
        dimensionUnitStyleClass:{
            type: String,
            default: 'bg-dark border-0 my-0 py-0'
        },
        dimensionStyleClass:{
            type: String,
            default: 'col-7'
        },
        inputStyleClass:{
            type: String,
            default: 'col-7 text-white'
        },
        useTitleCase:{
            type: Boolean,
            default: true
        },
    },
    data() {
        const localData = {
            multiplier: null,
            scaledValue: null
        };

        const aux = getMultiplier(this.value, 0.001, false, this.power);
        localData.scaledValue = removeTrailingZeroes(aux.scaledValue, this.numberDecimals);
        localData.multiplier = aux.multiplier;

        var shortenedName = this.name;

        return {
            localData,
            shortenedName,
        }
    },
    computed: {
        visuallyScaledValue() {
            const value = removeTrailingZeroes(Number(this.localData.scaledValue * this.visualScale), this.numberDecimals)
            return value;
        },
    },
    watch: {
        value(newValue, oldValue) {
            if (newValue != null)
                this.update(newValue);
        },
    },
    mounted () {
        this.shortenedName = this.shortenName();
    },
    methods: {
        shortenName() {
            if (this.$refs.container == undefined || this.disableShortenLabels)
                if (this.useTitleCase) {
                    return toTitleCase(this.name);
                }
                else {
                    return this.name;
                }

            var shortenName = this.name;
            if (this.useTitleCase) {
                shortenName = toTitleCase(this.name);
            }
            if (this.$refs.container.clientWidth < 400 && this.name.length > 10) {
                var slice = 7;
                if (this.$refs.container.clientWidth < 310)
                    slice = 6;
                if (this.$refs.container.clientWidth < 250)
                    slice = 4;

                shortenName = shortenName.split(' ')
                    .map(item => item.length < slice? item + ' ' : item.slice(0, slice) + '. ')
                    .join('')
            }
            return shortenName
        },
        update(actualValue) {
            if (this.unit != null) {
                const aux = getMultiplier(actualValue, 0.001, false, this.power);
                this.$refs.inputRef.value = removeTrailingZeroes(aux.scaledValue, this.numberDecimals)
                this.localData.scaledValue = aux.scaledValue;
                this.localData.multiplier = aux.multiplier;
            }
            else {
                this.$refs.inputRef.value = removeTrailingZeroes(Number(actualValue), this.numberDecimals)
                this.localData.scaledValue = removeTrailingZeroes(Number(actualValue), this.numberDecimals);
                this.localData.multiplier = 1;
            }
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex" ref="container">
        <div class="row">
            <label :data-cy="dataTestLabel + '-title'" class="rounded-2 pe-0" :class="styleClass + ' ' + labelStyleClass">{{shortenedName}}<sub>{{subscriptName}}</sub> </label>
            <div v-if="localData.scaledValue != null" :class="dimensionStyleClass" class="container m-0 px-0">
                <div class="row m-0 px-0 ">
                    <input :disabled="true" :data-cy="dataTestLabel + '-number-label'" type="number" class="m-0 px-0 bg-transparent text-end border-0" :class="inputStyleClass" :value="visuallyScaledValue" ref="inputRef">
                    <DimensionUnit :styleClass="dimensionUnitStyleClass" :readOnly="true" :data-cy="dataTestLabel + '-DimensionUnit-input'" :min="min" :max="max" v-if="unit != null" :unit="unit" v-model="localData.multiplier" class="m-0 px-0 col-2"/>
                    <label :data-cy="dataTestLabel + '-DimensionUnit-text'" v-if="unit == null" class="ms-2 pt-1 px-0 col-2" >{{altUnit}}</label>
                </div>
            </div>
        </div>
    </div>
</template>


