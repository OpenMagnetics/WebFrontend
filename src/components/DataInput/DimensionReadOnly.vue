<script setup>
import { isNumber, toTitleCase, getMultiplier, removeTrailingZeroes } from '/src/assets/js/utils.js'
import DimensionUnit from '/src/components/DataInput/DimensionUnit.vue'
</script>
<script>
export default {
    props: {
        name:{
            type: String,
            required: true
        },
        unit:{
            type: String,
            required: false
        },
        value:{
            default: 0
        },
        min:{
            type: Number,
            default: 1e-12
        },
        max:{
            type: Number,
            default: 1e+9
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
    },
    data() {
        const localData = {
            multiplier: null,
            scaledValue: null
        };

        const aux = getMultiplier(this.value, 0.001);
        localData.scaledValue = removeTrailingZeroes(aux.scaledValue);
        localData.multiplier = aux.multiplier;

        var shortenedName = this.name;

        return {
            localData,
            shortenedName,
        }
    },
    computed: {
        visuallyScaledValue() {
            const value = removeTrailingZeroes(Number(this.localData.scaledValue * this.visualScale))
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
                return toTitleCase(this.name);

            var shortenName = toTitleCase(this.name);
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
                const aux = getMultiplier(actualValue, 0.001);
                this.$refs.inputRef.value = removeTrailingZeroes(aux.scaledValue)
                this.localData.scaledValue = aux.scaledValue;
                this.localData.multiplier = aux.multiplier;
            }
            else {
                this.$refs.inputRef.value = removeTrailingZeroes(Number(actualValue))
                this.localData.scaledValue = removeTrailingZeroes(Number(actualValue));
                this.localData.multiplier = 1;
            }
        },
    }
}
</script>


<template>
    <div :data-cy="dataTestLabel + '-container'" class="container-flex" ref="container">
        <div class="row">
            <label :data-cy="dataTestLabel + '-title'" class="rounded-2 col-7 " :class="styleClass">{{shortenedName}}</label>
            <div v-if="localData.scaledValue != null" class="col-5 row m-0 px-0">
                <input :disabled="true" :data-cy="dataTestLabel + '-number-label'" type="number" class="m-0 px-0 col-7 bg-light text-white bg-dark border-0" :class="styleClass" :value="visuallyScaledValue" ref="inputRef">
                <DimensionUnit :styleClass="'bg-dark border-0 my-0 py-0'" :readOnly="true" :data-cy="dataTestLabel + '-DimensionUnit-input'" :min="min" :max="max" v-if="unit != null" :unit="unit" v-model="localData.multiplier" class="m-0 px-0 col-2"/>
                <label :data-cy="dataTestLabel + '-DimensionUnit-text'" v-if="unit == null" class="ms-2 pt-1 px-0 col-2" >{{altUnit}}</label>
            </div>
        </div>
    </div>
</template>


