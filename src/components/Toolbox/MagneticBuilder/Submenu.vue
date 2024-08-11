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
        name: {
            type: String
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
            <button :data-cy="dataTestLabel + '-' + name + '-Advise-button'" class="btn btn-primary mx-auto d-block mt-1 col-4" @click="suggest" >{{'Advise me a ' + name}}</button>
            <button :data-cy="dataTestLabel + '-' + name + '-Customize-button'" class="btn btn-success mx-auto d-block mt-1 col-4" @click="suggest" >{{'Customize this ' + name}}</button>
            <button :disabled="true" :data-cy="dataTestLabel + '-' + name + '-Load-button'" class="btn btn-secondary mx-auto d-block mt-1 col-4" @click="suggest" >{{'Load ' + name + ' from personal library'}}</button>
        </div>
    </div>
</template>
