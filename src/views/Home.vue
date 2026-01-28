<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'

</script>

<script>

export default {
    methods: {
        async newMagneticToolDesign() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            await this.$nextTick();
            if (this.$route.name != 'MagneticTool')
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            else
                await this.$router.go();
        },
        newMagneticToolDesignNewTab() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            const routeData = this.$router.resolve({name: 'MagneticTool'});
            window.open(routeData.href, '_blank');
        },
        async onInsulationCoordinator() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("insulationCoordinator");
            this.$stateStore.selectTool("insulationAdviser");
            await this.$nextTick();
            if (this.$route.name != 'InsulationAdviser')
                await this.$router.push(`${import.meta.env.BASE_URL}insulation_adviser`);
            else
                await this.$router.go();
        },
        onInsulationCoordinatorNewTab() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("insulationCoordinator");
            this.$stateStore.selectTool("insulationAdviser");
            const routeData = this.$router.resolve({name: 'InsulationAdviser'});
            window.open(routeData.href, '_blank');
        },
        async onWizardsLanding() {
            await this.$router.push(`${import.meta.env.BASE_URL}wizards_landing`);
        },
    },
}
</script>
<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main p-0 m-0">
            <!-- Hero Section -->
            <div class="container-fluid wrap px-0">
                <div class="container content">
                    <div id="home-welcome" class="row pt-2 mx-1 mt-5">
                        <div class="text-white my-1 mt-5 pt-4 pb-2 offset-sm-1 offset-lg-2 col-sm-10 col-lg-8 text-center rounded-4">
                            <h1 data-cy="Home-title-text" class="display-3 fw-bold" style="font-family: 'Segoe UI', Impact, sans-serif;">
                                OpenMagnetics
                            </h1>
                            <h2 class="fs-3 fw-light text-info mt-3">The Free Open-Source Platform for Magnetics Design & Simulation</h2>
                        </div>
                        <div class="text-white offset-sm-1 offset-lg-2 col-sm-10 col-lg-8 text-center rounded-4 mt-3">
                            <p class="fs-5 fw-light">We believe access to knowledge and tools is a right, not a privilege. That's why we offer the most advanced magnetics design tools for free.</p>
                        </div>
                    </div>
                    
                    <!-- Social Links -->
                    <div class="row my-4">
                        <div class="offset-lg-2 col-lg-8 d-flex justify-content-center flex-wrap gap-3">
                            <a href="https://github.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer" class="btn btn-lg text-dark bg-success border-0 shadow">
                                <i class="fa-brands fa-github me-2"></i>Star on GitHub
                            </a>
                            <a href="https://discord.gg/PFpMjYNb5c" target="_blank" rel="noopener noreferrer" class="btn btn-lg text-white border-0 shadow" style="background-color: #5865F2;">
                                <i class="fa-brands fa-discord me-2"></i>Join Discord
                            </a>
                            <a href="https://www.linkedin.com/company/openmagnetics" target="_blank" rel="noopener noreferrer" class="btn btn-lg text-white border-0 shadow" style="background-color: #0A66C2;">
                                <i class="fa-brands fa-linkedin me-2"></i>Follow on LinkedIn
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="container">
                <!-- Main Tools Section -->
                <div class="row mb-2 mt-5">
                    <div class="col-12 text-center">
                        <h2 class="text-white display-6 fw-bold"><i class="fa-solid fa-bolt text-warning me-3"></i><i class="fa-solid fa-magnet text-info me-3"></i>Magnetics Design Tools</h2>
                        <p class="text-white fs-5">Everything you need to design, simulate, and optimize magnetic components</p>
                    </div>
                </div>

                <div class="row g-4 mb-5 px-3">
                    <!-- Magnetic Builder - Featured -->
                    <div class="col-lg-8">
                        <div class="card h-100 bg-gradient border-0 shadow-lg" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);">
                            <div class="card-body p-4">
                                <div class="row h-100">
                                    <div class="col-lg-7">
                                        <div class="d-flex align-items-center mb-3">
                                            <i class="fa-solid fa-magnet fa-2x text-primary me-3"></i>
                                            <span class="badge bg-primary fs-6">Featured</span>
                                        </div>
                                        <h3 class="card-title text-white fs-2 fw-bold">Magnetic Builder</h3>
                                        <p class="card-text text-white fs-5">Build any magnetic component from scratch! Choose your core, wires, and winding configuration. Get instant simulation results including:</p>
                                        <div class="text-white fs-6">
                                            <div class="mb-1"><i class="fa-solid fa-fire text-danger me-2"></i>Core & winding losses</div>
                                            <div class="mb-1"><i class="fa-solid fa-temperature-high text-warning me-2"></i>Temperature estimation</div>
                                            <div class="mb-1"><i class="fa-solid fa-bolt text-info me-2"></i>Leakage calculation</div>
                                            <div class="mb-1"><i class="fa-solid fa-wave-square text-success me-2"></i>Parasitic capacitance</div>
                                        </div>
                                        <button @click="newMagneticToolDesign" @click.middle="newMagneticToolDesignNewTab" class="btn btn-primary btn-lg mt-3 shadow">
                                            <i class="fa-solid fa-hammer me-2"></i>Start Building
                                        </button>
                                    </div>
                                    <div class="col-lg-5 d-flex align-items-center justify-content-center">
                                        <button @click="newMagneticToolDesign" @click.middle="newMagneticToolDesignNewTab" class="btn p-0 border-0">
                                            <img class="img-fluid rounded shadow" src="/images/MagneticBuilderPreview.png" alt="Magnetic Builder Preview" style="max-height: 250px;">
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Design Wizards -->
                    <div class="col-lg-4">
                        <div class="card h-100 bg-dark border-0 shadow">
                            <div class="card-body p-4">
                                <i class="fa-solid fa-hat-wizard fa-2x text-warning mb-3"></i>
                                <h4 class="card-title text-white fw-bold">Design Wizards</h4>
                                <p class="card-text text-white">Guided design flows for power converter magnetics:</p>
                                <div class="text-white small">
                                    <div class="mb-1"><i class="fa-solid fa-check text-warning me-2"></i>Flyback, Buck, Boost converters</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-warning me-2"></i>Forward converter variants</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-warning me-2"></i>Push-Pull, Isolated Buck</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-warning me-2"></i>Common Mode Chokes</div>
                                </div>
                                <button @click="onWizardsLanding" class="btn btn-warning w-100 mt-2">
                                    <i class="fa-solid fa-wand-magic-sparkles me-2"></i>Launch Wizards
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Insulation Coordinator -->
                    <div class="col-lg-6">
                        <div class="card h-100 bg-dark border-0 shadow">
                            <div class="card-body p-4">
                                <i class="fa-solid fa-shield-halved fa-2x text-success mb-3"></i>
                                <h4 class="card-title text-white fw-bold">Insulation Coordinator</h4>
                                <p class="card-text text-white">Calculate insulation requirements for safety compliance:</p>
                                <div class="text-white small">
                                    <div class="mb-1"><i class="fa-solid fa-check text-success me-2"></i>IEC 60664</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-success me-2"></i>IEC 62368</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-success me-2"></i>IEC 61558</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-success me-2"></i>IEC 60335</div>
                                </div>
                                <button @click="onInsulationCoordinator" @click.middle="onInsulationCoordinatorNewTab" class="btn btn-success w-100 mt-2">
                                    <i class="fa-solid fa-bolt-lightning me-2"></i>Calculate Insulation
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Why Open Source -->
                    <div class="col-lg-6">
                        <div class="card h-100 bg-dark border-0 shadow">
                            <div class="card-body p-4">
                                <i class="fa-brands fa-osi fa-2x text-info mb-3"></i>
                                <h4 class="card-title text-white fw-bold">100% Open Source</h4>
                                <p class="card-text text-white">All our code is MIT licensed. You can:</p>
                                <div class="text-white small">
                                    <div class="mb-1"><i class="fa-solid fa-check text-info me-2"></i>See exactly how every calculation works</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-info me-2"></i>Run it locally on your own machine</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-info me-2"></i>Contribute improvements and new features</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-info me-2"></i>Use it in your own projects</div>
                                </div>
                                <a href="https://github.com/OpenMagnetics/" target="_blank" class="btn btn-info w-100 mt-2">
                                    <i class="fa-brands fa-github me-2"></i>View on GitHub
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Who Is It For Section -->
                <div id="home-how-whom" class="row py-5 border-top border-bottom bg-transparent">
                    <div class="col-12 text-center mb-4">
                        <h2 class="text-white display-6 fw-bold"><i class="fa-solid fa-users text-primary me-3"></i>Built For Power Electronics Engineers</h2>
                    </div>
                    
                    <div class="col-lg-4 mb-4">
                        <div class="card h-100 bg-dark border-0 shadow">
                            <div class="card-header bg-transparent border-bottom border-secondary text-center py-3">
                                <h3 class="text-white mb-0">
                                    <i class="fa-solid fa-flask text-secondary me-2"></i>Researchers
                                </h3>
                            </div>
                            <div class="card-body">
                                <div class="text-white">
                                    <div class="mb-1"><i class="fa-solid fa-check text-secondary me-2"></i>Compare your models against state of the art</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-secondary me-2"></i>Access curated datasets for model development</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-secondary me-2"></i>Contribute to a living, used platform</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-secondary me-2"></i>Validation-based community, not marketing</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4 mb-4">
                        <div class="card h-100 bg-dark border-0 shadow">
                            <div class="card-header bg-transparent border-bottom border-primary text-center py-3">
                                <h3 class="text-white mb-0">
                                    <i class="fa-solid fa-screwdriver-wrench text-primary me-2"></i>Design Engineers
                                </h3>
                            </div>
                            <div class="card-body">
                                <div class="text-white">
                                    <div class="mb-1"><i class="fa-solid fa-check text-primary me-2"></i>Latest and most accurate loss models</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-primary me-2"></i>No black boxes - see the implementation</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-primary me-2"></i>Export designs without registration</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-primary me-2"></i>All commercial parts from major vendors</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4 mb-4">
                        <div class="card h-100 bg-dark border-0 shadow">
                            <div class="card-header bg-transparent border-bottom border-info text-center py-3">
                                <h3 class="text-white mb-0">
                                    <i class="fa-solid fa-industry text-info me-2"></i>Manufacturers
                                </h3>
                            </div>
                            <div class="card-body">
                                <div class="text-white">
                                    <div class="mb-1"><i class="fa-solid fa-check text-info me-2"></i>Reduce prototyping iterations</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-info me-2"></i>Use your own stock in designs</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-info me-2"></i>Integrate your products in our database</div>
                                    <div class="mb-1"><i class="fa-solid fa-check text-info me-2"></i>Access data from all distributors</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Supported Manufacturers -->
                <div class="row py-5">
                    <div class="col-12 text-center mb-4">
                        <h2 class="text-white display-6 fw-bold"><i class="fa-solid fa-building text-warning me-3"></i>Supported Manufacturers</h2>
                        <p class="text-white fs-5">We support parts from all major magnetic component manufacturers</p>
                    </div>
                    <div class="col-12">
                        <div class="d-flex flex-wrap justify-content-center gap-3">
                            <span class="badge bg-secondary fs-6 p-2">Ferroxcube</span>
                            <span class="badge bg-secondary fs-6 p-2">TDK</span>
                            <span class="badge bg-secondary fs-6 p-2">Magnetics Inc.</span>
                            <span class="badge bg-secondary fs-6 p-2">Fair-Rite</span>
                            <span class="badge bg-secondary fs-6 p-2">Micrometals</span>
                            <span class="badge bg-secondary fs-6 p-2">DMEGC</span>
                            <span class="badge bg-secondary fs-6 p-2">Cosmo Ferrites</span>
                            <span class="badge bg-secondary fs-6 p-2">MWS Wire</span>
                            <span class="badge bg-secondary fs-6 p-2">Elektrisola</span>
                            <span class="badge bg-secondary fs-6 p-2">Rubadue</span>
                            <span class="badge bg-secondary fs-6 p-2">New England Wire</span>
                            <span class="badge bg-secondary fs-6 p-2">And each day more...</span>
                        </div>
                    </div>
                </div>

                <!-- Call to Action -->
                <div class="row py-5 mb-4">
                    <div class="col-lg-8 offset-lg-2 text-center">
                        <div class="card bg-gradient border-0 shadow-lg p-5" style="background: linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%);">
                            <h2 class="text-white display-6 fw-bold mb-3">Ready to Design?</h2>
                            <p class="text-white fs-5 mb-4">Start building your magnetic component right now. No registration required.</p>
                            <div class="d-flex justify-content-center gap-3 flex-wrap">
                                <button @click="newMagneticToolDesign" class="btn btn-primary btn-lg shadow">
                                    <i class="fa-solid fa-rocket me-2"></i>Launch Magnetic Builder
                                </button>
                                <a href="https://github.com/OpenMagnetics/" target="_blank" class="btn btn-outline-light btn-lg text-white">
                                    <i class="fa-brands fa-github me-2"></i>View Source Code
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

<style scoped>
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
    url('/images/background_home.png');
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
    }

    .content {
      position: relative;
    }

    .card {
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }

    .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
    }

    .btn {
        transition: transform 0.15s ease-in-out;
    }

    .btn:hover {
        transform: scale(1.02);
    }
</style>
