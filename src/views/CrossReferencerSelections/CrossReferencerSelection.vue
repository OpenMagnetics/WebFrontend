<script setup>
</script>\\wsl.localhost\Ubuntu-22.04\home\alf\OpenMagnetics\WebFrontend\src\views\CrossReferencerSelections\CrossReferencerSelection.vue

<script>
export default {
    props: {
        suffix: {
            type: String,
            default: '',
        },
    },
    data() {
        return {
        }
    },
    methods: {
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100 ">
        <main role="main" class="main p-0 m-0">
            <div class="container-fluid wrap p-0">
                <div class="container content">
                    <div id="home-welcome" class="row pt-2 mx-1 mt-1">
                        <div class="text-white my-1 mt-5 pt-4 pb-2 offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4">
                            <h1 data-cy="Home-title-text" class=" fw-bolder fs-1">Welcome to our Cross Referencer!</h1>
                            <h1 data-cy="Home-title-text" class=" fw-bolder fs-1">What do you need?</h1>
                        </div>
                        <div class="text-white offset-sm-2 offset-lg-2 col-sm-8 col-lg-8 text-center rounded-4">
                            <h3 data-cy="Home-title-text" class="text-white fw-light">Here you can find a substitute similar core for your magnetic, or directly cross reference magnetic materials.</h3>
                        </div>
                    </div>
            <div class="container mx-5">
                <div class="row">
                    <div class="text-white mt-5 p-2 text-center col-sm-10 col-2-md col-lg-5 rounded-4">
                        <h2 class="">I have chosen a core but I am looking for substitute core, and I don't mind exploring different similar shapes</h2>
                    </div>
                    <div class="text-white mt-5 p-2 text-center offset-md-1 col-sm-10 col-3-md col-lg-5 rounded-4">
                        <h2 class="">I have chosen a core and I have to keep it shape, but I am looking for a substitute material</h2>
                    </div>
                </div>
                <div class="row">
                    <div class="text-white p-2 text-center col-sm-10 col-2-md col-lg-5 rounded-4">
                        <div class="" aria-label="Group with synthesis button">
                            <a :href="'/core_cross_referencer' + (suffix == ''? '' : suffix)"  v-resize-text="{ratio: 0.7, minFontSize: '17px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-core_cross_referencer-button" class="m-2 btn btn-primary py-4">Cross reference my core</a>
                        </div>
                    </div>
                    <div class="text-white p-2 text-center offset-md-1 col-sm-10 col-3-md col-lg-5 rounded-4">
                        <div class="" aria-label="Group with core button">
                            <a :href="'/core_material_cross_referencer' + (suffix == ''? '' : suffix)"  v-resize-text="{ratio: 0.7, minFontSize: '17px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-core_material_cross_referencer-button" class="m-2 btn btn-secondary py-4">Cross reference my core material</a>
                        </div>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style>
    @media (max-width: 340px) {
        #title {
            display : none;
        }
    }

    body:before {
      content: ' ';
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 1;
      background-image: linear-gradient(to bottom, var(--bs-primary), var(--bs-dark) 100px);
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
    }

    .border-dark {
        border-color: var(--bs-dark) !important;
    }
    .input-group-text{
        background-color: var(--bs-light) !important;
        color: var(--bs-white) !important;
        border-color: var(--bs-dark) !important;
    }
    .custom-select,
    .form-control {
        background-color: var(--bs-dark) !important;
        color: var(--bs-white) !important;
        border-color: var(--bs-dark) !important;
    }
    .jumbotron{
        border-radius: 1em;
        box-shadow: 0 5px 10px rgba(0,0,0,.2);
    }
    .card{
        padding: 1.5em .5em .5em;
        background-color: var(--bs-light);
        border-radius: 1em;
        text-align: center;
        box-shadow: 0 5px 10px rgba(0,0,0,.2);
    }
    .form-control:disabled {
        background-color: var(--bs-dark) !important;
        color: var(--bs-white) !important;
        border-color: var(--bs-dark) !important;
    }
    .form-control:-webkit-autofill,
    .form-control:-webkit-autofill:focus,
    .form-control:-webkit-autofill{
        -webkit-text-fill-color: var(--bs-white) !important;
        background-color: transparent !important;
        -webkit-box-shadow: 0 0 0 50px var(--bs-dark) inset;
    }

    .container {
        max-width: 100vw;
        align-items: center;
    }

    .main {
      margin-top: 60px;
    }
    ::-webkit-scrollbar { height: 3px;}
    ::-webkit-scrollbar-button {  background-color: var(--bs-light); }
    ::-webkit-scrollbar-track {  background-color: var(--bs-light);}
    ::-webkit-scrollbar-track-piece { background-color: var(--bs-dark);}
    ::-webkit-scrollbar-thumb {  background-color: var(--bs-light); border-radius: 3px;}
    ::-webkit-scrollbar-corner { background-color: var(--bs-light);}

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
        border-color: var(--bs-primary) !important;
        outline: 0  !important;
        box-shadow: none  !important;
    }

</style>

