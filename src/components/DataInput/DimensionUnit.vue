<script setup>
</script>
<script>
export default {
    props: {
        unit:{
            type: String,
            required: true
        },
        modelValue:{
            type: Number,
            required: false
        },
        min:{
            type: Number,
            default: 1e-12
        },
        max:{
            type: Number,
            default: 1e+9
        },
        readOnly:{
            type: Boolean,
            default: false
        },
        styleClass:{
            type: String,
            default: ''
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        const multipliersLabel = {
        };

        if (this.min <= 1e-12 )
            multipliersLabel["p"] = 1e-12;
        if (this.min <= 1e-9 && this.max >= 1e-9  )
            multipliersLabel["n"] = 1e-9;
        if (this.min <= 1e-6 && this.max >= 1e-6  )
            multipliersLabel["u"] = 1e-6;
        if (this.min <= 1e-3 && this.max >= 1e-3  )
            multipliersLabel["m"] = 1e-3;
        if (this.min <= 1 && this.max >= 1  )
            multipliersLabel[""] = 1;
        if (this.min <= 1e+3 && this.max >= 1e+3  )
            multipliersLabel["k"] = 1e+3;
        if (this.min <= 1e+6 && this.max >= 1e+6  )
            multipliersLabel["M"] = 1e+6;
        if (this.min <= 1e+9 && this.max >= 1e+9  )
            multipliersLabel["G"] = 1e+9;

        return {
            multipliersLabel
        }
    },
    computed: {
        modelValueInRange() {
            if (!Object.values(this.multipliersLabel).includes(this.modelValue)) {
                var distance = 1e+12;
                var closest = this.modelValue;
                for (let [key, value] of Object.entries(this.multipliersLabel)) {
                    const thisDistance = Math.abs(value - this.modelValue);
                    if (distance > thisDistance) {
                        distance = thisDistance;
                        closest = value;
                    }
                }
                return closest;

            }
            else {
                return this.modelValue;
            }
        }
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
    }
}
</script>


<template>
    <select class="form-select bg-light text-white m-0 p-0 text-center unit-select" :class="styleClass" :value="modelValueInRange" @change="$emit('update:modelValue', Number($event.target.value))" style="width:auto;" :disabled="readOnly || disabled">
        <option v-for="value, label in multipliersLabel" :value="value">
            {{label + unit}}
        </option>
    </select>
</template>

<style type="text/css">
    .unit-select {
        background-image: none !important;
        background: none !important;
 }
</style>

