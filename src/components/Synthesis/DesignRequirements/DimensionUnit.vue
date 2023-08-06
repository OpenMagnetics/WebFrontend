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
    <select class="form-select bg-light text-white m-0 px-1 text-center" :value="modelValue" @change="$emit('update:modelValue', Number($event.target.value))" style="width:auto;">
        <option v-for="value, label in multipliersLabel" :value="value">
            {{label + unit}}
        </option>
    </select>
</template>


