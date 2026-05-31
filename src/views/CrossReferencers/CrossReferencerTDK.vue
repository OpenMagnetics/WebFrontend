<script setup>
import CoreCrossReferencer from '../../components/Toolbox/CoreCrossReferencer.vue'
import CoreMaterialCrossReferencer from '../../components/Toolbox/CoreMaterialCrossReferencer.vue'
import { toTitleCase } from 'WebSharedComponents/assets/js/utils.js'
import '../../assets/scss/tdk.scss'
import {useRoute} from 'vue-router'
</script>

<script>
export default {
    data() {
        return {
        }
    },
    computed: {
        currentRoute() {
            const route=useRoute();
            return route.path;
        }
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <div class="container">
            <CoreCrossReferencer 
                v-if="currentRoute == '/core_cross_referencer_tdk' || currentRoute == '/core_shape_cross_referencer_tdk'"
                suffix="_tdk"
                loadingGif="/images/loading_tdk.gif"
                :onlyManufacturer="'TDK'"
                :keepMaterialConstant="currentRoute == '/core_shape_cross_referencer_tdk'"
            />
            <CoreMaterialCrossReferencer
                suffix="_tdk"
                :onlyManufacturer="'TDK'"
                loadingGif="/images/loading_tdk.gif"
                v-if="currentRoute == '/core_material_cross_referencer_tdk'"
            />
        </div>
    </div>
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