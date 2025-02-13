<script setup>
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        return {
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
    <div class="container">
        <div class="row">
            <h2 class="col-6">
                {{'How many phases do you need?'}}
            </h2>
            <span class="col-6">
                <button 
                    :style="''"
                    class="btn"
                    @click="twoPhasesSelected"
                >
                    {{'Two phases'}}
                </button>
                <button 
                    :style="''"
                    class="btn"
                    @click="threePhasesSelected"
                >
                    {{'Three phases'}}
                </button>
            </span>
        </div>
        <div class="row">
            <h2 class="col-6">
                {{'What is your main frequency?'}}
            </h2>
            <span class="col-6">
            </span>
        </div>
        <div class="row">
            <h2 class="col-6">
                {{'What is your main frequency?'}}
            </h2>
            <span class="col-6">
            </span>
        </div>
        <div class="row">
            <h2 class="col-6">
                {{'What the RMS of main signal?'}}
            </h2>
            <span class="col-6">
            </span>
        </div>
        <div class="row">
            <h2 class="col-6">
                {{'Do you have harmonics? how many?'}}
            </h2>
            <span class="col-6">
            </span>
        </div>
        <div class="row">
            <h2 class="col-6">
                {{'What the minimum inductance you need?'}}
            </h2>
            <span class="col-6">
            </span>
        </div>
        <div class="row">
            <h2 class="col-6">
                {{'How many impedance points do you want to define?'}}
            </h2>
            <span class="col-6">
            </span>
        </div>
        <div class="row">
            <h2 class="col-6">
                {{'Do you need insulation?'}}
            </h2>
            <span class="col-6">
            </span>
        </div>
        <div class="row">
            <h2 class="col-6">
                {{'Do you have dimensional restrictions?'}}
            </h2>
            <span class="col-6">
            </span>
        </div>
    </div>
</template>
