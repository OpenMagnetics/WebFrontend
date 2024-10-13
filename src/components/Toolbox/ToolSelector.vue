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
                    <div class="text-white my-5 p-2 text-center col-sm-10 col-md-2 col-lg-4 rounded-4">
                        <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" :data-cy="dataTestLabel + '-magnetic-specifications-button'" class="m-2 py-4 btn btn-primary" @click="$emit('toolSelected', 'magneticSpecificationsReport')">I want to download a report</button>
                    </div>
                    <div class="text-white my-5 p-2 text-center col-sm-10 col-md-2 col-lg-4 rounded-4">
                        <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" :data-cy="dataTestLabel + '-magnetic-core-adviser-button'" class="m-2 py-4 btn btn-primary" @click="$emit('toolSelected', 'magneticCoreAdviser')">I need a COTS core, recommend some</button>
                    </div>
                    <div class="text-white my-5 p-2 text-center col-sm-10 col-md-2 col-lg-4 rounded-4">
                        <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" :data-cy="dataTestLabel + '-magnetic-adviser-button'" class="m-2 py-4 btn btn-primary" @click="$emit('toolSelected', 'magneticAdviser')">Advise me some magnetic designs</button>
                        <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" :data-cy="dataTestLabel + '-magnetic-builder-button'" class="m-2 py-4 btn btn-primary" @click="$emit('toolSelected', 'magneticBuilder')">I want build my own magnetic</button>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </main>
    </div>
</template>
