<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import { useMasStore } from '/src/stores/mas'


</script>
<script>
export default {
    data() {
        const masStore = useMasStore();

        return {
            masStore,
        }
    },
    methods: {
        createNewMagneticSpecification() {
            this.$userStore.resetMagneticSpecification();
            this.masStore.resetMas();
            this.$router.push('/magnetic_specification');
        },
        createNewMagneticCoreAdviser() {
            this.$userStore.resetMagneticCoreAdviser();
            this.masStore.resetMas();
            this.$router.push('/magnetic_core_adviser');
        },
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
            <div class="container mx-5">
                <div class="row">
                    <div class="text-white my-5 text-center offset-2 col-8 bg-light rounded-4">
                        <h1 class="">What do you need?</h1>
                    </div>
                </div>
                <div class="row">
                    <div class="text-white my-5 p-2 text-center col-sm-10 col-2-md col-lg-3 bg-light rounded-4">
                        <h2 class="">A complete magnetic</h2>
                        <div class="" aria-label="Group with synthesis button">
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-magnetic-specification-button" class="m-2 btn btn-primary" @click="createNewMagneticSpecification">Specify a magnetic</button>
                            <button disabled v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-insulation-button" class="m-2 btn btn-primary">Calculate insulation</button>
                            <button disabled v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-magnetic-synthesis-button" class="m-2 btn btn-primary">Design a magnetic</button>
                        </div>
                    </div>
                    <div class="text-white my-5 p-2 text-center offset-1 col-sm-10 col-3-md col-lg-3 bg-light rounded-4">
                        <h2 class="">A magnetic core</h2>
                        <div class="" aria-label="Group with core button">
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-find-cots-core-button" class="m-2 btn btn-primary" @click="createNewMagneticCoreAdviser">Find COTS core</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-cross-reference-core-button" class="m-2 btn btn-primary disabled">Cross reference core</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-customize-core-button" class="m-2 btn btn-primary disabled">Customize core</button>
                        </div>
                    </div>
                    <div class="text-white my-5 p-2 text-center offset-1 col-sm-10 col-3-md col-lg-3 bg-light rounded-4">
                        <h2 class="">Some wire</h2>
                        <div class="" aria-label="Group with wire button">
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-find-cots-wire-button" class="m-2 btn btn-primary disabled">Find COTS wire</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-cross-reference-wire-button" class="m-2 btn btn-primary disabled">Cross reference wire</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-customize-wire-button" class="m-2 btn btn-primary disabled">Customize wire</button>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="text-white my-5 p-2 text-center offset-1 col-10  bg-light rounded-4">
                        <h2 class="">Old tools (soon to be integrated into other tools)</h2>
                        <div class="" aria-label="Group with old button">
                            <a href="/operation_point" v-resize-text="{ratio: 0.7, minFontSize: '20px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-old-operating-point-button" class="m-2 btn btn-primary">Create Operating Point</a>
                            <a href="/core" v-resize-text="{ratio: 0.7, minFontSize: '20px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-old-core-button" class="m-2 btn btn-primary">Create core</a>
                            <a href="/simulation" v-resize-text="{ratio: 0.7, minFontSize: '20px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-simuation-button" class="m-2 btn btn-primary">Simulation</a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>
