<script setup>
import CoreCrossReferencer from '../../components/Toolbox/CoreCrossReferencer.vue'
import CoreMaterialCrossReferencer from '../../components/Toolbox/CoreMaterialCrossReferencer.vue'
import { toTitleCase } from 'WebSharedComponents/assets/js/utils.js'
import '../../assets/scss/fair-rite.scss'
import {useRoute} from 'vue-router'
</script>

<script>
export default {
    data() {
        return {
        }
    },
    methods: {
    },
    computed: {
        currentRoute() {
            const route=useRoute();
            return route.path;
        }
    },
    mounted() {
    },
    created() {

        const style = getComputedStyle(document.body);
        const theme = {
            primary: style.getPropertyValue('--p-primary'),
            secondary: style.getPropertyValue('--p-secondary'),
            success: style.getPropertyValue('--p-success'),
            info: style.getPropertyValue('--p-info'),
            warning: style.getPropertyValue('--p-warning'),
            danger: style.getPropertyValue('--p-danger'),
            light: style.getPropertyValue('--p-light'),
            dark: style.getPropertyValue('--p-dark'),
            white: style.getPropertyValue('--p-white'),
            transparent: style.getPropertyValue('--p-transparent'),
        };
        this.$styleStore.setTheme(theme);
    },
}
</script>

<template>
    <CoreCrossReferencer 
        v-if="currentRoute == '/core_cross_referencer_fair_rite' || currentRoute == '/core_shape_cross_referencer_fair_rite'"
        suffix="_fair_rite"
        loadingGif="/images/loading_fair_rite.gif"
        :onlyManufacturer="'Fair-Rite'"
        :keepMaterialConstant="currentRoute == '/core_shape_cross_referencer_fair_rite'"
    />
    <CoreMaterialCrossReferencer
        suffix="_fair_rite"
        :onlyManufacturer="'Fair-Rite'"
        loadingGif="/images/loading_fair_rite.gif"
        v-if="currentRoute == '/core_material_cross_referencer_fair_rite'"
    />
</template>
<style>

    html {
      position: relative;
      min-height: 100%;
      padding-bottom:160px;
    }

    .om-header {
        min-width: 100%;
        position: fixed;
        z-index: 999;
    }


    @media (max-width: 340px) {
        #title {
            display : none;
        }
    }

    body {
        background-color: var(--p-dark) !important;
    }
    .border-dark {
        border-color: var(--p-dark) !important;
    }
    .input-group-text{
        background-color: var(--p-light) !important;
        color: var(--p-white) !important;
        border-color: var(--p-dark) !important;
    }
    .custom-select,
    .form-control {
        background-color: var(--p-dark) !important;
        color: var(--p-white) !important;
        border-color: var(--p-dark) !important;
    }
    .jumbotron{
        border-radius: 1em;
        box-shadow: 0 5px 10px rgba(var(--p-black-rgb), .2);
    }
    .card{
        padding: 1.5em .5em .5em;
        background-color: var(--p-light);
        border-radius: 1em;
        text-align: center;
        box-shadow: 0 5px 10px rgba(var(--p-black-rgb), .2);
    }
    .form-control:disabled {
        background-color: var(--p-dark) !important;
        color: var(--p-white) !important;
        border-color: var(--p-dark) !important;
    }
    .form-control:-webkit-autofill,
    .form-control:-webkit-autofill:focus,
    .form-control:-webkit-autofill{
        -webkit-text-fill-color: var(--p-white) !important;
        background-color: transparent !important;
        -webkit-box-shadow: 0 0 0 50px var(--p-dark) inset;
    }

    .container {
        max-width: 100vw !important;
        align-items: center !important;
    }

    .main {
      margin-top: 60px;
    }
    ::-webkit-scrollbar { height: 3px;}
    ::-webkit-scrollbar-button {  background-color: var(--p-light); }
    ::-webkit-scrollbar-track {  background-color: var(--p-light);}
    ::-webkit-scrollbar-track-piece { background-color: var(--p-dark);}
    ::-webkit-scrollbar-thumb {  background-color: var(--p-light); border-radius: 3px;}
    ::-webkit-scrollbar-corner { background-color: var(--p-light);}

    .small-text {
       font-size: calc(1rem + 0.1vw);
    }
    .medium-text {
       font-size: calc(0.8rem + 0.4vw);
    }
    .large-text {
       font-size: calc(1rem + 0.5vw);
    }

    .accordion-button:focus {
        border-color: var(--p-primary) !important;
        outline: 0  !important;
        box-shadow: none  !important;
    }

</style>
