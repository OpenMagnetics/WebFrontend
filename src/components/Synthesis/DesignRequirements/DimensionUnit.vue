<script setup>
</script>
<script>
export default {
    props: {
        unit:{
            type: String,
            required: false
        },
        modelValue:{
            type: Number,
            required: false
        },
    },
    data() {
        const multipliersLabel = {
            "p": 1e-12,
            "n": 1e-9,
            "u": 1e-6,
            "m": 1e-3,
            "": 1,
            "k": 1e+3,
            "M": 1e+6,
            "G": 1e+9,
        };

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
    <select class="form-select bg-light text-white m-0 text-center" :value="modelValue" @change="$emit('update:modelValue', Number($event.target.value))" style="width:auto;">
        <option v-for="value, label in multipliersLabel" :value="value">
            {{label + unit}}
        </option>
    </select>
</template>


