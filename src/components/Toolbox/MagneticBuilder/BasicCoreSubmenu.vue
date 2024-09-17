<script setup>
import { useMasStore } from '/src/stores/mas'
</script>

<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        enableAdvise: {
            type: Boolean,
            default: true,
        },
        enableCustomize: {
            type: Boolean,
            default: true,
        },
        enableLoad: {
            type: Boolean,
            default: false,
        }
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
            <button :disabled="!enableAdvise" :data-cy="dataTestLabel + '-Core-Advise-button'" class="btn btn-primary mx-auto d-block mt-1 col-4" @click="$emit('adviseCore')" >Advise core</button>
            <button :disabled="!enableCustomize" :data-cy="dataTestLabel + '-Core-Customize-button'" class="btn btn-success mx-auto d-block mt-1 col-4" @click="$emit('customizeCore')" >Customize</button>
            <button :disabled="!enableLoad" :data-cy="dataTestLabel + '-Core-Load-button'" class="btn btn-secondary mx-auto d-block mt-1 col-4" @click="$emit('loadCore')" >{{'Load core from library'}}</button>
        </div>
    </div>
</template>
