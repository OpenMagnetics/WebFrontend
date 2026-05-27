<script setup >
import { useMasStore } from '/MagneticBuilder/src/stores/mas'
import { useHistoryStore } from '/MagneticBuilder/src/stores/history'
import { useTaskQueueStore } from '../stores/taskQueue'
import { combinedStyle, combinedClass, checkAndFixMas, deepCopy } from 'WebSharedComponents/assets/js/utils.js'
import { defineAsyncComponent } from "vue";
import { useElementVisibility  } from '@vueuse/core'
import { ref } from 'vue'
import '../assets/scss/custom.scss'
</script>

<script>

const headerToggler = ref(null)
const headerTogglerIsVisible = useElementVisibility(headerToggler)

export default {
    emits: ["toolSelected"],
    components: {
        BugReporterModal: defineAsyncComponent(() => import('/src/components/User/BugReporter.vue') ),
        DeadManSwitch: defineAsyncComponent(() => import('/src/components/User/DeadManSwitch.vue') ),
        // NotificationsModal: defineAsyncComponent(() => import('/src/components/NotificationsModal.vue') ),
    },
    data() {
        const masStore = useMasStore();
        const historyStore = useHistoryStore();
        const taskQueueStore = useTaskQueueStore();
        const loading = false;
        // Grouped wizard menu — keeps the header dropdown compact by hiding
        // each topology family behind a fly-out submenu. Keys (cy, store,
        // hoverKey, icon, label) match the prior flat menu 1:1 so existing
        // tests and behaviour are unchanged.
        const wizardGroups = [
            {
                label: 'Filters / PFC',
                icon: 'bi-funnel-fill',
                items: [
                    { cy: 'Cmc-link',       store: 'CommonModeChoke',       hoverKey: 'CommonModeChoke',       icon: 'bi-funnel-fill',         label: 'CMC' },
                    { cy: 'Dmc-link', store: 'DifferentialModeChoke', hoverKey: 'DifferentialModeChoke', icon: 'bi-soundwave',           label: 'DMC' },
                    { cy: 'Pfc-link',                          store: 'Pfc',                   hoverKey: 'Pfc',                   icon: 'bi-soundwave',           label: 'PFC' },
                ],
            },
            {
                label: 'Non-Isolated DC-DC',
                icon: 'bi-arrow-down-up',
                items: [
                    { cy: 'Buck-link',                store: 'Buck',                hoverKey: 'Buck',                icon: 'bi-arrow-down',     label: 'Buck' },
                    { cy: 'Boost-link',               store: 'Boost',               hoverKey: 'Boost',               icon: 'bi-arrow-up',       label: 'Boost' },
                    { cy: 'Sepic-link',               store: 'Sepic',               hoverKey: 'Sepic',               icon: 'bi-arrow-down-up',  label: 'SEPIC' },
                    { cy: 'Cuk-link',                 store: 'Cuk',                 hoverKey: 'Cuk',                 icon: 'bi-arrow-down-up',  label: 'Cuk' },
                    { cy: 'Zeta-link',                store: 'Zeta',                hoverKey: 'Zeta',                icon: 'bi-arrow-down-up',  label: 'Zeta' },
                    { cy: 'FourSwitchBuckBoost-link', store: 'FourSwitchBuckBoost', hoverKey: 'FourSwitchBuckBoost', icon: 'bi-arrow-down-up',  label: 'Four-Switch Buck-Boost' },
                ],
            },
            {
                label: 'Isolated Forward / Flyback',
                icon: 'bi-shield-shaded',
                items: [
                    { cy: 'Flyback-link',             store: 'Flyback',             hoverKey: 'Flyback',             icon: 'bi-lightning-fill',   label: 'Flyback' },
                    { cy: 'IsolatedBuck-link',        store: 'IsolatedBuck',        hoverKey: 'IsolatedBuck',        icon: 'bi-shield-shaded',    label: 'Isolated Buck' },
                    { cy: 'IsolatedBuckBoost-link',   store: 'IsolatedBuckBoost',   hoverKey: 'IsolatedBuckBoost',   icon: 'bi-shield-exclamation', label: 'Isolated Buck-Boost' },
                    { cy: 'SingleSwitchForward-link', store: 'SingleSwitchForward', hoverKey: 'SingleSwitchForward', icon: 'bi-toggle-off',       label: 'Single-Switch Forward' },
                    { cy: 'TwoSwitchForward-link',    store: 'TwoSwitchForward',    hoverKey: 'TwoSwitchForward',    icon: 'bi-toggle-on',        label: 'Two-Switch Forward' },
                    { cy: 'ActiveClampForward-link',  store: 'ActiveClampForward',  hoverKey: 'ActiveClampForward',  icon: 'bi-fullscreen-exit',  label: 'Active Clamp Forward' },
                ],
            },
            {
                label: 'Isolated Bridge / Push-Pull',
                icon: 'bi-arrow-left-right',
                items: [
                    { cy: 'PushPull-link', store: 'PushPull',             hoverKey: 'PushPull', icon: 'bi-arrow-left-right',     label: 'Push-Pull' },
                    { cy: 'Weinberg-link', store: 'Weinberg',             hoverKey: 'Weinberg', icon: 'bi-arrow-left-right',     label: 'Weinberg' },
                    { cy: 'Psfb-link',                     store: 'PhaseShiftFullBridge', hoverKey: 'PSFB',     icon: 'bi-chevron-double-right', label: 'PSFB' },
                    { cy: 'Pshb-link',                     store: 'PhaseShiftHalfBridge', hoverKey: 'PSHB',     icon: 'bi-chevron-right',        label: 'PSHB' },
                    { cy: 'Ahb-link',                      store: 'AsymmetricHalfBridge', hoverKey: 'AHB',      icon: 'bi-arrow-bar-right',      label: 'AHB' },
                    { cy: 'Dab-link',                      store: 'DualActiveBridge',     hoverKey: 'DAB',      icon: 'bi-arrow-left-right',     label: 'DAB' },
                ],
            },
            {
                label: 'Resonant',
                icon: 'bi-soundwave',
                items: [
                    { cy: 'Llc-link',   store: 'LlcResonant',    hoverKey: 'LLC',   icon: 'bi-soundwave',        label: 'LLC' },
                    { cy: 'Cllc-link',  store: 'CllcResonant',   hoverKey: 'CLLC',  icon: 'bi-arrow-left-right', label: 'CLLC' },
                    { cy: 'Clllc-link', store: 'Clllc',          hoverKey: 'CLLLC', icon: 'bi-arrow-left-right', label: 'CLLLC' },
                    { cy: 'Src-link',   store: 'SeriesResonant', hoverKey: 'SRC',   icon: 'bi-soundwave',        label: 'SRC' },
                ],
            },
            {
                label: 'Three-Phase PFC',
                icon: 'bi-lightning-charge',
                items: [
                    { cy: 'Vienna-link', store: 'Vienna', hoverKey: 'Vienna', icon: 'bi-lightning-charge', label: 'Vienna Rectifier' },
                ],
            },
        ];
        return {
            masStore,
            historyStore,
            taskQueueStore,
            showModal: false,
            loggedIn: false,
            username: null,
            loading,
            hoveredWizard: null,
            openWizardGroup: null,
            wizardGroups,
        }
    },
    methods: {
        onShowModal() {
            this.showModal = true
        },
        async onNewPowerMagneticDesign() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);

            await this.$nextTick();
            if (this.$route.name != 'MagneticTool')
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            else {
                this.$userStore.loadingPath = `${import.meta.env.BASE_URL}magnetic_tool`;
                await this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);
            }
        },
        async onNewCommonModeChokeDesign() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.CommonModeChoke);
            this.$stateStore.selectTool("agnosticTool");

            await this.$nextTick();
            if (this.$route.name != 'MagneticTool')
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            else {
                this.$userStore.loadingPath = `${import.meta.env.BASE_URL}magnetic_tool`;
                await this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);
            }
        },
        async onHome() {
            await this.$router.push(`${import.meta.env.BASE_URL}`);
        },
        async onWizards(wizard) {
            this.$stateStore.selectWizard(wizard);
            this.openWizardGroup = null;
            await this.$nextTick();
            if (this.$route.name != 'Wizards')
                await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
            else {
                this.$userStore.loadingPath = `${import.meta.env.BASE_URL}wizards`;
                await this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);
            }
        },
        // Toggle the click-driven submenu open state. Hover still expands
        // the panel via CSS (.dropdown-submenu:hover > .submenu-panel);
        // the click path is the touch-friendly fallback and the explicit
        // signal Playwright tests use to open a group before clicking an
        // item inside.
        toggleWizardGroup(label) {
            this.openWizardGroup = this.openWizardGroup === label ? null : label;
        },
        async onInsulationCoordinator() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("insulationCoordinator");
            this.$stateStore.selectTool("insulationAdviser");

            await this.$nextTick();
            if (this.$route.name != 'InsulationAdviser')
                await this.$router.push(`${import.meta.env.BASE_URL}insulation_adviser`);
            else {
                this.$userStore.loadingPath = `${import.meta.env.BASE_URL}insulation_adviser`;
                await this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);
            }
        },
        async continueMagneticToolDesign() {
            if (this.$route.name != 'MagneticTool')
                await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
            else
                await this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);
        },
        load() {
            this.loading = true;
            this.$refs.masFileReader.click();
        },
        readMASFile(event) {
            const fr = new FileReader();

            fr.onload = async (e) => {
                const newMas = JSON.parse(e.target.result);
                if (newMas.magnetic != null) {
                    try {
                        const response = await checkAndFixMas(newMas, this.taskQueueStore);

                        // Save coil processed data that masAutocomplete may strip
                        const savedCoilData = {
                            layersDescription: response.magnetic?.coil?.layersDescription,
                            turnsDescription: response.magnetic?.coil?.turnsDescription,
                            sectionsDescription: response.magnetic?.coil?.sectionsDescription,
                        };

                        // Always autocomplete the MAS to resolve wire/strand string names to
                        // full objects and populate core processedDescription, bobbin, etc.
                        let autocompletedMas = response;
                        try {
                            autocompletedMas = await this.taskQueueStore.masAutocomplete(response, false, {});
                        } catch (autocompleteError) {
                            console.warn('masAutocomplete failed, using checkAndFixMas result:', autocompleteError);
                        }

                        // Restore coil processed data if masAutocomplete stripped it
                        if (autocompletedMas.magnetic?.coil) {
                            if (!autocompletedMas.magnetic.coil.layersDescription && savedCoilData.layersDescription) {
                                autocompletedMas.magnetic.coil.layersDescription = savedCoilData.layersDescription;
                            }
                            if (!autocompletedMas.magnetic.coil.turnsDescription && savedCoilData.turnsDescription) {
                                autocompletedMas.magnetic.coil.turnsDescription = savedCoilData.turnsDescription;
                            }
                            if (!autocompletedMas.magnetic.coil.sectionsDescription && savedCoilData.sectionsDescription) {
                                autocompletedMas.magnetic.coil.sectionsDescription = savedCoilData.sectionsDescription;
                            }
                        }

                        this.masStore.resetMas();
                        this.masStore.mas = autocompletedMas;
                        this.masStore.importedMas();

                        // Reset coil view to Basic mode when loading a new MAS file
                        this.$stateStore.closeCoilAdvancedInfo();

                        this.$stateStore.selectWorkflow("design");
                        this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
                        this.$stateStore.selectTool("magneticBuilder");
                        this.$stateStore.setCurrentToolSubsection("magneticBuilder");
                        this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                        this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
                        this.$stateStore.operatingPoints.modePerPoint = [];
                        for (let i = 0; i < this.masStore.mas.inputs.operatingPoints.length; i++) {
                            const excitation = this.masStore.mas.inputs.operatingPoints[i].excitationsPerWinding[0];
                            // Determine mode based on what data is present:
                            // - HarmonicsList: has harmonics with multiple entries (DC + at least one harmonic)
                            //   This means the user entered harmonics manually
                            // - Manual: only has waveform/processed without meaningful harmonics
                            const hasMultipleHarmonics = excitation.current?.harmonics?.amplitudes?.length > 1;

                            if (hasMultipleHarmonics) {
                                this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.HarmonicsList);
                            }
                            else {
                                this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
                            }
                        }
                        this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                        this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
                        this.$stateStore.loadingDesign = true;

                        if (this.$router.currentRoute.value.path != `${import.meta.env.BASE_URL}magnetic_tool`) {
                            this.$userStore.loadingPath = `${import.meta.env.BASE_URL}magnetic_tool`;

                            // Wait for pinia-plugin-persistedstate to write to localStorage
                            await new Promise(resolve => {
                                const unsubscribe = this.masStore.$subscribe(() => {
                                    unsubscribe();
                                    resolve();
                                }, { flush: 'sync' });
                                // Trigger a sync by touching the store
                                this.masStore.$patch({});
                            });

                            await this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);
                        }
                        else {
                            this.masStore.mas.magnetic.core = autocompletedMas.magnetic.core;
                            this.masStore.mas.magnetic.coil = autocompletedMas.magnetic.coil;
                            this.masStore.mas.magnetic.coil.functionalDescription = autocompletedMas.magnetic.coil.functionalDescription;
                        }
                    } catch (error) {
                        console.error(error);
                    } finally {
                        this.loading = false;
                    }
                } else {
                    this.loading = false;
                }
            };
            fr.readAsText(this.$refs['masFileReader'].files.item(0), "ISO-8859-1");
        },
    },
    computed: {
    },
    created() {
        if (this.$userStore.isLoggedIn.value && this.$cookies.get('username') == null) {
            this.$userStore.reset();
        }
    },
    mounted() {
        this.$settingsStore.loadingGif = "/images/loading.gif";

        const style = getComputedStyle(document.body);
        const theme = {
            primary: style.getPropertyValue('--bs-primary'),
            secondary: style.getPropertyValue('--bs-secondary'),
            success: style.getPropertyValue('--bs-success'),
            info: style.getPropertyValue('--bs-info'),
            warning: style.getPropertyValue('--bs-warning'),
            danger: style.getPropertyValue('--bs-danger'),
            light: style.getPropertyValue('--bs-light'),
            dark: style.getPropertyValue('--bs-dark'),
            white: style.getPropertyValue('--bs-white'),
            transparent: style.getPropertyValue('--bs-transparent'),
        };
        this.$styleStore.setTheme(theme);
    }
}
</script>

<template>
    <nav class="navbar navbar-expand-xl mb-1 om-header" id="header_wrapper">
        <div class="container-fluid">
            <button
                data-cy="Header-logo-home-link"
                aria-label="Visit OpenMagnetics and Tear Down the Paywalls!"
                class="btn m-0 p-0"
                @click="onHome"
            >
                <img src="/images/newLogo.png" width="60" height="40" href="/" class="d-inline-block align-top me-3" alt="OpenMagnetics Logo">
            </button>
            <button
                data-cy="Header-brand-home-link"
                class="navbar-brand btn m-0 p-0 pe-2"
                @click="onHome"
            >
                {{'OpenMagnetics'}}
            </button>
            <button
                class="navbar-toggler om-toggler"
                ref="headerToggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarNavDropdown"
                aria-controls="navbarNavDropdown"
                aria-expanded="false"
                aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNavDropdown">
                <ul class="navbar-nav text-center">
                    <li class="nav-item" >
                        <a
                            data-cy="Header-alfs-musings-link"
                            :class="headerTogglerIsVisible? '' : 'mx-1'"
                            class="nav-link om-nav-link me-3 text-center"
                            href="https://www.linkedin.com/newsletters/7026708624966135808/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {{"Alf's Musings"}}
                        </a>
                    </li>
                    <li class="nav-item">
                        <button
                            data-cy="Header-new-magnetic-link"
                            :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                            class="btn btn-block nav-link om-nav-btn border rounded px-2"
                            @click="onNewPowerMagneticDesign"
                        >
                            <i class="me-2 bi bi-briefcase-fill"></i>{{'New Magnetic'}}
                        </button>
                    </li>
                    <li class="nav-item dropdown">
                        <a
                            :class="headerTogglerIsVisible? '' : 'mx-1'"
                            class="nav-link dropdown-toggle om-nav-btn border rounded"
                            href="#"
                            role="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <i class="me-2 bi bi-briefcase-fill"></i>{{'Tools'}}
                        </a>
                      <ul class="dropdown-menu px-1">
                        <li>
                            <button
                                data-cy="Header-insulation-coordinator-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onInsulationCoordinator"
                            >
                                <i class="me-2 bi bi-lightning-charge-fill"></i>{{'Insulation Coordinator'}}
                            </button>
                        </li>
                      </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a
                            :class="headerTogglerIsVisible? '' : 'mx-1'"
                            class="nav-link dropdown-toggle om-wizard-btn border rounded"
                            href="#"
                            role="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <i class="me-2 bi bi-magic"></i>{{'Wizards'}}
                        </a>
                      <ul class="dropdown-menu px-3">
                        <li
                            v-for="group in wizardGroups"
                            :key="group.label"
                            class="dropdown-submenu"
                        >
                            <button
                                :data-cy="'WizardGroup-' + group.label.replace(/[^A-Za-z0-9]/g, '') + '-toggle'"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item dropdown-submenu-toggle btn btn-block nav-link px-2"
                                type="button"
                                @click.stop="toggleWizardGroup(group.label)"
                            >
                                <span><i class="me-2 bi" :class="group.icon"></i>{{ group.label }}</span>
                                <i class="bi bi-chevron-right submenu-caret ms-2"></i>
                            </button>
                            <ul
                                class="dropdown-menu submenu-panel px-3"
                                :class="{ 'submenu-open': openWizardGroup === group.label }"
                            >
                                <li v-for="item in group.items" :key="item.cy">
                                    <button
                                        :data-cy="item.cy"
                                        :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                        class="dropdown-item btn btn-block nav-link px-2"
                                        @click="onWizards($stateStore.Wizards[item.store])"
                                        @mouseenter="hoveredWizard = item.hoverKey"
                                        @mouseleave="hoveredWizard = null"
                                    >
                                        <i class="me-2 bi" :class="item.icon"></i>{{ item.label }}
                                    </button>
                                </li>
                            </ul>
                        </li>
                      </ul>
                    </li>
                    <li v-if="$stateStore.isAnyDesignLoaded() && $route.name != 'MagneticTool'" class="nav-item">
                        <span class="nav-item">
                            <button
                                data-cy="Header-donate-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn btn-block nav-link px-2 om-continue-btn"
                                @click="continueMagneticToolDesign"
                            >
                                <i class="me-2 bi bi-box-seam"></i>{{'Continue design'}}
                            </button>
                        </span>
                    </li>
                    <li class="nav-item">
                        <span class="nav-item">
                            <input data-cy="Header-Load-MAS-file-button" type="file" ref="masFileReader" @change="readMASFile()" class="btn mt-1 rounded-3" hidden />
                            <button
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn btn-block nav-link px-2 om-load-btn"
                                @click="load"
                            >
                                <i class="me-1 bi bi-upload"></i>{{'Load MAS'}}
                            </button>
                        </span>
                    </li>
                </ul>
                <ul class="navbar-nav ms-auto text-center">
                    <li class="nav-item">
                        <span class="nav-item">
                            <a
                                data-cy="Header-donate-link"
                                href="https://en.liberapay.com/OpenMagnetics/"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="btn nav-link om-donate-btn"
                            >
                                {{'Donate '}}<i class="bi bi-piggy-bank-fill"></i>
                            </a>
                        </span>
                    </li>
                    <li class="nav-item">
                        <span class="nav-item">
                            <button
                                data-cy="Header-report-bug-modal-button"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn nav-link om-bug-btn text-center"
                                data-bs-toggle="modal"
                                data-bs-target="#reportBugModal"
                            >
                                {{headerTogglerIsVisible? 'Report a bug' : 'Bug?'}} <i class="bi bi-bug-fill"></i>
                            </button>
                        </span>
                    </li>
                    <li class="nav-item">
                        <span class="nav-item">
                            <a
                                data-cy="Header-repository-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn nav-link om-github-btn"
                                href="https://github.com/OpenMagnetics/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {{headerTogglerIsVisible? 'GitHub ' : ''}}<i class="bi bi-github"></i>
                            </a>
                        </span>
                    </li>
                </ul>
            </div>

        </div>
    </nav>

    <!-- Modal -->
    <BugReporterModal/>
    <DeadManSwitch/>
</template>

<style>

    html {
      position: relative;
      min-height: 100%;
      padding-bottom:160px;
    }

    /* ============================================================
       Navbar shell — glass backdrop
       ============================================================ */
    .om-header {
        min-width: 100%;
        position: fixed;
        z-index: 999;
        background: linear-gradient(180deg,
            rgba(var(--bs-dark-rgb), 0.92) 0%,
            rgba(var(--bs-dark-rgb), 0.82) 100%) !important;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.35);
        box-shadow: 0 4px 18px rgba(var(--bs-black-rgb), 0.45);
    }

    /* Brand text — gradient teal */
    .om-header .navbar-brand {
        font-weight: 700;
        letter-spacing: 0.02em;
        background: linear-gradient(135deg,
            var(--bs-primary) 0%,
            color-mix(in srgb, var(--bs-primary) 70%, var(--bs-white) 30%) 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent !important;
        text-shadow: 0 1px 6px rgba(var(--bs-primary-rgb), 0.25);
    }

    /* Mobile toggler */
    .om-toggler {
        color: var(--bs-primary) !important;
        border: 1px solid rgba(var(--bs-primary-rgb), 0.5) !important;
        border-radius: 8px !important;
        padding: 0.35rem 0.5rem !important;
        filter: invert(55%) sepia(50%) saturate(400%) hue-rotate(130deg);
    }

    /* ============================================================
       Nav link (text-only, no border) — Alf's Musings style
       ============================================================ */
    .om-nav-link {
        color: rgba(var(--bs-primary-rgb), 0.8) !important;
        transition: color 0.15s !important;
        font-weight: 500;
    }
    .om-nav-link:hover {
        color: var(--bs-primary) !important;
        text-decoration: none;
    }

    /* ============================================================
       Standard nav button — teal ghost
       ============================================================ */
    .om-nav-btn {
        color: var(--bs-primary) !important;
        background: transparent !important;
        border: 1px solid rgba(var(--bs-primary-rgb), 0.35) !important;
        border-radius: 10px !important;
        font-weight: 500;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-nav-btn:hover,
    .om-nav-btn:focus {
        background: rgba(var(--bs-primary-rgb), 0.1) !important;
        border-color: rgba(var(--bs-primary-rgb), 0.6) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--bs-primary-rgb), 0.18) !important;
        color: var(--bs-primary) !important;
        filter: none !important;
    }

    /* ============================================================
       Wizards nav button — teal filled accent
       ============================================================ */
    .om-wizard-btn {
        color: var(--bs-dark) !important;
        background: rgba(var(--bs-primary-rgb), 0.85) !important;
        border: 1px solid rgba(var(--bs-primary-rgb), 0.6) !important;
        border-radius: 10px !important;
        font-weight: 600;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-wizard-btn:hover,
    .om-wizard-btn:focus {
        background: var(--bs-primary) !important;
        border-color: var(--bs-primary) !important;
        transform: translateY(-1px);
        box-shadow: 0 3px 14px rgba(var(--bs-primary-rgb), 0.35) !important;
        color: var(--bs-dark) !important;
        filter: none !important;
    }

    /* ============================================================
       Continue design button — subtle primary ghost
       ============================================================ */
    .om-continue-btn {
        color: var(--bs-primary) !important;
        background: rgba(var(--bs-primary-rgb), 0.08) !important;
        border: 1px solid rgba(var(--bs-primary-rgb), 0.4) !important;
        border-radius: 10px !important;
        font-weight: 500;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-continue-btn:hover {
        background: rgba(var(--bs-primary-rgb), 0.18) !important;
        border-color: rgba(var(--bs-primary-rgb), 0.65) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--bs-primary-rgb), 0.2) !important;
        filter: none !important;
    }

    /* ============================================================
       Load MAS button — filled primary
       ============================================================ */
    .om-load-btn {
        color: var(--bs-dark) !important;
        background: var(--bs-primary) !important;
        border: 1px solid var(--bs-primary) !important;
        border-radius: 10px !important;
        font-weight: 600;
        transition: filter 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-load-btn:hover {
        filter: brightness(1.12);
        transform: translateY(-1px);
        box-shadow: 0 3px 14px rgba(var(--bs-primary-rgb), 0.35) !important;
    }

    /* ============================================================
       Right-side utility buttons
       ============================================================ */
    .om-donate-btn {
        color: var(--bs-info) !important;
        background: rgba(var(--bs-info-rgb), 0.12) !important;
        border: 1px solid rgba(var(--bs-info-rgb), 0.4) !important;
        border-radius: 10px !important;
        font-weight: 600;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-donate-btn:hover {
        background: rgba(var(--bs-info-rgb), 0.22) !important;
        border-color: rgba(var(--bs-info-rgb), 0.65) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--bs-info-rgb), 0.22) !important;
        filter: none !important;
    }

    .om-bug-btn {
        color: var(--bs-danger) !important;
        background: rgba(var(--bs-danger-rgb), 0.08) !important;
        border: 1px solid rgba(var(--bs-danger-rgb), 0.35) !important;
        border-radius: 10px !important;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-bug-btn:hover {
        background: rgba(var(--bs-danger-rgb), 0.18) !important;
        border-color: rgba(var(--bs-danger-rgb), 0.6) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--bs-danger-rgb), 0.2) !important;
        filter: none !important;
    }

    .om-github-btn {
        color: var(--bs-success) !important;
        background: rgba(var(--bs-success-rgb), 0.08) !important;
        border: 1px solid rgba(var(--bs-success-rgb), 0.35) !important;
        border-radius: 10px !important;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-github-btn:hover {
        background: rgba(var(--bs-success-rgb), 0.18) !important;
        border-color: rgba(var(--bs-success-rgb), 0.6) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--bs-success-rgb), 0.2) !important;
        filter: none !important;
    }

    /* ============================================================
       Dropdown menu — glass panel
       ============================================================ */
    .om-header .dropdown-menu {
        background: linear-gradient(180deg,
            rgba(var(--bs-dark-rgb), 0.96) 0%,
            rgba(var(--bs-dark-rgb), 0.88) 100%) !important;
        border: 1px solid rgba(var(--bs-primary-rgb), 0.3) !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 28px rgba(var(--bs-dark-rgb), 0.55) !important;
        padding: 0.4rem !important;
    }

    .om-header .dropdown-menu .dropdown-item,
    .om-header .dropdown-menu .dropdown-item.btn,
    .om-header .dropdown-menu .dropdown-item.nav-link {
        color: var(--bs-primary) !important;
        background: transparent !important;
        border: 0 !important;
        border-radius: 8px !important;
        margin: 0.1rem 0 !important;
        transition: background 0.12s, color 0.12s !important;
    }

    .om-header .dropdown-menu .dropdown-item:hover,
    .om-header .dropdown-menu .dropdown-item.btn:hover,
    .om-header .dropdown-menu .dropdown-item.nav-link:hover {
        background: rgba(var(--bs-primary-rgb), 0.1) !important;
        color: var(--bs-primary) !important;
    }

    .om-header .dropdown-menu .dropdown-item:disabled,
    .om-header .dropdown-menu .dropdown-item.btn:disabled {
        color: rgba(var(--bs-primary-rgb), 0.35) !important;
        cursor: not-allowed;
    }

    /* Override Bootstrap dropdown CSS variables */
    .om-header .dropdown-menu {
        --bs-dropdown-link-color: var(--bs-primary) !important;
        --bs-dropdown-link-hover-color: var(--bs-primary) !important;
        --bs-dropdown-link-hover-bg: rgba(var(--bs-primary-rgb), 0.1) !important;
    }

    /* ============================================================
       Fly-out submenu for the Wizards dropdown
       ============================================================ */
    .om-header .dropdown-submenu {
        position: relative;
    }
    .om-header .dropdown-submenu-toggle {
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }
    .om-header .dropdown-submenu-toggle .submenu-caret {
        font-size: 0.75rem;
        opacity: 0.75;
        transition: transform 0.15s;
    }
    .om-header .dropdown-submenu:hover > .dropdown-submenu-toggle .submenu-caret,
    .om-header .dropdown-submenu > .submenu-panel.submenu-open ~ * .submenu-caret {
        transform: translateX(2px);
    }
    /* Hidden by default; appears on parent hover OR when .submenu-open is set */
    .om-header .submenu-panel {
        display: none;
        position: absolute;
        top: -0.4rem;          /* align with the parent item top */
        left: 100%;
        margin-left: 0;        /* no gap — gap causes hover loss mid-mouse-travel */
        padding-left: 0.25rem; /* visual offset without dead hover zone */
        min-width: 14rem;
        z-index: 1100;
    }
    .om-header .dropdown-submenu:hover > .submenu-panel,
    .om-header .submenu-panel.submenu-open {
        display: block;
    }
    /* Open top-level wizard/tool dropdown on hover — no click required */
    .om-header .nav-item.dropdown:hover > .dropdown-menu {
        display: block;
    }
    /* Mobile / collapsed-navbar: fall back to inline expansion (no flyout) */
    @media (max-width: 991.98px) {
        .om-header .submenu-panel {
            position: static;
            left: auto;
            margin-left: 0;
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            padding-left: 1rem !important;
        }
    }

    /* ============================================================
       Global app styles (not header-specific)
       ============================================================ */
    @media (max-width: 340px) {
        #title {
            display : none;
        }
    }

    body {
        background-color: var(--bs-dark) !important;
    }
    .border-dark {
        border-color: var(--bs-dark) !important;
    }
    .input-group-text{
        background-color: var(--bs-light) !important;
        color: var(--bs-white) !important;
        border-color: var(--bs-dark) !important;
    }
    .custom-select,
    .form-control {
        background-color: var(--bs-dark) !important;
        color: var(--bs-white) !important;
        border-color: var(--bs-dark) !important;
    }
    .jumbotron{
        border-radius: 1em;
        box-shadow: 0 5px 10px rgba(var(--bs-black-rgb), .2);
    }
    .card{
        padding: 1.5em .5em .5em;
        background-color: var(--bs-light);
        border-radius: 1em;
        text-align: center;
        box-shadow: 0 5px 10px rgba(var(--bs-black-rgb), .2);
    }
    .form-control:disabled {
        background-color: var(--bs-dark) !important;
        color: var(--bs-white) !important;
        border-color: var(--bs-dark) !important;
    }
    .form-control:-webkit-autofill,
    .form-control:-webkit-autofill:focus,
    .form-control:-webkit-autofill{
        -webkit-text-fill-color: var(--bs-white) !important;
        background-color: transparent !important;
        -webkit-box-shadow: 0 0 0 50px var(--bs-dark) inset;
    }

    .container {
        max-width: 100vw;
        align-items: center;
    }

    .main {
      margin-top: 60px;
    }
    ::-webkit-scrollbar { height: 3px;}
    ::-webkit-scrollbar-button {  background-color: var(--bs-light); }
    ::-webkit-scrollbar-track {  background-color: var(--bs-light);}
    ::-webkit-scrollbar-track-piece { background-color: var(--bs-dark);}
    ::-webkit-scrollbar-thumb {  background-color: var(--bs-light); border-radius: 3px;}
    ::-webkit-scrollbar-corner { background-color: var(--bs-light);}

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
        border-color: var(--bs-primary) !important;
        outline: 0  !important;
        box-shadow: none  !important;
    }
</style>
