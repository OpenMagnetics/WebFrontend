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
    methods: {
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <main role="main" class="main p-0 m-0">
            <div class="container-fluid wrap px-0">
                <div class="container content">
                    <div id="home-welcome" class="row pt-2 mx-1">
                        <div class="text-white my-1 pt-4 pb-2 offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4">
                            <h1 data-cy="Home-title-text" class=" fw-bolder fs-1">We have everything we need!</h1>
                            <h1 data-cy="Home-title-text" class=" fw-bolder fs-1">What do you want to with your specifications?</h1>
                        </div>
                    </div>
            <div class="container">
                <div class="row">
                    <div class="text-white my-2 p-2 text-start col-12 rounded-4 row">
                        <h5 :data-cy="dataTestLabel + '-magnetic-specifications-explanation'" class="col-9 py-3">I want to get a PDF report with my specifications, so I can send it to manufacturers and get a quotation.</h5>
                        <button :data-cy="dataTestLabel + '-magnetic-specifications-button'" class="col-3 fs-5 py-4 btn btn-primary" @click="$emit('toolSelected', 'magneticSpecificationsReport')">I want to download a report</button>
                    </div>
                    <div class="text-white my-2 p-2 text-start col-12 rounded-4 row">
                        <h5 :data-cy="dataTestLabel + '-magnetic-specifications-explanation'" class="col-9 py-3">I am looking for some Commercial Off-The-Shelf cores for my component, especially if they are in stock and I can order them right now.</h5>
                        <button :data-cy="dataTestLabel + '-magnetic-core-adviser-button'" class="fs-5 col-3 py-4 btn btn-primary" @click="$emit('toolSelected', 'magneticCoreAdviser')">Recommend me some COTS cores</button>
                    </div>
                    <div class="text-white my-2 p-2 text-start col-12 rounded-4 row">
                        <h5 :data-cy="dataTestLabel + '-magnetic-specifications-explanation'" class="col-9 py-3">I am looking for a full magnetic design, but I am not sure what I need, so I would like to look at several options.</h5>
                        <button :data-cy="dataTestLabel + '-magnetic-adviser-button'" class="fs-5 col-3 py-4 btn btn-primary" @click="$emit('toolSelected', 'magneticAdviser')">Advise me some magnetic designs</button>
                    </div>
                    <div class="text-white my-2 p-2 text-start col-12 rounded-4 row">
                        <h5 :data-cy="dataTestLabel + '-magnetic-specifications-explanation'" class="col-9 py-3">I need a full magnetic design, but I know what I want and I want to build it myself and get the simulated behavior.</h5>
                        <button :data-cy="dataTestLabel + '-magnetic-builder-button'" class="fs-5 col-3 py-4 btn btn-primary" @click="$emit('toolSelected', 'magneticBuilder')">I want build my own magnetic</button>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </main>
    </div>
</template>
