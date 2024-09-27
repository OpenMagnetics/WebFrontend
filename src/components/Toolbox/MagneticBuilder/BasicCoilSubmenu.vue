<script setup>
import { useMasStore } from '/src/stores/mas'
</script>

<script>
export default {
    emits: ["showAlignmentOptions", "customizeCoil", "showMarginOptions"],
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        enableAlignmentOptions: {
            type: Boolean,
            default: true,
        },
        enableMarginOptions: {
            type: Boolean,
            default: true,
        },
        enableCustomize: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        const showAlignmentOptions = false;
        const showMarginOptions = false;
        return {
            showAlignmentOptions,
            showMarginOptions,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        swapShowAlignmentOptions() {
            this.showAlignmentOptions = !this.showAlignmentOptions;
            this.$emit('showAlignmentOptions', this.showAlignmentOptions);
        },
        swapShowMarginOptions() {
            this.showMarginOptions = !this.showMarginOptions;
            this.$emit('showMarginOptions', this.showMarginOptions);
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <button :disabled="!enableAlignmentOptions" :data-cy="dataTestLabel + '-Coil-ShowAlignmentOptions-button'" :class="showAlignmentOptions? 'btn-secondary' : 'btn-primary'" class="btn btn-primary mx-auto d-block mt-1 col-4" @click="swapShowAlignmentOptions" >{{showAlignmentOptions? 'Hide alignment options' : 'Show alignment options'}}</button>
            <button :disabled="!enableMarginOptions" :data-cy="dataTestLabel + '-Coil-ShowMarginOptions-button'" :class="showMarginOptions? 'btn-secondary' : 'btn-primary'" class="btn btn-primary mx-auto d-block mt-1 col-4" @click="swapShowMarginOptions" >{{showMarginOptions? 'Hide margin options' : 'Show margin options'}}</button>
            <button :disabled="!enableCustomize" :data-cy="dataTestLabel + '-Coil-Customize-button'" class="btn btn-success mx-auto d-block mt-1 col-4" @click="$emit('customizeCoil')" >Customize</button>
        </div>
    </div>
</template>
