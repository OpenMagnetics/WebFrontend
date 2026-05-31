<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'

</script>

<script>

// All wizard topologies grouped by power-electronics family. Keys match
// `state.Wizards.*` enum values so `onTopologyClick(wizard)` is a one-line
// dispatch into the existing wizard router.
const TOPOLOGY_GROUPS = [
    {
        title: 'Isolated DC-DC Converters',
        subtitle: 'Transformer-coupled bridges, flybacks and forwards',
        icon: 'bi-arrow-left-right',
        iconColor: 'text-warning',
        items: [
            { wizard: 'Flyback',                 label: 'Flyback',                 icon: 'bi-lightning-charge-fill', desc: 'Coupled inductor; CCM / DCM / BCM support.' },
            { wizard: 'SingleSwitchForward',     label: 'Single-Switch Forward',   icon: 'bi-bezier2',               desc: 'Classic single-switch forward converter.' },
            { wizard: 'TwoSwitchForward',        label: 'Two-Switch Forward',      icon: 'bi-bezier2',               desc: 'Reset via clamp diodes, no extra winding.' },
            { wizard: 'ActiveClampForward',      label: 'Active-Clamp Forward',    icon: 'bi-bezier2',               desc: 'ZVS via resonant active clamp.' },
            { wizard: 'PushPull',                label: 'Push-Pull',               icon: 'bi-arrows-expand',         desc: 'Center-tapped primary, half-period drive.' },
            { wizard: 'PhaseShiftFullBridge',    label: 'Phase-Shift Full Bridge', icon: 'bi-bounding-box-circles',  desc: 'ZVS PSFB for high-power applications.' },
            { wizard: 'PhaseShiftHalfBridge',    label: 'Phase-Shift Half Bridge', icon: 'bi-bounding-box',          desc: 'PSHB with two-switch primary.' },
            { wizard: 'AsymmetricHalfBridge',    label: 'Asymmetric Half Bridge',  icon: 'bi-asterisk',              desc: 'AHB with complementary PWM.' },
            { wizard: 'DualActiveBridge',        label: 'Dual Active Bridge',      icon: 'bi-shuffle',               desc: 'Bidirectional DAB with phase-shift control.' },
            { wizard: 'Weinberg',                label: 'Weinberg',                icon: 'bi-stars',                 desc: 'Inverse Weinberg topology for space-grade designs.' },
            { wizard: 'IsolatedBuck',            label: 'Isolated Buck',           icon: 'bi-arrow-down-circle',     desc: 'Single-switch isolated step-down.' },
            { wizard: 'IsolatedBuckBoost',       label: 'Isolated Buck-Boost',     icon: 'bi-arrow-down-up',         desc: 'Bipolar output, isolated buck-boost.' },
        ],
    },
    {
        title: 'Non-Isolated DC-DC Converters',
        subtitle: 'Inductor-based step-up / step-down topologies',
        icon: 'bi-graph-up',
        iconColor: 'text-success',
        items: [
            { wizard: 'Buck',                    label: 'Buck',                    icon: 'bi-arrow-down',            desc: 'Step-down inductor design.' },
            { wizard: 'Boost',                   label: 'Boost',                   icon: 'bi-arrow-up',              desc: 'Step-up inductor design.' },
            { wizard: 'FourSwitchBuckBoost',     label: 'Four-Switch Buck-Boost',  icon: 'bi-grid-3x3-gap-fill',     desc: 'Bidirectional 4-switch buck-boost.' },
            { wizard: 'Cuk',                     label: 'Ćuk',                     icon: 'bi-arrow-left-right',      desc: 'Inverting Cuk converter, coupled-capacitor.' },
            { wizard: 'Sepic',                   label: 'SEPIC',                   icon: 'bi-arrow-bar-up',          desc: 'Non-inverting buck-boost via coupling capacitor.' },
            { wizard: 'Zeta',                    label: 'Zeta',                    icon: 'bi-arrow-bar-down',        desc: 'Non-inverting buck-boost (Zeta).' },
        ],
    },
    {
        title: 'Resonant Converters',
        subtitle: 'LLC / LCC / SRC families with ZVS / ZCS',
        icon: 'bi-soundwave',
        iconColor: 'text-info',
        items: [
            { wizard: 'LlcResonant',             label: 'LLC Resonant',            icon: 'bi-soundwave',             desc: 'Classic LLC; gain plots and ZVS analysis.' },
            { wizard: 'CllcResonant',            label: 'CLLC Resonant',           icon: 'bi-soundwave',             desc: 'Bidirectional CLLC for energy storage.' },
            { wizard: 'Clllc',                   label: 'CLLLC Resonant',          icon: 'bi-soundwave',             desc: 'Symmetric resonant tank, isolated.' },
            { wizard: 'SeriesResonant',          label: 'Series Resonant',         icon: 'bi-soundwave',             desc: 'SRC with current-source-like behaviour.' },
        ],
    },
    {
        title: 'Filters & PFC',
        subtitle: 'Chokes, EMI filters and rectifier front-ends',
        icon: 'bi-funnel-fill',
        iconColor: 'text-primary',
        items: [
            { wizard: 'CommonModeChoke',         label: 'Common Mode Choke',       icon: 'bi-funnel-fill',           desc: 'CMC for EMI filtering, impedance-targeted.' },
            { wizard: 'DifferentialModeChoke',   label: 'Differential Mode Choke', icon: 'bi-bar-chart-steps',       desc: 'DMC + LC filter, attenuation via ngspice.' },
            { wizard: 'Pfc',                     label: 'PFC',                     icon: 'bi-plug-fill',             desc: 'Boost inductor for AC-DC PFC stages.' },
        ],
    },
];

export default {
    data() {
        return {
            topologyGroups: TOPOLOGY_GROUPS,
            topologyCount: TOPOLOGY_GROUPS.reduce((n, g) => n + g.items.length, 0),
        }
    },
    methods: {
        async onTopologyClick(wizardKey) {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards[wizardKey]);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
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
                        <div class="text-white my-1 mt-5 pt-4 pb-2 sm:col-offset-1 lg:col-offset-2 sm:col-10 lg:col-8 text-center rounded-4">
                            <h1 data-cy="Home-title-text" class="display-3 font-bold" style="font-family: 'Segoe UI', Impact, sans-serif;">
                                OpenMagnetics
                            </h1>
                            <h2 class="text-3xl font-light text-info mt-3">The Free Open-Source Platform for Magnetics Design & Simulation</h2>
                        </div>
                        <div class="text-white sm:col-offset-1 lg:col-offset-2 sm:col-10 lg:col-8 text-center rounded-4 mt-3">
                            <p class="text-xl font-light">We believe access to knowledge and tools is a right, not a privilege. That's why we offer the most advanced magnetics design tools for free.</p>
                        </div>
                    </div>
                    
                    <!-- Social Links -->
                    <div class="row my-4">
                        <div class="lg:col-offset-2 lg:col-8 d-flex justify-content-center flex-wrap gap-3">
                            <a href="https://github.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer" class="p-button p-button-lg text-dark bg-success border-0 shadow">
                                <i class="pi pi-github mr-2"></i>Star on GitHub
                            </a>
                            <a href="https://discord.gg/PFpMjYNb5c" target="_blank" rel="noopener noreferrer" class="p-button p-button-lg text-white border-0 shadow brand-discord">
                                <i class="pi pi-discord mr-2"></i>Join Discord
                            </a>
                            <a href="https://www.linkedin.com/company/openmagnetics" target="_blank" rel="noopener noreferrer" class="p-button p-button-lg text-white border-0 shadow brand-linkedin">
                                <i class="pi pi-linkedin mr-2"></i>Follow on LinkedIn
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="container">
                <!-- Main Tools Section -->
                <div class="row mb-2 mt-5">
                    <div class="col-12 text-center">
                        <h2 class="text-white display-6 font-bold"><i class="bi bi-lightning-fill text-warning me-3"></i><i class="bi bi-magnet-fill text-info me-3"></i>Magnetics Design Tools</h2>
                        <p class="text-white text-xl">Everything you need to design, simulate, and optimize magnetic components</p>
                    </div>
                </div>

                <div class="row g-4 mb-5 px-3">
                    <!-- Magnetic Builder - Featured -->
                    <div class="lg:col-8">
                        <div class="card h-100 bg-gradient border-0 shadow-lg" style="background: linear-gradient(135deg, var(--bs-dark) 0%, rgba(var(--bs-primary-rgb), 0.15) 100%);">
                            <div class="card-body pt-2 px-4 pb-4">
                                <div class="row h-100">
                                    <div class="lg:col-7">
                                        <div class="d-flex align-items-center mb-2">
                                            <i class="pi pi-cog fa-2x text-primary mr-3"></i>
                                            <span class="badge bg-primary text-base">Featured</span>
                                        </div>
                                        <h3 class="card-title text-white text-4xl font-bold">Magnetic Builder</h3>
                                        <p class="card-text text-white text-xl">Build any magnetic component from scratch! Choose your core, wires, and winding configuration. Get instant simulation results including:</p>
                                        <div class="text-white text-base">
                                            <div class="mb-1"><i class="pi pi-bolt text-danger mr-2"></i>Core & winding losses</div>
                                            <div class="mb-1"><i class="pi pi-sun text-warning mr-2"></i>Temperature simulation & thermal analysis</div>
                                            <div class="mb-1"><i class="pi pi-bolt text-info mr-2"></i>Leakage inductance (Llk) matrix</div>
                                            <div class="mb-1"><i class="pi pi-volume-up text-success mr-2"></i>Stray capacitance & parasitic analysis</div>
                                            <div class="mb-1"><i class="pi pi-microchip text-purple mr-2"></i>Equivalent circuit export (SPICE)</div>
                                        </div>
                                        <button @click="newMagneticToolDesign" @click.middle="newMagneticToolDesignNewTab" class="p-button p-button-primary btn-lg mt-3 shadow">
                                            <i class="pi pi-wrench mr-2"></i>Start Building
                                        </button>
                                    </div>
                                    <div class="lg:col-5 d-flex align-items-center justify-content-center">
                                        <button @click="newMagneticToolDesign" @click.middle="newMagneticToolDesignNewTab" class="btn p-0 border-0">
                                            <img class="img-fluid rounded shadow" src="/images/MagneticBuilderPreview.png" alt="Magnetic Builder Preview" style="max-height: 250px;">
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Design Wizards -->
                    <div class="lg:col-4">
                        <div class="card h-100 border-0 shadow home-tool-card">
                            <div class="card-body p-4">
                                <i class="pi pi-sparkles fa-2x text-primary mb-3"></i>
                                <h4 class="card-title text-white font-bold">Design Wizards</h4>
                                <p class="card-text text-white">Guided design flows for power converter magnetics:</p>
                                <div class="text-white small">
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Flyback, Buck, Boost converters</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Forward converter (Single/Two-switch/Active clamp)</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Push-Pull, Isolated Buck/Boost</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>LLC resonant converter</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>DAB, PFC, Phase-Shift Full Bridge</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Common & Differential Mode Chokes</div>
                                </div>
                                <button @click="onWizardsLanding" class="btn om-home-btn w-100 mt-2">
                                    <i class="pi pi-sparkles mr-2"></i>Launch Wizards
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Insulation Coordinator -->
                    <div class="lg:col-6">
                        <div class="card h-100 border-0 shadow home-tool-card">
                            <div class="card-body p-4">
                                <i class="pi pi-shield fa-2x text-primary mb-3"></i>
                                <h4 class="card-title text-white font-bold">Insulation Coordinator</h4>
                                <p class="card-text text-white">Calculate insulation requirements for safety compliance:</p>
                                <div class="text-white small">
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>IEC 60664</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>IEC 62368</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>IEC 61558</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>IEC 60335</div>
                                </div>
                                <button @click="onInsulationCoordinator" @click.middle="onInsulationCoordinatorNewTab" class="btn om-home-btn w-100 mt-2">
                                    <i class="pi pi-bolt-charge-fill mr-2"></i>Calculate Insulation
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- NGSpice Simulation -->
                    <div class="lg:col-6">
                        <div class="card h-100 border-0 shadow home-tool-card">
                            <div class="card-body p-4">
                                <i class="pi pi-volume-up fa-2x text-primary mb-3"></i>
                                <h4 class="card-title text-white font-bold">NGSpice Simulation</h4>
                                <p class="card-text text-white">Full circuit simulation with NGSpice:</p>
                                <div class="text-white small">
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Automated circuit netlist generation</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Simulate converter topologies</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Export magnetic subcircuits</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Waveform visualization</div>
                                </div>
                                <button @click="onWizardsLanding" class="btn om-home-btn w-100 mt-2">
                                    <i class="pi pi-bolt mr-2"></i>Run Simulation
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Equivalent Circuit -->
                    <div class="lg:col-6">
                        <div class="card h-100 border-0 shadow home-tool-card">
                            <div class="card-body p-4">
                                <i class="pi pi-sitemap fa-2x text-primary mb-3"></i>
                                <h4 class="card-title text-white font-bold">Equivalent Circuit</h4>
                                <p class="card-text text-white">Export accurate SPICE models:</p>
                                <div class="text-white small">
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>SIMBA format</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>LtSpice format</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>NgSpice format</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Temperature-dependent parameters</div>
                                </div>
                                <button @click="newMagneticToolDesign" class="btn om-home-btn w-100 mt-2">
                                    <i class="pi pi-download mr-2"></i>Export Subcircuit
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Temperature Simulation -->
                    <div class="lg:col-6">
                        <div class="card h-100 border-0 shadow home-tool-card">
                            <div class="card-body p-4">
                                <i class="pi pi-sun fa-2x text-primary mb-3"></i>
                                <h4 class="card-title text-white font-bold">Temperature Simulation</h4>
                                <p class="card-text text-white">Thermal analysis for reliable designs:</p>
                                <div class="text-white small">
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Core loss vs temperature</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Winding resistance vs temperature</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Magnetizing inductance vs temperature</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Thermal resistance modeling</div>
                                </div>
                                <button @click="newMagneticToolDesign" class="btn om-home-btn w-100 mt-2">
                                    <i class="pi pi-sun mr-2"></i>Analyze Thermal
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Why Open Source -->
                    <div class="lg:col-6">
                        <div class="card h-100 border-0 shadow home-tool-card">
                            <div class="card-body p-4">
                                <i class="pi pi-unlock text-4xl text-primary mb-3"></i>
                                <h4 class="card-title text-white font-bold">100% Open Source</h4>
                                <p class="card-text text-white">All our code is MIT licensed. You can:</p>
                                <div class="text-white small">
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>See exactly how every calculation works</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Run it locally on your own machine</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Contribute improvements and new features</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Use it in your own projects</div>
                                </div>
                                <a href="https://github.com/OpenMagnetics/" target="_blank" class="btn om-home-btn w-100 mt-2">
                                    <i class="pi pi-github mr-2"></i>View on GitHub
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ============================================================
                     Browse by Topology — direct entry to each converter wizard.
                     Cards are grouped into power-electronics families for
                     visual scanning. Icons use Bootstrap-Icons so they match
                     the rest of the brand iconography on the home page.
                     ============================================================ -->
                <div id="home-topologies" class="row mt-5 mb-3">
                    <div class="col-12 text-center">
                        <h2 class="text-white display-6 font-bold">
                            <i class="bi bi-puzzle-fill text-primary me-3"></i>Choose Your Topology
                        </h2>
                        <p class="text-white text-xl">{{ topologyCount }} guided wizards — pick the converter you're building and start in seconds.</p>
                    </div>
                </div>

                <div class="row g-4 mb-5 px-3" v-for="group in topologyGroups" :key="group.title">
                    <div class="col-12">
                        <h3 class="text-white font-bold mb-3">
                            <i :class="['bi', group.icon, group.iconColor, 'me-2']"></i>{{ group.title }}
                            <span class="text-muted text-base ms-2 fw-normal">{{ group.subtitle }}</span>
                        </h3>
                    </div>
                    <div
                        v-for="topo in group.items"
                        :key="topo.label"
                        class="md:col-6 lg:col-3"
                    >
                        <button
                            @click="onTopologyClick(topo.wizard)"
                            :data-cy="'Home-topology-' + topo.wizard + '-card'"
                            class="topology-card h-100 w-100 text-start"
                            type="button"
                        >
                            <div class="topology-card-head">
                                <i :class="['bi', topo.icon, group.iconColor]"></i>
                                <span class="topology-card-title">{{ topo.label }}</span>
                            </div>
                            <p class="topology-card-desc">{{ topo.desc }}</p>
                            <span class="topology-card-cta">
                                <i class="bi bi-arrow-right-circle-fill me-1"></i>Open wizard
                            </span>
                        </button>
                    </div>
                </div>

                <!-- Who Is It For Section -->
                <div id="home-how-whom" class="row py-5 border-top border-bottom bg-transparent">
                    <div class="col-12 text-center mb-4">
                        <h2 class="text-white display-6 font-bold"><i class="pi pi-users text-primary mr-3"></i>Built For Power Electronics Engineers</h2>
                    </div>
                    
                    <div class="lg:col-4 mb-4">
                        <div class="card h-100 border-0 shadow home-tool-card">
                            <div class="card-header bg-transparent border-bottom border-secondary text-center py-3">
                                <h3 class="text-white mb-0">
                                    <i class="pi pi-bolt text-secondary mr-2"></i>Researchers
                                </h3>
                            </div>
                            <div class="card-body">
                                <div class="text-white">
                                    <div class="mb-1"><i class="pi pi-check text-secondary mr-2"></i>Compare your models against state of the art</div>
                                    <div class="mb-1"><i class="pi pi-check text-secondary mr-2"></i>Access curated datasets for model development</div>
                                    <div class="mb-1"><i class="pi pi-check text-secondary mr-2"></i>Contribute to a living, used platform</div>
                                    <div class="mb-1"><i class="pi pi-check text-secondary mr-2"></i>Validation-based community, not marketing</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-4 mb-4">
                        <div class="card h-100 border-0 shadow home-tool-card">
                            <div class="card-header bg-transparent border-bottom border-primary text-center py-3">
                                <h3 class="text-white mb-0">
                                    <i class="pi pi-wrench text-primary mr-2"></i>Design Engineers
                                </h3>
                            </div>
                            <div class="card-body">
                                <div class="text-white">
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Latest and most accurate loss models</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>No black boxes - see the implementation</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>Export designs without registration</div>
                                    <div class="mb-1"><i class="pi pi-check text-primary mr-2"></i>All commercial parts from major vendors</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-4 mb-4">
                        <div class="card h-100 border-0 shadow home-tool-card">
                            <div class="card-header bg-transparent border-bottom border-info text-center py-3">
                                <h3 class="text-white mb-0">
                                    <i class="pi pi-building text-info mr-2"></i>Manufacturers
                                </h3>
                            </div>
                            <div class="card-body">
                                <div class="text-white">
                                    <div class="mb-1"><i class="pi pi-check text-info mr-2"></i>Reduce prototyping iterations</div>
                                    <div class="mb-1"><i class="pi pi-check text-info mr-2"></i>Use your own stock in designs</div>
                                    <div class="mb-1"><i class="pi pi-check text-info mr-2"></i>Integrate your products in our database</div>
                                    <div class="mb-1"><i class="pi pi-check text-info mr-2"></i>Access data from all distributors</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Supported Manufacturers -->
                <div class="row py-5">
                    <div class="col-12 text-center mb-4">
                        <h2 class="text-white display-6 font-bold"><i class="pi pi-building text-warning mr-3"></i>Supported Manufacturers</h2>
                        <p class="text-white text-xl">We support parts from all major magnetic component manufacturers</p>
                    </div>
                    <div class="col-12">
                        <div class="d-flex flex-wrap justify-content-center gap-3">
                            <span class="badge bg-secondary text-base p-2">Ferroxcube</span>
                            <span class="badge bg-secondary text-base p-2">TDK</span>
                            <span class="badge bg-secondary text-base p-2">Magnetics Inc.</span>
                            <span class="badge bg-secondary text-base p-2">Fair-Rite</span>
                            <span class="badge bg-secondary text-base p-2">Micrometals</span>
                            <span class="badge bg-secondary text-base p-2">DMEGC</span>
                            <span class="badge bg-secondary text-base p-2">Cosmo Ferrites</span>
                            <span class="badge bg-secondary text-base p-2">MWS Wire</span>
                            <span class="badge bg-secondary text-base p-2">Elektrisola</span>
                            <span class="badge bg-secondary text-base p-2">Rubadue</span>
                            <span class="badge bg-secondary text-base p-2">New England Wire</span>
                            <span class="badge bg-secondary text-base p-2">And each day more...</span>
                        </div>
                    </div>
                </div>

                <!-- Call to Action -->
                <div class="row py-5 mb-4">
                    <div class="lg:col-8 lg:col-offset-2 text-center">
                        <div class="card bg-gradient border-0 shadow-lg p-5" style="background: linear-gradient(135deg, rgba(var(--bs-primary-rgb), 0.2) 0%, var(--bs-dark) 100%);">
                            <h2 class="text-white display-6 font-bold mb-3">Ready to Design?</h2>
                            <p class="text-white text-xl mb-4">Start building your magnetic component right now. No registration required.</p>
                            <div class="d-flex justify-content-center gap-3 flex-wrap">
                                <button @click="newMagneticToolDesign" class="p-button p-button-primary btn-lg shadow">
                                    <i class="pi pi-send mr-2"></i>Launch Magnetic Builder
                                </button>
                                <a href="https://github.com/OpenMagnetics/" target="_blank" class="p-button p-button-outlined p-button-secondary p-button-lg text-white">
                                    <i class="pi pi-github mr-2"></i>View Source Code
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
    /* Brand colors required by external brand guidelines */
    .brand-discord { background-color: var(--brand-discord, #5865F2); }
    .brand-linkedin { background-color: var(--brand-linkedin, #0A66C2); }

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
      background-image: linear-gradient(to bottom, rgba(var(--bs-dark-rgb), 0.7), rgba(var(--bs-dark-rgb), 1)),
    url('/images/background_home.png');
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
    }

    .content {
      position: relative;
    }

    .card {
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out;
    }

    .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 40px rgba(var(--bs-black-rgb), 0.45) !important;
    }

    /* Lifted, primary-accented tool cards — match the rest of the revamped UI
       instead of the flat `bg-dark` (which renders nearly black in this theme). */
    .home-tool-card {
        background: linear-gradient(180deg,
            color-mix(in srgb, var(--bs-light) 92%, var(--bs-white) 8%) 0%,
            var(--bs-light) 100%) !important;
        border: 1px solid rgba(var(--bs-white-rgb), 0.08) !important;
        border-left: 3px solid rgba(var(--bs-primary-rgb), 0.5) !important;
        box-shadow: 0 4px 18px rgba(var(--bs-black-rgb), 0.4),
            inset 0 1px 0 rgba(var(--bs-white-rgb), 0.05) !important;
    }

    .home-tool-card:hover {
        border-color: rgba(var(--bs-white-rgb), 0.15) !important;
        border-left-color: rgba(var(--bs-primary-rgb), 0.85) !important;
    }

    .btn {
        transition: transform 0.15s ease-in-out;
    }

    .btn:hover {
        transform: scale(1.02);
    }

    /* ============================================================
       Topology cards — stylish, modern, engineering aesthetic.
       Compact tile + gradient + accented icon + clear CTA.
       ============================================================ */
    .topology-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        padding: 1rem 1.1rem 0.95rem;
        background: linear-gradient(160deg,
            color-mix(in srgb, var(--bs-light) 90%, var(--bs-white) 10%) 0%,
            var(--bs-light) 60%,
            color-mix(in srgb, var(--bs-light) 95%, var(--bs-dark) 5%) 100%);
        border: 1px solid rgba(var(--bs-white-rgb), 0.08);
        border-left: 3px solid rgba(var(--bs-primary-rgb), 0.6);
        border-radius: 12px;
        box-shadow:
            0 4px 14px rgba(var(--bs-black-rgb), 0.35),
            inset 0 1px 0 rgba(var(--bs-white-rgb), 0.05);
        color: var(--bs-white);
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        overflow: hidden;
    }

    /* Faint engineering grid behind each card to ground the design language. */
    .topology-card::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image:
            linear-gradient(to right, rgba(var(--bs-primary-rgb), 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(var(--bs-primary-rgb), 0.05) 1px, transparent 1px);
        background-size: 18px 18px;
        opacity: 0.4;
        pointer-events: none;
        z-index: 0;
    }

    .topology-card > * { position: relative; z-index: 1; }

    .topology-card:hover {
        transform: translateY(-3px);
        border-color: rgba(var(--bs-primary-rgb), 0.4);
        border-left-color: rgba(var(--bs-primary-rgb), 1);
        box-shadow:
            0 12px 32px rgba(var(--bs-black-rgb), 0.55),
            0 0 0 1px rgba(var(--bs-primary-rgb), 0.25),
            inset 0 1px 0 rgba(var(--bs-white-rgb), 0.08);
    }

    .topology-card-head {
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }

    .topology-card-head .bi {
        font-size: 1.4rem;
        filter: drop-shadow(0 0 6px rgba(var(--bs-primary-rgb), 0.35));
    }

    .topology-card-title {
        font-size: 1.05rem;
        font-weight: 700;
        letter-spacing: 0.01em;
        line-height: 1.2;
    }

    .topology-card-desc {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.4;
        color: rgba(var(--bs-white-rgb), 0.7);
        flex: 1 1 auto;
    }

    .topology-card-cta {
        font-size: 0.8rem;
        font-weight: 600;
        color: rgba(var(--bs-primary-rgb), 1);
        color: var(--bs-primary);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        opacity: 0.85;
        transition: opacity 0.18s ease, transform 0.18s ease;
    }

    .topology-card:hover .topology-card-cta {
        opacity: 1;
        transform: translateX(2px);
    }

    .topology-card-cta .bi {
        font-size: 0.95rem;
        vertical-align: -1px;
    }

    /* Group header above topology rows */
    #home-topologies + .row h3,
    .row > .col-12 > h3 {
        border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.15);
        padding-bottom: 0.5rem;
    }

    .om-home-btn {
        color: var(--bs-dark) !important;
        background: var(--bs-primary) !important;
        border: 1px solid var(--bs-primary) !important;
        font-weight: 600;
        transition: filter 0.15s, transform 0.15s, box-shadow 0.15s !important;
    }
    .om-home-btn:hover {
        filter: brightness(1.1);
        transform: translateY(-2px) scale(1.01) !important;
        box-shadow: 0 4px 16px rgba(var(--bs-primary-rgb), 0.4) !important;
    }
</style>
