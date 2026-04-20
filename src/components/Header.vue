<script setup >
import { useMasStore } from '/MagneticBuilder/src/stores/mas'
import { useHistoryStore } from '/MagneticBuilder/src/stores/history'
import { useTaskQueueStore } from '../stores/taskQueue'
import { combinedStyle, combinedClass, checkAndFixMas, deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import { defineAsyncComponent } from "vue";
import { useElementVisibility  } from '@vueuse/core'
import { ref } from 'vue'
import '../assets/css/custom.css'
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
        return {
            masStore,
            historyStore,
            taskQueueStore,
            showModal: false,
            loggedIn: false,
            username: null,
            loading,
            hoveredWizard: null,
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
            await this.$nextTick();
            if (this.$route.name != 'Wizards')
                await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
            else {
                this.$userStore.loadingPath = `${import.meta.env.BASE_URL}wizards`;
                await this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);
            }
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
        let fontawesome = document.createElement('script')
        fontawesome.setAttribute('src', 'https://kit.fontawesome.com/d5a40d6941.js')
        document.head.appendChild(fontawesome)

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
                            <i class="me-2 fa-solid fa-toolbox"></i>{{'New Magnetic'}}
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
                            <i class="me-2 fa-solid fa-toolbox"></i>{{'Tools'}}
                        </a>
                      <ul class="dropdown-menu px-1">
                        <li>
                            <button
                                data-cy="Header-insulation-coordinator-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onInsulationCoordinator"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Insulation Coordinator'}}
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
                            <i class="me-2 fa-solid fa-hat-wizard"></i>{{'Wizards'}}
                        </a>
                      <ul class="dropdown-menu px-3">
                        <li>
                            <button
                                data-cy="Wizard-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.CommonModeChoke)"
                                @mouseenter="hoveredWizard = 'CommonModeChoke'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-filter"></i>{{'CMC Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :disabled="true"
                                data-cy="Wizard-DifferentialModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.DifferentialModeChoke)"
                                @mouseenter="hoveredWizard = 'DifferentialModeChoke'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-wave-square"></i>{{'DMC Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="Flyback-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.Flyback)"
                                @mouseenter="hoveredWizard = 'Flyback'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-bolt"></i>{{'Flyback Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="Buck-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.Buck)"
                                @mouseenter="hoveredWizard = 'Buck'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-arrow-down"></i>{{'Buck Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="Boost-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.Boost)"
                                @mouseenter="hoveredWizard = 'Boost'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-arrow-up"></i>{{'Boost Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="IsolatedBuck-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.IsolatedBuck)"
                                @mouseenter="hoveredWizard = 'IsolatedBuck'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-shield-halved"></i>{{'Isolated Buck Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="IsolatedBuckBoost-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.IsolatedBuckBoost)"
                                @mouseenter="hoveredWizard = 'IsolatedBuckBoost'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-shield-virus"></i>{{'Isolated Buck Boost Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="PushPull-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.PushPull)"
                                @mouseenter="hoveredWizard = 'PushPull'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-arrows-left-right"></i>{{'Push-Pull Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="Pfc-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.Pfc)"
                                @mouseenter="hoveredWizard = 'Pfc'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-wave-square"></i>{{'PFC Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="Dab-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.DualActiveBridge)"
                                @mouseenter="hoveredWizard = 'DAB'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-right-left"></i>{{'DAB Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="Llc-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.LlcResonant)"
                                @mouseenter="hoveredWizard = 'LLC'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-wave-square"></i>{{'LLC Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :disabled="true"
                                data-cy="Cllc-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.CllcResonant)"
                                @mouseenter="hoveredWizard = 'CLLC'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-car-battery"></i>{{'CLLC Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :disabled="true"
                                data-cy="Psfb-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.PhaseShiftFullBridge)"
                                @mouseenter="hoveredWizard = 'PSFB'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-angles-right"></i>{{'PSFB Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="ActiveClampForward-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.ActiveClampForward)"
                                @mouseenter="hoveredWizard = 'ActiveClampForward'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-compress"></i>{{'Active Clamp Forward Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="SingleSwitchForward-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.SingleSwitchForward)"
                                @mouseenter="hoveredWizard = 'SingleSwitchForward'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-toggle-off"></i>{{'Single-Switch Forward Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="TwoSwitchForward-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.TwoSwitchForward)"
                                @mouseenter="hoveredWizard = 'TwoSwitchForward'"
                                @mouseleave="hoveredWizard = null"
                            >
                                <i class="me-2 fa-solid fa-toggle-on"></i>{{'Two-Switch Forward Wizard'}}
                            </button>
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
                                <i class="me-2 fa-solid fa-box-open"></i>{{'Continue design'}}
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
                                <i class="me-1 fa-solid fa-upload"></i>{{'Load MAS'}}
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
                                {{'Donate '}}<i class="fa-solid fa-circle-dollar-to-slot"></i>
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
                                {{headerTogglerIsVisible? 'Report a bug' : 'Bug?'}} <i class="fa-solid fa-bug"></i>
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
                                {{headerTogglerIsVisible? 'GitHub ' : ''}}<i class="fa-brands fa-github"></i>
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
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
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
        box-shadow: 0 5px 10px rgba(0,0,0,.2);
    }
    .card{
        padding: 1.5em .5em .5em;
        background-color: var(--bs-light);
        border-radius: 1em;
        text-align: center;
        box-shadow: 0 5px 10px rgba(0,0,0,.2);
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
