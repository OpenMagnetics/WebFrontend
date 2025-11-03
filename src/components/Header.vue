<script setup >
import { useMasStore } from '/MagneticBuilder/src/stores/mas'
import { useHistoryStore } from '/MagneticBuilder/src/stores/history'
import { combinedStyle, combinedClass, checkAndFixMas } from '/WebSharedComponents/assets/js/utils.js'
import { defineAsyncComponent } from "vue";
import { useElementVisibility  } from '@vueuse/core'
import { ref } from 'vue'
import '../assets/css/custom.css'
</script>

<script>

const headerToggler = ref(null)
const headerTogglerIsVisible = useElementVisibility(headerToggler)

export default {
    components: {
        BugReporterModal: defineAsyncComponent(() => import('/src/components/User/BugReporter.vue') ),
        DeadManSwitch: defineAsyncComponent(() => import('/src/components/User/DeadManSwitch.vue') ),
        // NotificationsModal: defineAsyncComponent(() => import('/src/components/NotificationsModal.vue') ),
    },
    data() {
        const masStore = useMasStore();
        const historyStore = useHistoryStore();
        const loading = false;
        return {
            masStore,
            historyStore,
            showModal: false,
            loggedIn: false,
            username: null,
            loading,
        }
    },
    methods: {
        onShowModal() {
            this.showModal = true
        },
        onNewPowerMagneticDesign() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);

            if (this.$route.name != 'MagneticTool')
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
            else
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);}, 100);
        },
        onNewCommonModeChokeDesign() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.CommonModeChoke);
            this.$stateStore.selectTool("agnosticTool");

            if (this.$route.name != 'MagneticTool')
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
            else
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);}, 100);
        },
        onWizards(wizard) {
            this.$stateStore.selectWizard(wizard);
            if (this.$route.name != 'Wizards')
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}wizards`);}, 100);
            else
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);}, 100);
        },
        onInsulationCoordinator() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("insulationCoordinator");
            this.$stateStore.selectTool("insulationAdviser");

            if (this.$route.name != 'InsulationAdviser')
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}insulation_adviser`);}, 100);
            else
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);}, 100);
        },
        continueMagneticToolDesign() {
            if (this.$route.name != 'MagneticTool')
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);}, 100);
            else
                setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);}, 100);
        },
        load() {
            this.loading = true;
            this.$refs.masFileReader.click()
            setTimeout(() => {this.loading = false;}, 2000);
        },
        readMASFile(event) {
            const fr = new FileReader();

            fr.onload = e => {
                const newMas = JSON.parse(e.target.result);
                if (newMas.magnetic != null) {
                    checkAndFixMas(newMas, this.$mkf).then(response => {
                        console.log("Mierda 1")
                        this.masStore.mas = response;
                        this.masStore.importedMas();

                        this.$stateStore.selectWorkflow("design");
                        this.$stateStore.selectTool("agnosticTool");
                        this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
                        this.$stateStore.operatingPoints.modePerPoint = []
                        for (var i = 0; i < this.masStore.mas.inputs.operatingPoints.length; i++) {
                            if (this.masStore.mas.inputs.operatingPoints[i].excitationsPerWinding[0].current.processed != null) {
                                this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.Manual);
                            }
                            else {
                                this.$stateStore.operatingPoints.modePerPoint.push(this.$stateStore.OperatingPointsMode.HarmonicsList);
                            }
                        }
                        this.$stateStore.setCurrentToolSubsectionStatus("designRequirements", true);
                        this.$stateStore.setCurrentToolSubsectionStatus("operatingPoints", true);
                        this.$userStore.loadingPath = `${import.meta.env.BASE_URL}magnetic_tool`;
                        setTimeout(() => {this.$router.push(`${import.meta.env.BASE_URL}engine_loader`);}, 100);
                    })
                    .catch(error => {
                        console.error(error)
                    });
                }
            }
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
    <nav class="navbar navbar-expand-xl mb-1 om-header" id="header_wrapper" :style="$styleStore.header.main">
        <div class="container-fluid">
            <a data-cy="Header-logo-home-link" href="/" aria-label="Visit OpenMagnetics and Tear Down the Paywalls!">
                <img src="/images/logo.svg" width="60" height="40" href="/" class="d-inline-block align-top me-3" alt="OpenMagnetics Logo">
            </a>
            <a
                :style="$styleStore.header.title"
                data-cy="Header-brand-home-link"
                class="navbar-brand"
                href="/"
            >
                {{'OpenMagnetics'}}
            </a>
            <button
                :style="$styleStore.header.collapsedButton"
                class="navbar-toggler"
                ref="headerToggler"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#navbarNavDropdown"
                aria-controls="navbarNavDropdown"
                aria-expanded="false"
                aria-label="Toggle navigation">
            <span class="navbar-toggler-icon text-white"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNavDropdown">
                <ul class="navbar-nav text-center">
                    <li class="nav-item" >
                        <a 
                            :style="$styleStore.header.musings"
                            data-cy="Header-alfs-musings-link"
                            :class="headerTogglerIsVisible? '' : 'mx-1'"
                            class="nav-link me-3 text-center"
                            href="https://www.linkedin.com/newsletters/7026708624966135808/"
                            target="_blank"
                        >
                            {{"Alf's Musings"}}
                        </a>
                    </li>
                    {{combinedClass([$styleStore.header.designSectionDropdown])}}
                    <li class="nav-item dropdown">
                        <a 
                            :style="$styleStore.header.designSectionDropdown"
                            :class="combinedClass([$styleStore.header.designSectionDropdown])"
                            class="nav-link dropdown-toggle border rounded"
                            href="#"
                            role="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <i class="me-2 fa-solid fa-square-plus"></i>{{'New Design'}}
                        </a>
                        <ul class="dropdown-menu px-1" :style="$styleStore.header.designSectionDropdown">
                            <li>
                                <button
                                    :style="$styleStore.header.designSectionDropdown"
                                    data-cy="Header-new-magnetic-link"
                                    :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                    class="dropdown-item btn btn-block   nav-link px-2"
                                    @click="onNewCommonModeChokeDesign"
                                >
                                    <i class="me-2 fa-solid fa-filter"></i>{{'New CMC'}}
                                </button>
                            </li>
                            <li>
                                <button
                                    :style="$styleStore.header.designSectionDropdown"
                                    data-cy="Header-new-magnetic-link"
                                    :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                    class="dropdown-item btn btn-block   nav-link px-2"
                                    @click="onNewPowerMagneticDesign"
                                >
                                    <i class="me-2 fa-solid fa-toolbox"></i>{{'New Magnetic'}}
                                </button>
                            </li>
                            <!-- <li><hr class="dropdown-divider"></li> -->
                        </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a
                            :style="$styleStore.header.othersSectionDropdown"
                            :class="headerTogglerIsVisible? '' : 'mx-1'"
                            class="nav-link dropdown-toggle border rounded"
                            href="#"
                            role="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <i class="me-2 fa-solid fa-toolbox"></i>{{'Tools'}}
                        </a>
                      <ul class="dropdown-menu px-1" :style="$styleStore.header.othersSectionDropdown">
                        <li>
                            <button
                                :style="$styleStore.header.designSectionDropdown"
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
                            :style="$styleStore.header.wizardsSectionButton"
                            :class="headerTogglerIsVisible? '' : 'mx-1'"
                            class="nav-link dropdown-toggle border rounded"
                            href="#"
                            role="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            <i class="me-2 fa-solid fa-hat-wizard"></i>{{'Wizards'}}
                        </a>
                      <ul class="dropdown-menu px-3" :style="$styleStore.header.wizardsSectionDropdown">
                        <li>
                            <button
                                :style="$styleStore.header.wizardButton"
                                data-cy="Wizard-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.CommonModeChoke)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'CMC Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :style="$styleStore.header.wizardButton"
                                data-cy="Flyback-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.Flyback)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Flyback Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :style="$styleStore.header.newWizardButton"
                                data-cy="Buck-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.Buck)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Buck Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :style="$styleStore.header.newWizardButton"
                                data-cy="Boost-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.Boost)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Boost Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :style="$styleStore.header.newWizardButton"
                                data-cy="IsolatedBuck-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.IsolatedBuck)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Isolated Buck Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :style="$styleStore.header.newWizardButton"
                                data-cy="IsolatedBuckBoost-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.IsolatedBuckBoost)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Isolated Buck Boost Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :style="$styleStore.header.newWizardButton"
                                data-cy="PushPull-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.PushPull)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Push-Pull Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :style="$styleStore.header.newWizardButton"
                                data-cy="ActiveClampForward-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.ActiveClampForward)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Active Clamp Forward Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :style="$styleStore.header.newWizardButton"
                                data-cy="SingleSwitchForward-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.SingleSwitchForward)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Single-Switch Forward Wizard'}}
                            </button>
                        </li>
                        <li>
                            <button
                                :style="$styleStore.header.newWizardButton"
                                data-cy="TwoSwitchForward-CommonModeChoke-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item btn btn-block nav-link px-2"
                                @click="onWizards($stateStore.Wizards.TwoSwitchForward)"
                            >
                                <i class="me-2 fa-solid fa-bolt-lightning"></i>{{'Two-Switch Forward Wizard'}}
                            </button>
                        </li>
                      </ul>
                    </li>
                    <li v-if="$stateStore.isAnyDesignLoaded() && $route.name != 'MagneticTool'" class="nav-item">
                        <span class="nav-item">
                            <button
                                :style="$styleStore.header.continueDesignButton"
                                data-cy="Header-donate-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn btn-block nav-link px-2"
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
                                :style="$styleStore.header.loadMasButton"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn btn-block nav-link px-2"
                                @click="load"
                            >
                                {{'Load MAS'}}
                            </button>
                        </span>
                    </li>
                </ul>
                <ul class="navbar-nav ms-auto text-center">
                    <li class="nav-item">
                        <span class="nav-item">
                            <a
                                :style="$styleStore.header.donateButton"
                                data-cy="Header-donate-link"
                                href="https://en.liberapay.com/OpenMagnetics/"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="btn nav-link text-dark bg-info border-dark"
                            >
                                {{'Donate '}}<i class="fa-solid fa-circle-dollar-to-slot"></i></a>
                        </span>
                    </li>
                    <li class="nav-item">
                        <span class="nav-item">
                            <button
                                :style="$styleStore.header.bugButton"
                                data-cy="Header-report-bug-modal-button"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn nav-link text-danger border-dark text-center"
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
                                :style="$styleStore.header.githubButton"
                                data-cy="Header-repository-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn nav-link text-success border-dark"
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

    .om-header {
        min-width: 100%;
        position: fixed;
        z-index: 999;
    }


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
