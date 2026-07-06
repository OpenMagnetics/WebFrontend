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
        async onSepicWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Sepic);
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
        async onDabWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.DualActiveBridge);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onLlcWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.LlcResonant);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onCllcWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.CllcResonant);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onPsfbWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.PhaseShiftFullBridge);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onPshbWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.PhaseShiftHalfBridge);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onAhbWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.AsymmetricHalfBridge);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onCukWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Cuk);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onZetaWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Zeta);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onFourSwitchBuckBoostWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.FourSwitchBuckBoost);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onWeinbergWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Weinberg);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onClllcWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Clllc);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onSrcWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.SeriesResonant);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onViennaWizard() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards.Vienna);
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
        <main role="main" class="main p-0 mx-0 mb-0 flex-grow-1">
            <div class="container py-5">
                <!-- Header -->
                <div class="row mb-5">
                    <div class="col-12 text-center">
                        <h1 class="text-white display-4 font-bold">Design Wizards</h1>
                        <p class="text-white text-xl mt-3">Guided design flows for power converter magnetics</p>
                    </div>
                </div>

                <!-- Main Wizard Cards -->
                <div class="row g-4 mb-5">
                    <!-- CMC Wizard -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Common Mode Choke</h4>
                                <p class="card-text text-white small mb-3">Design CMCs for EMI filtering with impedance vs frequency targeting.</p>
                                <button @click="onCMCWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- DMC Wizard -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Differential Mode Choke</h4>
                                <p class="card-text text-white small mb-3">Design DMCs for LC filters with attenuation verification via ngspice.</p>
                                <button @click="onDMCWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Flyback Wizard -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Flyback Converter</h4>
                                <p class="card-text text-white small mb-3">Design coupled inductors for flyback converters with CCM/DCM/BCM support.</p>
                                <button @click="onFlybackWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Buck Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Buck Converter</h4>
                                <p class="card-text text-white small mb-3">Design inductors for step-down DC-DC converters.</p>
                                <button @click="onBuckWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Boost Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Boost Converter</h4>
                                <p class="card-text text-white small mb-3">Design inductors for step-up DC-DC converters.</p>
                                <button @click="onBoostWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- SEPIC Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">SEPIC Converter</h4>
                                <p class="card-text text-white small mb-3">Non-inverting buck-boost via coupling capacitor; optional coupled inductor and synchronous rectifier.</p>
                                <button @click="onSepicWizard" class="p-button p-button-secondary w-100" data-cy="Sepic-card">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Push-Pull Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Push-Pull Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for push-pull topology with center-tapped primary.</p>
                                <button @click="onPushPullWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- PFC (Power Factor Correction) -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">PFC (Power Factor Correction)</h4>
                                <p class="card-text text-white small mb-3">Design boost inductors for AC-DC power factor correction stages.</p>
                                <button @click="onPfcWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Isolated Buck Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Isolated Buck Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for isolated step-down converters.</p>
                                <button @click="onIsolatedBuckWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Single-Switch Forward Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Single-Switch Forward Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for single-switch forward converters with reset winding.</p>
                                <button @click="onSingleSwitchForwardWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Two-Switch Forward Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Two-Switch Forward Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for two-switch forward converters with clamping diodes.</p>
                                <button @click="onTwoSwitchForwardWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Active Clamp Forward Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Active Clamp Forward Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for active clamp forward converters with ZVS.</p>
                                <button @click="onActiveClampForwardWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Isolated Buck-Boost Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Isolated Buck-Boost Converter</h4>
                                <p class="card-text text-white small mb-3">Design transformers for isolated buck-boost converters.</p>
                                <button @click="onIsolatedBuckBoostWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Dual Active Bridge (DAB) -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Dual Active Bridge</h4>
                                <p class="card-text text-white small mb-3">Bidirectional DC-DC converter with SPS/EPS/DPS/TPS modulation.</p>
                                <button @click="onDabWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- LLC Resonant Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">LLC Resonant Converter</h4>
                                <p class="card-text text-white small mb-3">Resonant DC-DC converter with variable frequency control.</p>
                                <button @click="onLlcWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- CLLC Bidirectional Resonant Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">CLLC Bidirectional Resonant Converter</h4>
                                <p class="card-text text-white small mb-3">Bidirectional resonant DC-DC converter with symmetric or asymmetric LC tanks on primary and secondary sides.</p>
                                <button @click="onCllcWizard" class="p-button p-button-secondary w-100" data-cy="Cllc-card">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Phase-Shifted Full Bridge -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Phase-Shifted Full Bridge</h4>
                                <p class="card-text text-white small mb-3">ZVS full-bridge converter with phase-shifted PWM.</p>
                                <button @click="onPsfbWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Phase-Shifted Half Bridge -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Phase-Shifted Half Bridge</h4>
                                <p class="card-text text-white small mb-3">ZVS half-bridge converter with phase-shifted PWM.</p>
                                <button @click="onPshbWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Asymmetric Half Bridge -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Asymmetric Half Bridge</h4>
                                <p class="card-text text-white small mb-3">Complementary-PWM half-bridge with DC-blocking cap; CT / FB / current-doubler / flyback rectifiers.</p>
                                <button @click="onAhbWizard" class="p-button p-button-secondary w-100">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Cuk Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Cuk Converter</h4>
                                <p class="card-text text-white small mb-3">Inverting buck-boost via coupling capacitor; continuous input and output currents.</p>
                                <button @click="onCukWizard" class="p-button p-button-secondary w-100" data-cy="Cuk-card">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Zeta Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Zeta Converter</h4>
                                <p class="card-text text-white small mb-3">Non-inverting buck-boost via coupling capacitor with continuous output current.</p>
                                <button @click="onZetaWizard" class="p-button p-button-secondary w-100" data-cy="Zeta-card">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Four-Switch Buck-Boost -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Four-Switch Buck-Boost</h4>
                                <p class="card-text text-white small mb-3">Non-inverting H-bridge buck-boost; buck, boost, or passthrough mode automatically.</p>
                                <button @click="onFourSwitchBuckBoostWizard" class="p-button p-button-secondary w-100" data-cy="FourSwitchBuckBoost-card">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Weinberg Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Weinberg Converter</h4>
                                <p class="card-text text-white small mb-3">Isolated push-pull-derived topology with center-tapped secondary and output inductor.</p>
                                <button @click="onWeinbergWizard" class="p-button p-button-secondary w-100" data-cy="Weinberg-card">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- CLLLC Resonant Converter -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">CLLLC Resonant Converter</h4>
                                <p class="card-text text-white small mb-3">Bidirectional 5-element symmetric resonant DC-DC converter.</p>
                                <button @click="onClllcWizard" class="p-button p-button-secondary w-100" data-cy="Clllc-card">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Series Resonant Converter (SRC) -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Series Resonant Converter (SRC)</h4>
                                <p class="card-text text-white small mb-3">Above-resonance LC-tank converter (no parallel Lm). HB or FB bridge; CT / FB / current-doubler rectifiers.</p>
                                <button @click="onSrcWizard" class="p-button p-button-secondary w-100" data-cy="Src-card">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Vienna Rectifier (3-phase PFC) -->
                    <div class="md:col-6 lg:col-4">
                        <div class="card h-100 bg-dark border-secondary">
                            <div class="card-body p-4">
                                <h4 class="card-title text-white font-bold mb-2">Vienna Rectifier (3-phase PFC)</h4>
                                <p class="card-text text-white small mb-3">Three-phase three-level boost PFC. Per-phase boost inductor design (Phase A shown; B/C identical by symmetry).</p>
                                <button @click="onViennaWizard" class="p-button p-button-secondary w-100" data-cy="Vienna-card">
                                    Start Wizard
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- Alternative Option -->
                <div class="row py-4 border-top border-secondary">
                    <div class="lg:col-6">
                        <h4 class="text-white mb-2">Need More Control?</h4>
                        <p class="text-white small mb-3">Use the Magnetic Builder to manually configure every aspect of your design.</p>
                        <button @click="onMagneticBuilder" class="p-button p-button-primary">
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
    border-color: var(--p-secondary) !important;
}
</style>
