<script>
export default {
    props: {
        suffix: {
            type: String,
            default: '',
        },
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100 ">
        <main role="main" class="main p-0 m-0">
            <div class="container-fluid wrap p-0">
                <div class="container content">
                    <div id="home-welcome" class="row pt-2 mx-1 mt-1">
                        <div class="text-white my-1 mt-5 pt-4 pb-2 sm:col-offset-2 lg:col-offset-3 sm:col-8 lg:col-6 text-center rounded-4">
                            <h1 data-cy="Home-title-text" class=" font-bold text-5xl">Welcome to our Cross Referencer!</h1>
                            <h1 data-cy="Home-title-text" class=" font-bold text-5xl">What do you need?</h1>
                        </div>
                        <div class="text-white sm:col-offset-2 lg:col-offset-2 sm:col-8 lg:col-8 text-center rounded-4">
                            <h3 data-cy="Home-title-text" class="text-white font-light">Here you can find a substitute similar core for your magnetic, or directly cross reference magnetic materials.</h3>
                        </div>
                    </div>
            <div class="container mx-5">
                <div class="row">
                    <div class="text-white mt-5 p-0 text-center sm:col-10 lg:col-3 rounded-4">
                        <h2 class="">I have chosen a core but I want to <span class="text-info">substitute the core</span>, and I am looking to explore alternative <span class="text-primary">similar shapes and materials</span>.</h2>
                    </div>
                    <div class="text-white mt-5 p-0 text-center md:col-offset-1 sm:col-10 lg:col-3 rounded-4">
                        <h2 class="">I have chosen a core and I want to <span class="text-info">keep its material</span>, but I am looking for a <span class="text-success">substitute shape</span>.</h2>
                    </div>
                    <div class="text-white mt-5 p-0 text-center md:col-offset-1 sm:col-10 lg:col-3 rounded-4">
                        <h2 class="">I have chosen a core and I want to <span class="text-info">keep its shape</span>, but I am looking for a <span class="text-secondary">substitute material</span>.</h2>
                    </div>
                </div>
                <div class="row">
                    <div class="text-white p-2 text-center sm:col-10 lg:col-3 rounded-4">
                        <div class="">
                            <a :href="'/core_cross_referencer' + (suffix == ''? '' : suffix)"  v-resize-text="{ratio: 0.7, minFontSize: '17px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-core_cross_referencer-button" class="m-2 p-button p-button-primary py-4">Cross reference my core</a>
                        </div>
                    </div>
                    <div class="text-white p-2 text-center md:col-offset-1 sm:col-10 lg:col-3 rounded-4">
                        <div class="">
                            <a :href="'/core_shape_cross_referencer' + (suffix == ''? '' : suffix)"  v-resize-text="{ratio: 0.7, minFontSize: '17px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-core_shape_cross_referencer-button" class="m-2 p-button p-button-success py-4">Cross reference my core shape</a>
                        </div>
                    </div>
                    <div class="text-white p-2 text-center md:col-offset-1 sm:col-10 lg:col-3 rounded-4">
                        <div class="" >
                            <a :href="'/core_material_cross_referencer' + (suffix == ''? '' : suffix)"  v-resize-text="{ratio: 0.7, minFontSize: '17px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-core_material_cross_referencer-button" class="m-2 p-button p-button-secondary py-4">Cross reference my core material</a>
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
    .wrap {
      position: relative;
    }

    .wrap:before {
      content: ' ';
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 1;
      background-image: linear-gradient(to bottom, rgba(var(--p-dark-rgb), 0.666), var(--p-dark)),
    url('/images/background_cross_reference.png');
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
    }

    .content {
      position: relative;
    }

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
      background-image: linear-gradient(to bottom, var(--p-light), var(--p-dark) 100px);
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
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
        max-width: 100vw;
        align-items: center;
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

