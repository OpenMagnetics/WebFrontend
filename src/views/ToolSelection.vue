<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import CreateOrContinueModal from '/src/components/Toolbox/CreateOrContinueModal.vue'
import { useMasStore } from '/src/stores/mas'


</script>
<script>
export default {
    data() {
        const masStore = useMasStore();

        return {
            masStore,
            selectedTool: "",
        }
    },
    methods: {
        createNewMagneticSpecification(reset) {
            this.$userStore.resetMagneticSpecification();
            if (reset) {
                this.masStore.resetMas();
            }
            this.$router.push('/magnetic_specification');
        },
        createNewMagneticCoreAdviser(reset) {
            this.$userStore.resetMagneticCoreAdviser();
            if (reset) {
                this.masStore.resetMas();
            }
            this.$router.push('/magnetic_core_adviser');
        },
        createNewMagneticAdviser(reset) {
            this.$userStore.resetMagneticAdviser();
            if (reset) {
                this.masStore.resetMas();
            }
            this.$router.push('/magnetic_synthesis');
        },
        createNewInsulationAdviser(reset) {
            // this.$userStore.resetInsulationAdviser();
            if (reset) {
                this.masStore.resetMas();
            }
            this.$router.push('/insulation_adviser');
        },
        onCreate() {
            if (this.selectedTool == "magneticSpecification") {
                this.createNewMagneticSpecification(true);
            }
            if (this.selectedTool == "coreAdviser") {
                this.createNewMagneticCoreAdviser(true);
            }
            if (this.selectedTool == "magneticAdviser") {
                this.createNewMagneticAdviser(true);
            }
            if (this.selectedTool == "insulationAdviser") {
                this.createNewInsulationAdviser(true);
            }
        },
        onContinue() {
            if (this.selectedTool == "magneticSpecification") {
                this.createNewMagneticSpecification(false);
            }
            if (this.selectedTool == "coreAdviser") {
                this.createNewMagneticCoreAdviser(false);
            }
            if (this.selectedTool == "magneticAdviser") {
                this.createNewMagneticAdviser(false);
            }
            if (this.selectedTool == "insulationAdviser") {
                this.createNewInsulationAdviser(false);
            }

        },
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
    <CreateOrContinueModal @onCreate="onCreate()" @onContinue="onContinue()"/>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main p-0 m-0">
            <div class="container-fluid wrap px-0">
                <div class="container content">
                    <div id="home-welcome" class="row pt-2 mx-1 mt-5">
                        <div class="text-white my-1 mt-5 pt-4 pb-2 offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4">
                            <h1 data-cy="Home-title-text" class=" fw-bolder fs-1">Welcome to our magnetic toolbox!</h1>
                            <h1 data-cy="Home-title-text" class=" fw-bolder fs-1">What do you need?</h1>
                        </div>
                        <div class="text-white offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4">
                            <h5 data-cy="Home-title-text" class="text-white fw-light">Here you can find all the tools we currently have, grouped together by what the focus on: Cores, Wires, or full Magnetics.</h5>
                        </div>
                    </div>
            <div class="container mx-5">
                <div class="row">
                    <div class="text-white my-5 p-2 text-center col-sm-10 col-2-md col-lg-3 rounded-4">
                        <h2 class="">A complete magnetic</h2>
                        <div class="" aria-label="Group with synthesis button">
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-magnetic-specification-button" class="m-2 btn btn-primary" data-bs-toggle="modal" data-bs-target="#createOrContinueModal" @click="selectedTool = 'magneticSpecification'">Specify a magnetic</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-insulation-button" class="m-2 btn btn-primary" data-bs-toggle="modal" data-bs-target="#createOrContinueModal" @click="selectedTool = 'insulationAdviser'">Calculate insulation</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-magnetic-synthesis-button" class="m-2 btn btn-danger" data-bs-toggle="modal" data-bs-target="#createOrContinueModal" @click="selectedTool = 'magneticAdviser'">Design a magnetic <i class="fa-solid fa-fire"></i> </button>
                        </div>
                    </div>
                    <div class="text-white my-5 p-2 text-center offset-1 col-sm-10 col-3-md col-lg-3 rounded-4">
                        <h2 class="">A magnetic core</h2>
                        <div class="" aria-label="Group with core button">
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-find-cots-core-button" class="m-2 btn btn-primary" data-bs-toggle="modal" data-bs-target="#createOrContinueModal" @click="selectedTool = 'coreAdviser'">Find COTS core</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-cross-reference-core-button" class="m-2 btn btn-primary disabled">Cross reference core</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-customize-core-button" class="m-2 btn btn-primary disabled">Customize core</button>
                        </div>
                    </div>
                    <div class="text-white my-5 p-2 text-center offset-1 col-sm-10 col-3-md col-lg-3 rounded-4">
                        <h2 class="">Some wire</h2>
                        <div class="" aria-label="Group with wire button">
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-find-cots-wire-button" class="m-2 btn btn-primary disabled">Find COTS wire</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-cross-reference-wire-button" class="m-2 btn btn-primary disabled">Cross reference wire</button>
                            <button v-resize-text="{ratio: 0.7, minFontSize: '14px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-customize-wire-button" class="m-2 btn btn-primary disabled">Customize wire</button>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="text-white my-5 p-2 text-center offset-1 col-10  rounded-4">
                        <h2 class="">Old tools (soon to be integrated into other tools)</h2>
                        <div class="" aria-label="Group with old button">
                            <a href="/operation_point" v-resize-text="{ratio: 0.7, minFontSize: '20px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-old-operating-point-button" class="m-2 btn btn-primary">Create Operating Point</a>
                            <a href="/core" v-resize-text="{ratio: 0.7, minFontSize: '20px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-old-core-button" class="m-2 btn btn-primary">Create core</a>
                            <a href="/simulation" v-resize-text="{ratio: 0.7, minFontSize: '20px', maxFontSize: '20px', delay: 20}" data-cy="ToolSelection-simuation-button" class="m-2 btn btn-primary">Simulation</a>
                        </div>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
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
      background-image: linear-gradient(to bottom, rgba(26, 26, 26, 0.7), rgba(26, 26, 26, 1)),
    url('/images/background_toolbox.jpg');
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
    }

    .content {
      position: relative;
    }
</style>
