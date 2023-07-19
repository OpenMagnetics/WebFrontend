<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'


</script>
<script>
export default {
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
        <Header />
        <main role="main" class="main">
            <div class="container mx-auto ">
                <div class="row">
                    <div class="text-white my-5 text-center offset-2 col-8 bg-light rounded-4">
                        <h1 class="">Choose your path</h1>
                    </div>
                </div>
                <div class="row">
                    <div class="text-white my-5 p-2 text-center offset-1 col-sm-10 col-2-md col-lg-2 bg-light rounded-4">
                        <h2 class="">Synthesis tools</h2>
                        <div class="" aria-label="Group with synthesis button">
                            <a v-resize-text="{ratio:0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-test="ToolSelection-magnetic-synthesis-button" class="m-2 btn btn-primary" href="/magnetic_synthesis">Magnetic synthesis</a>
                        </div>
                    </div>
                    <div class="text-white my-5 p-2 text-center offset-1 col-sm-10 col-3-md col-lg-3 bg-light rounded-4">
                        <h2 class="">Core tools</h2>
                        <div class="" aria-label="Group with core button">
                            <button v-resize-text="{ratio:0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-test="ToolSelection-find-cots-core-button" class="m-2 btn btn-primary disabled">Find COTS core</button>
                            <button v-resize-text="{ratio:0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-test="ToolSelection-cross-reference-core-button" class="m-2 btn btn-primary disabled">Cross reference core</button>
                            <button v-resize-text="{ratio:0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-test="ToolSelection-customize-core-button" class="m-2 btn btn-primary disabled">Customize core</button>
                        </div>
                    </div>
                    <div class="text-white my-5 p-2 text-center offset-1 col-sm-10 col-3-md col-lg-3 bg-light rounded-4">
                        <h2 class="">Wire tools</h2>
                        <div class="" aria-label="Group with wire button">
                            <button v-resize-text="{ratio:0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-test="ToolSelection-find-cots-wire-button" class="m-2 btn btn-primary disabled">Find COTS wire</button>
                            <button v-resize-text="{ratio:0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-test="ToolSelection-cross-reference-wire-button" class="m-2 btn btn-primary disabled">Cross reference wire</button>
                            <button v-resize-text="{ratio:0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-test="ToolSelection-customize-wire-button" class="m-2 btn btn-primary disabled">Customize wire</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>
