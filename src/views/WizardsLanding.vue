<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
</script>

<script>
export default {
    methods: {
        async onCMCWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.CommonModeChoke);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onDMCWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.DifferentialModeChoke);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onFlybackWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Flyback);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onBuckWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Buck);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onBoostWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Boost);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onIsolatedBuckWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.IsolatedBuck);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onIsolatedBuckBoostWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.IsolatedBuckBoost);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onPushPullWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.PushPull);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onPfcWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Pfc);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onSingleSwitchForwardWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.SingleSwitchForward);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onTwoSwitchForwardWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.TwoSwitchForward);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onActiveClampForwardWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.ActiveClampForward);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onMagneticBuilder() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main p-0 m-0 flex-grow-1">
            <div class="container py-5">
                <!-- Header -->
                <div class="row mb-5">
                    <div class="col-12 text-center">
                        <h1 class="text-white display-4 fw-bold">Design Wizards</h1>
                        <p class="text-white fs-5 mt-3">Guided design flows for power converter magnetics</p>
                    </div>
                </div>

                <!-- Main Wizard Cards -->
                <div class="row g-4 mb-5">
                    <!-- CMC Wizard -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Common Mode Choke</h4>
                                <p class="card-text text-white small mb-3">Design CMCs for EMI filtering with impedance vs frequency targeting.</p>
                                <button @click="onCMCWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- DMC Wizard -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Differential Mode Choke</h4>
                                <p class="card-text text-white small mb-3">Design DMCs for LC filters with attenuation verification via ngspice.</p>
                                <button @click="onDMCWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Flyback Wizard -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Flyback Converter</h4>
                                <p class="card-text text-white small mb-3">Design coupled inductors for flyback converters with CCM/DCM/BCM support.</p>
                                <button @click="onFlybackWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Buck Converter -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Buck Converter</h4>
                                <p class="card-text text-white small mb-3">Design inductors for step-down DC-DC converters.</p>
                                <button @click="onBuckWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Boost Converter -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Boost Converter</h4>
                                <p class="card-text text-white small mb-3">Design inductors for step-up DC-DC converters.</p>
                                <button @click="onBoostWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Push-Pull Converter -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Push-Pull Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for push-pull topology with center-tapped primary.</p>
                                <button @click="onPushPullWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- PFC (Power Factor Correction) -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">PFC (Power Factor Correction)</h4>
                                <p class="card-text text-white small mb-3">Design boost inductors for AC-DC power factor correction stages.</p>
                                <button @click="onPfcWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Isolated Buck Converter -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Isolated Buck Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for isolated step-down converters.</p>
                                <button @click="onIsolatedBuckWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Single-Switch Forward Converter -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Single-Switch Forward Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for single-switch forward converters with reset winding.</p>
                                <button @click="onSingleSwitchForwardWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Two-Switch Forward Converter -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Two-Switch Forward Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for two-switch forward converters with clamping diodes.</p>
                                <button @click="onTwoSwitchForwardWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Active Clamp Forward Converter -->
                    <div class="col-lg-4 col-md-6">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white fw-bold mb-2">Active Clamp Forward Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for active clamp forward converters with ZVS.</p>
                                <button @click="onActiveClampForwardWizard" class="btn btn-light w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Coming Soon Section -->
                <div class="row mb-5">
                    <div class="col-12 mb-3">
                        <h3 class="text-secondary fs-5">Coming Soon</h3>
                    </div>
                    <div class="col-lg-8">
                        <div class="d-flex flex-wrap gap-3">
                            <span class="badge bg-secondary p-2">LLC Converter</span>
                            <span class="badge bg-secondary p-2">Phase-Shifted Full Bridge</span>
                            <span class="badge bg-secondary p-2">Dual Active Bridge</span>
                        </div>
                    </div>
                </div>

                <!-- Alternative Option -->
                <div class="row py-4 border-top border-secondary">
                    <div class="col-lg-6">
                        <h4 class="text-white mb-2">Need More Control?</h4>
                        <p class="text-white small mb-3">Use the Magnetic Builder to manually configure every aspect of your design.</p>
                        <button @click="onMagneticBuilder" class="btn btn-primary">
                            Open Magnetic Builder
                        </button>
                    </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>


<style scoped>
.card {
    transition: border-color 0.2s ease-in-out;
}

.card:hover {
    border-color: #6c757d !important;
}
</style>
