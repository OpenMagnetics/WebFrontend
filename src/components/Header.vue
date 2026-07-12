<script setup >
import { useMasStore } from '/MagneticBuilder/src/stores/mas'
import { useHistoryStore } from '/MagneticBuilder/src/stores/history'
import { useTaskQueueStore } from '../stores/taskQueue'
import { useAuthStore } from '../stores/auth'
import { useCloudDesignStore } from '../stores/cloudDesign'
import { loadMasIntoApp } from '../services/loadMasIntoApp'
import { defineAsyncComponent } from "vue";
import { useElementVisibility  } from '@vueuse/core'
import { ref } from 'vue'
import { startTourForContext } from '../tours'
import '../assets/scss/custom.scss'
</script>

<script>

const headerToggler = ref(null)
const headerTogglerIsVisible = useElementVisibility(headerToggler)

export default {
    emits: ["toolSelected"],
    components: {
        BugReporterModal: defineAsyncComponent(() => import('/src/components/User/BugReporter.vue') ),
        AccountModal: defineAsyncComponent(() => import('/src/components/User/AccountModal.vue') ),
    },
    data() {
        const masStore = useMasStore();
        const historyStore = useHistoryStore();
        const taskQueueStore = useTaskQueueStore();
        const authStore = useAuthStore();
        const cloudDesignStore = useCloudDesignStore();
        const loading = false;
        const bugReporterVisible = false;
        const accountModalVisible = false;
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
            authStore,
            cloudDesignStore,
            loading,
            bugReporterVisible,
            accountModalVisible,
            savingToCloud: false,
            hoveredWizard: null,
            openWizardGroup: null,
            wizardGroups,
            navCollapseOpen: false,
            openDropdown: null,
            helpPulse: localStorage.getItem('omHelpTourSeen') == null,
        }
    },
    methods: {
        toggleDropdown(key) { this.openDropdown = this.openDropdown === key ? null : key; },
        async startHelpTour() {
            localStorage.setItem('omHelpTourSeen', '1');
            this.helpPulse = false;
            this.openDropdown = null;
            // On narrow screens the nav items live inside the hamburger menu;
            // expand it so the tour can highlight them.
            if (headerTogglerIsVisible.value) {
                this.navCollapseOpen = true;
                await this.$nextTick();
            }
            startTourForContext(this.$route.name, this.$stateStore);
        },
        closeDropdowns() { this.openDropdown = null; this.navCollapseOpen = false; },
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
        async onCoreStudio() {
            if (this.$route.name != 'CoreStudio')
                await this.$router.push(`${import.meta.env.BASE_URL}core_studio`);
        },
        async continueMagneticToolDesign() {
            // ABT #161: restore a valid Magnetic-Tool workflow/tool before
            // navigating. Flows like the Insulation Coordinator (and the
            // Magnetic Viewer) leave selectedWorkflow pointing at a workflow
            // that has no magneticBuilder tool. GenericTool then resolves
            // getCurrentToolState() = toolboxStates[workflow][magneticBuilder]
            // to undefined and renders a blank page. If the current workflow
            // can host the magnetic builder, keep the user's in-progress
            // context; otherwise fall back to the design workflow deterministically.
            const workflow = this.$stateStore.selectedWorkflow;
            const workflowState = this.$stateStore.toolboxStates[workflow];
            if (!workflowState || !workflowState.magneticBuilder) {
                this.$stateStore.selectWorkflow("design");
            }
            this.$stateStore.selectTool("magneticBuilder");

            await this.$nextTick();
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
                        // A file import is a new working design, not the linked cloud one.
                        this.cloudDesignStore.unlink();
                        await loadMasIntoApp(newMas, {
                            masStore: this.masStore,
                            stateStore: this.$stateStore,
                            userStore: this.$userStore,
                            taskQueueStore: this.taskQueueStore,
                            router: this.$router,
                            route: this.$router.currentRoute.value,
                        });
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
        onLoggedIn() {
            // Post-login hook: settings sync starts lazily from main.js watcher.
        },
        async signOut() {
            try {
                await this.authStore.logout();
            } catch (error) {
                console.error("Logout failed:", error);
            }
            this.cloudDesignStore.unlink();
            this.openDropdown = null;
        },
        async saveCurrentDesignToCloud() {
            // Quick-save from the header: updates the linked design, or sends
            // the user to My Designs to name a new one.
            if (!this.cloudDesignStore.isLinked) {
                await this.$router.push(`${import.meta.env.BASE_URL}designs`);
                return;
            }
            this.savingToCloud = true;
            try {
                await this.cloudDesignStore.save(this.masStore.mas, null);
            } catch (error) {
                if (error.response?.status === 409) {
                    const current = error.response.data.detail.current_version;
                    if (window.confirm(`This design was modified elsewhere (now at version ${current}). Overwrite it with your local copy?`)) {
                        await this.cloudDesignStore.overwrite(this.masStore.mas);
                    }
                }
                else {
                    console.error("Cloud save failed:", error);
                    window.alert("Could not save to your account: " + (error.response?.data?.detail || error.message));
                }
            } finally {
                this.savingToCloud = false;
            }
        },
    },
    computed: {
    },
    mounted() {
        this.$settingsStore.loadingGif = "/images/loading.gif";

        const style = getComputedStyle(document.body);
        const theme = {
            primary: style.getPropertyValue('--p-primary'),
            secondary: style.getPropertyValue('--p-secondary'),
            success: style.getPropertyValue('--p-success'),
            info: style.getPropertyValue('--p-info'),
            warning: style.getPropertyValue('--p-warning'),
            danger: style.getPropertyValue('--p-danger'),
            light: style.getPropertyValue('--p-light'),
            dark: style.getPropertyValue('--p-dark'),
            white: style.getPropertyValue('--p-white'),
            transparent: style.getPropertyValue('--p-transparent'),
        };
        this.$styleStore.setTheme(theme);

        this._closeDropdownsBound = this.closeDropdowns.bind(this);
        document.addEventListener('click', this._closeDropdownsBound);
    },
    beforeUnmount() {
        if (this._closeDropdownsBound) document.removeEventListener('click', this._closeDropdownsBound);
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
                <img src="/images/newLogo.png" class="om-logo d-inline-block align-top me-2" alt="OpenMagnetics Logo">
            </button>
            <button
                data-cy="Header-brand-home-link"
                class="navbar-brand btn m-0 p-0 pr-2"
                @click="onHome"
            >
                {{'OpenMagnetics'}}
            </button>
            <button
                class="navbar-toggler om-toggler"
                ref="headerToggler"
                type="button"
                @click="navCollapseOpen = !navCollapseOpen"
                aria-controls="navbarNavDropdown"
                :aria-expanded="navCollapseOpen ? 'true' : 'false'"
                aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" :class="{ show: navCollapseOpen }" id="navbarNavDropdown">
                <ul class="navbar-nav text-center">
                    <li class="nav-item" >
                        <a
                            data-cy="Header-alfs-musings-link"
                            :class="headerTogglerIsVisible? '' : 'mx-1'"
                            class="nav-link om-nav-link mr-3 text-center"
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
                            class="nav-link w-100 om-nav-btn border rounded px-2"
                            @click="onNewPowerMagneticDesign"
                        >
                            <i class="mr-2 pi pi-briefcase"></i>{{'New Magnetic'}}
                        </button>
                    </li>
                    <li class="nav-item dropdown" @click.stop>
                        <a
                            :class="headerTogglerIsVisible? '' : 'mx-1'"
                            class="nav-link dropdown-toggle om-nav-btn border rounded"
                            href="#"
                            role="button"
                            @click.prevent="toggleDropdown('tools')"
                            :aria-expanded="openDropdown === 'tools' ? 'true' : 'false'"
                        >
                            <i class="mr-2 pi pi-briefcase"></i>{{'Tools'}}
                        </a>
                      <ul class="dropdown-menu px-1" :class="{ show: openDropdown === 'tools' }">
                        <li>
                            <button
                                data-cy="Header-insulation-coordinator-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="dropdown-item nav-link w-100 px-2"
                                @click="onInsulationCoordinator"
                            >
                                <i class="mr-2 pi pi-bolt-charge-fill"></i>{{'Insulation Coordinator'}}
                            </button>
                        </li>
                        <li>
                            <button
                                data-cy="Header-core-studio-link"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="dropdown-item nav-link w-100 px-2"
                                @click="onCoreStudio"
                            >
                                <i class="mr-2 pi pi-wrench"></i>{{'Core Studio'}}
                            </button>
                        </li>
                      </ul>
                    </li>
                    <li class="nav-item dropdown" @click.stop>
                        <a
                            :class="headerTogglerIsVisible? '' : 'mx-1'"
                            class="nav-link dropdown-toggle om-wizard-btn border rounded"
                            href="#"
                            role="button"
                            @click.prevent="toggleDropdown('wizards')"
                            :aria-expanded="openDropdown === 'wizards' ? 'true' : 'false'"
                        >
                            <i class="mr-2 pi pi-sparkles"></i>{{'Wizards'}}
                        </a>
                      <ul class="dropdown-menu px-3" :class="{ show: openDropdown === 'wizards' }">
                        <li
                            v-for="group in wizardGroups"
                            :key="group.label"
                            class="dropdown-submenu"
                        >
                            <button
                                :data-cy="'WizardGroup-' + group.label.replace(/[^A-Za-z0-9]/g, '') + '-toggle'"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                class="dropdown-item dropdown-submenu-toggle nav-link w-100 px-2"
                                type="button"
                                @click.stop="toggleWizardGroup(group.label)"
                            >
                                <span><i class="mr-2 bi" :class="group.icon"></i>{{ group.label }}</span>
                                <i class="pi pi-chevron-right submenu-caret ml-2"></i>
                            </button>
                            <ul
                                class="dropdown-menu submenu-panel px-3"
                                :class="{ 'submenu-open': openWizardGroup === group.label }"
                            >
                                <li v-for="item in group.items" :key="item.cy">
                                    <button
                                        :data-cy="item.cy"
                                        :class="headerTogglerIsVisible? 'w-100' : 'mx-0' "
                                        class="dropdown-item nav-link w-100 px-2"
                                        @click="onWizards($stateStore.Wizards[item.store])"
                                        @mouseenter="hoveredWizard = item.hoverKey"
                                        @mouseleave="hoveredWizard = null"
                                    >
                                        <i class="mr-2 bi" :class="item.icon"></i>{{ item.label }}
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
                                class="nav-link w-100 px-2 om-continue-btn"
                                @click="continueMagneticToolDesign"
                            >
                                <i class="mr-2 pi pi-box-seam"></i>{{'Continue design'}}
                            </button>
                        </span>
                    </li>
                    <li class="nav-item">
                        <span class="nav-item">
                            <input data-cy="Header-Load-MAS-file-button" type="file" ref="masFileReader" @change="readMASFile()" class="btn mt-1 rounded-3" hidden />
                            <button
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="nav-link w-100 px-2 om-load-btn"
                                @click="load"
                            >
                                <i class="mr-1 pi pi-upload"></i>{{'Load MAS'}}
                            </button>
                        </span>
                    </li>
                </ul>
                <ul class="navbar-nav ms-auto text-center">
                    <li v-if="!authStore.isLoggedIn" class="nav-item">
                        <span class="nav-item">
                            <button
                                data-cy="Header-sign-in-button"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn nav-link om-signin-btn text-center"
                                title="Optional account: cloud-saved designs"
                                @click="accountModalVisible = true"
                            >
                                {{'Sign in '}}<i class="pi pi-user"></i>
                            </button>
                        </span>
                    </li>
                    <li v-else class="nav-item dropdown" @click.stop>
                        <button
                            data-cy="Header-account-menu-button"
                            :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                            class="btn nav-link om-account-btn text-center dropdown-toggle"
                            @click="toggleDropdown('account')"
                        >
                            <i class="pi pi-user mr-1"></i>{{ authStore.user.display_name }}
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end" :class="{ show: openDropdown === 'account' }">
                            <li v-if="$stateStore.isAnyDesignLoaded()">
                                <button
                                    data-cy="Header-save-design-button"
                                    class="dropdown-item nav-link w-100 px-2"
                                    :disabled="savingToCloud"
                                    @click="saveCurrentDesignToCloud"
                                >
                                    <i class="mr-2 pi" :class="savingToCloud ? 'pi-refresh fa-spin' : 'pi-save'"></i>
                                    {{ cloudDesignStore.isLinked ? `Save "${cloudDesignStore.name}"` : 'Save design to account' }}
                                </button>
                            </li>
                            <li>
                                <router-link
                                    data-cy="Header-my-designs-link"
                                    class="dropdown-item nav-link w-100 px-2"
                                    to="/designs"
                                    @click="openDropdown = null"
                                >
                                    <i class="mr-2 pi pi-cloud"></i>My designs
                                </router-link>
                            </li>
                            <li>
                                <router-link
                                    data-cy="Header-my-inventory-link"
                                    class="dropdown-item nav-link w-100 px-2"
                                    to="/inventory"
                                    @click="openDropdown = null"
                                >
                                    <i class="mr-2 pi pi-box"></i>My inventory
                                </router-link>
                            </li>
                            <li>
                                <router-link
                                    data-cy="Header-orgs-link"
                                    class="dropdown-item nav-link w-100 px-2"
                                    to="/orgs"
                                    @click="openDropdown = null"
                                >
                                    <i class="mr-2 pi pi-building"></i>Organizations
                                </router-link>
                            </li>
                            <li>
                                <router-link
                                    data-cy="Header-account-link"
                                    class="dropdown-item nav-link w-100 px-2"
                                    to="/account"
                                    @click="openDropdown = null"
                                >
                                    <i class="mr-2 pi pi-cog"></i>Account
                                </router-link>
                            </li>
                            <li>
                                <button
                                    data-cy="Header-sign-out-button"
                                    class="dropdown-item nav-link w-100 px-2"
                                    @click="signOut"
                                >
                                    <i class="mr-2 pi pi-sign-out"></i>Sign out
                                </button>
                            </li>
                        </ul>
                    </li>
                    <li class="nav-item">
                        <span class="nav-item">
                            <button
                                data-cy="Header-help-tour-button"
                                :class="[headerTogglerIsVisible? 'w-100' : 'mx-1', helpPulse? 'om-help-pulse' : '']"
                                class="btn nav-link om-help-btn text-center"
                                title="Interactive tour of this page"
                                @click="startHelpTour"
                            >
                                {{headerTogglerIsVisible? 'Page tour' : 'Help'}} <i class="pi pi-question-circle"></i>
                            </button>
                        </span>
                    </li>
                    <li class="nav-item">
                        <span class="nav-item">
                            <a
                                data-cy="Header-donate-link"
                                href="https://en.liberapay.com/OpenMagnetics/"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="btn nav-link om-donate-btn"
                            >
                                {{'Donate '}}<i class="pi pi-dollar"></i>
                            </a>
                        </span>
                    </li>
                    <li class="nav-item">
                        <span class="nav-item">
                            <button
                                data-cy="Header-report-bug-modal-button"
                                :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                                class="btn nav-link om-bug-btn text-center"
                                @click="bugReporterVisible = true"
                            >
                                {{headerTogglerIsVisible? 'Report a bug' : 'Bug?'}} <i class="pi pi-server"></i>
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
                                {{headerTogglerIsVisible? 'GitHub ' : ''}}<i class="pi pi-github"></i>
                            </a>
                        </span>
                    </li>
                </ul>
            </div>

        </div>
    </nav>

    <!-- Modal -->
    <BugReporterModal v-model:visible="bugReporterVisible"/>
    <AccountModal v-model:visible="accountModalVisible" @logged-in="onLoggedIn"/>
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
        top: 0;
        left: 0;
        right: 0;
        z-index: 999;
        padding: 0.2rem 1rem;
        background:
            linear-gradient(180deg,
                rgba(var(--p-dark-rgb), 0.94) 0%,
                rgba(var(--p-dark-rgb), 0.86) 100%),
            radial-gradient(circle at 0% 0%,
                rgba(var(--p-primary-rgb), 0.12) 0%,
                transparent 50%) !important;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(var(--p-primary-rgb), 0.25);
        box-shadow:
            0 4px 24px rgba(var(--p-black-rgb), 0.5),
            0 0 0 1px rgba(var(--p-white-rgb), 0.02) inset;
    }

    /* Subtle engineering grid behind the header */
    .om-header::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image:
            linear-gradient(to right, rgba(var(--p-primary-rgb), 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(var(--p-primary-rgb), 0.06) 1px, transparent 1px);
        background-size: 24px 24px;
        opacity: 0.5;
        pointer-events: none;
    }
    .om-header > * { position: relative; z-index: 1; }

    /* Logo — preserve aspect ratio, sized to keep header at beta's ~59px
     * height; no drop-shadow so it blends into the header background. */
    .om-logo {
        width: auto;
        height: 44px;
        object-fit: contain;
        mix-blend-mode: lighten;
    }

    /* Breathing room between header nav items at desktop. */
    @media (min-width: 1200px) {
        .om-header .navbar-nav > .nav-item + .nav-item {
            margin-left: 0.75rem;
        }
        .om-header .navbar-nav.ms-auto > .nav-item + .nav-item {
            margin-left: 0.5rem;
        }
    }
    .om-header .navbar-nav .nav-item .nav-link,
    .om-header .navbar-nav .nav-item .om-nav-btn,
    .om-header .navbar-nav .nav-item .om-wizard-btn,
    .om-header .navbar-nav .nav-item .om-continue-btn,
    .om-header .navbar-nav .nav-item .om-load-btn {
        padding-left: 0.85rem;
        padding-right: 0.85rem;
        font-size: 1.05rem;
    }
    .om-header .navbar-brand { font-size: 1.25rem !important; }

    /* Brand text — gradient teal, modern tracking */
    .om-header .navbar-brand {
        font-weight: 700;
        font-size: 1.15rem;
        letter-spacing: 0.04em;
        line-height: 1.1;
        padding: 0.25rem 0.5rem 0.25rem 0;
        background: linear-gradient(135deg,
            var(--p-primary) 0%,
            color-mix(in srgb, var(--p-primary) 65%, var(--p-white) 35%) 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent !important;
        text-shadow: 0 1px 6px rgba(var(--p-primary-rgb), 0.25);
    }

    /* Mobile toggler */
    .om-toggler {
        color: var(--p-primary) !important;
        border: 1px solid rgba(var(--p-primary-rgb), 0.5) !important;
        border-radius: 8px !important;
        padding: 0.35rem 0.5rem !important;
        filter: invert(55%) sepia(50%) saturate(400%) hue-rotate(130deg);
    }

    /* ============================================================
       Nav link (text-only, no border) — Alf's Musings style
       ============================================================ */
    .om-nav-link {
        color: rgba(var(--p-primary-rgb), 0.8) !important;
        transition: color 0.15s !important;
        font-weight: 500;
    }
    .om-nav-link:hover {
        color: var(--p-primary) !important;
        text-decoration: none;
    }

    /* ============================================================
       Standard nav button — teal ghost
       ============================================================ */
    .om-nav-btn {
        color: var(--p-primary) !important;
        background: transparent !important;
        border: 1px solid rgba(var(--p-primary-rgb), 0.35) !important;
        border-radius: 10px !important;
        font-weight: 500;
        /* New Magnetic is a <button> (others are <a>); buttons default to the
         * arrow cursor, so force the pointer to match the link items. */
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-nav-btn:hover,
    .om-nav-btn:focus {
        background: rgba(var(--p-primary-rgb), 0.1) !important;
        border-color: rgba(var(--p-primary-rgb), 0.6) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--p-primary-rgb), 0.18) !important;
        color: var(--p-primary) !important;
        filter: none !important;
    }

    /* ============================================================
       Wizards nav button — teal filled accent
       ============================================================ */
    .om-wizard-btn {
        color: var(--p-dark) !important;
        background: rgba(var(--p-primary-rgb), 0.85) !important;
        border: 1px solid rgba(var(--p-primary-rgb), 0.6) !important;
        border-radius: 10px !important;
        font-weight: 600;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-wizard-btn:hover,
    .om-wizard-btn:focus {
        background: var(--p-primary) !important;
        border-color: var(--p-primary) !important;
        transform: translateY(-1px);
        box-shadow: 0 3px 14px rgba(var(--p-primary-rgb), 0.35) !important;
        color: var(--p-dark) !important;
        filter: none !important;
    }

    /* ============================================================
       Continue design button — subtle primary ghost
       ============================================================ */
    .om-continue-btn {
        color: var(--p-primary) !important;
        background: rgba(var(--p-primary-rgb), 0.08) !important;
        border: 1px solid rgba(var(--p-primary-rgb), 0.4) !important;
        border-radius: 10px !important;
        font-weight: 500;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-continue-btn:hover {
        background: rgba(var(--p-primary-rgb), 0.18) !important;
        border-color: rgba(var(--p-primary-rgb), 0.65) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--p-primary-rgb), 0.2) !important;
        filter: none !important;
    }

    /* ============================================================
       Load MAS button — filled primary
       ============================================================ */
    .om-load-btn {
        color: var(--p-dark) !important;
        background: var(--p-primary) !important;
        border: 1px solid var(--p-primary) !important;
        border-radius: 10px !important;
        font-weight: 600;
        transition: filter 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-load-btn:hover {
        filter: brightness(1.12);
        transform: translateY(-1px);
        box-shadow: 0 3px 14px rgba(var(--p-primary-rgb), 0.35) !important;
    }

    /* ============================================================
       Right-side utility buttons
       ============================================================ */
    .om-donate-btn {
        color: var(--p-info) !important;
        background: rgba(var(--p-info-rgb), 0.12) !important;
        border: 1px solid rgba(var(--p-info-rgb), 0.4) !important;
        border-radius: 10px !important;
        font-weight: 600;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-donate-btn:hover {
        background: rgba(var(--p-info-rgb), 0.22) !important;
        border-color: rgba(var(--p-info-rgb), 0.65) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--p-info-rgb), 0.22) !important;
        filter: none !important;
    }

    .om-help-btn {
        color: var(--p-primary) !important;
        background: rgba(var(--p-primary-rgb), 0.08) !important;
        border: 1px solid rgba(var(--p-primary-rgb), 0.35) !important;
        border-radius: 10px !important;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-help-btn:hover {
        background: rgba(var(--p-primary-rgb), 0.18) !important;
        border-color: rgba(var(--p-primary-rgb), 0.6) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--p-primary-rgb), 0.2) !important;
        filter: none !important;
    }
    /* One-time attention pulse for users who have never opened a tour. */
    .om-help-pulse {
        animation: om-help-pulse 2s ease-out infinite;
    }
    @keyframes om-help-pulse {
        0% { box-shadow: 0 0 0 0 rgba(var(--p-primary-rgb), 0.55); }
        70% { box-shadow: 0 0 0 9px rgba(var(--p-primary-rgb), 0); }
        100% { box-shadow: 0 0 0 0 rgba(var(--p-primary-rgb), 0); }
    }

    .om-bug-btn {
        color: var(--p-danger) !important;
        background: rgba(var(--p-danger-rgb), 0.08) !important;
        border: 1px solid rgba(var(--p-danger-rgb), 0.35) !important;
        border-radius: 10px !important;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-bug-btn:hover {
        background: rgba(var(--p-danger-rgb), 0.18) !important;
        border-color: rgba(var(--p-danger-rgb), 0.6) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--p-danger-rgb), 0.2) !important;
        filter: none !important;
    }

    .om-github-btn {
        color: var(--p-success) !important;
        background: rgba(var(--p-success-rgb), 0.08) !important;
        border: 1px solid rgba(var(--p-success-rgb), 0.35) !important;
        border-radius: 10px !important;
        transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s !important;
    }
    .om-github-btn:hover {
        background: rgba(var(--p-success-rgb), 0.18) !important;
        border-color: rgba(var(--p-success-rgb), 0.6) !important;
        transform: translateY(-1px);
        box-shadow: 0 2px 10px rgba(var(--p-success-rgb), 0.2) !important;
        filter: none !important;
    }

    /* ============================================================
       Dropdown menu — glass panel
       ============================================================ */
    .om-header .dropdown-menu {
        background: linear-gradient(180deg,
            rgba(var(--p-dark-rgb), 0.96) 0%,
            rgba(var(--p-dark-rgb), 0.88) 100%) !important;
        border: 1px solid rgba(var(--p-primary-rgb), 0.3) !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 28px rgba(var(--p-dark-rgb), 0.55) !important;
        padding: 0.4rem !important;
    }

    .om-header .dropdown-menu .dropdown-item,
    .om-header .dropdown-menu .dropdown-item.btn,
    .om-header .dropdown-menu .dropdown-item.nav-link {
        color: var(--p-primary) !important;
        background: transparent !important;
        border: 0 !important;
        border-radius: 8px !important;
        margin: 0.1rem 0 !important;
        transition: background 0.12s, color 0.12s !important;
    }

    .om-header .dropdown-menu .dropdown-item:hover,
    .om-header .dropdown-menu .dropdown-item.btn:hover,
    .om-header .dropdown-menu .dropdown-item.nav-link:hover {
        background: rgba(var(--p-primary-rgb), 0.1) !important;
        color: var(--p-primary) !important;
    }

    .om-header .dropdown-menu .dropdown-item:disabled,
    .om-header .dropdown-menu .dropdown-item.btn:disabled {
        color: rgba(var(--p-primary-rgb), 0.35) !important;
        cursor: not-allowed;
    }

    /* Override dropdown CSS variables */
    .om-header .dropdown-menu {
        --p-dropdown-link-color: var(--p-primary) !important;
        --p-dropdown-link-hover-color: var(--p-primary) !important;
        --p-dropdown-link-hover-bg: rgba(var(--p-primary-rgb), 0.1) !important;
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
    /* Top-level wizard/tool dropdowns are click-driven (normal dropdown):
       click the toggle to latch open, click an item or outside to close.
       (No hover-to-open — that opened the menu without latching, so it
       vanished the instant the cursor left the button.) */
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
        background-color: var(--p-dark) !important;
    }
    .border-dark {
        border-color: var(--p-dark) !important;
    }
    .input-group-text{
        background-color: var(--p-light) !important;
        color: var(--p-white) !important;
        border-color: var(--p-dark) !important;
    }
    .custom-select,
    .form-control {
        background-color: var(--p-dark) !important;
        color: var(--p-white) !important;
        border-color: var(--p-dark) !important;
    }
    .jumbotron{
        border-radius: 1em;
        box-shadow: 0 5px 10px rgba(var(--p-black-rgb), .2);
    }
    .card{
        padding: 1.5em .5em .5em;
        background-color: var(--p-light);
        border-radius: 1em;
        text-align: center;
        box-shadow: 0 5px 10px rgba(var(--p-black-rgb), .2);
    }
    .form-control:disabled {
        background-color: var(--p-dark) !important;
        color: var(--p-white) !important;
        border-color: var(--p-dark) !important;
    }
    .form-control:-webkit-autofill,
    .form-control:-webkit-autofill:focus,
    .form-control:-webkit-autofill{
        -webkit-text-fill-color: var(--p-white) !important;
        background-color: transparent !important;
        -webkit-box-shadow: 0 0 0 50px var(--p-dark) inset;
    }

    .container {
        max-width: 100vw;
        align-items: center;
    }

    .main {
      margin-top: 60px;
    }
    ::-webkit-scrollbar { height: 3px;}
    ::-webkit-scrollbar-button {  background-color: var(--p-light); }
    ::-webkit-scrollbar-track {  background-color: var(--p-light);}
    ::-webkit-scrollbar-track-piece { background-color: var(--p-dark);}
    ::-webkit-scrollbar-thumb {  background-color: var(--p-light); border-radius: 3px;}
    ::-webkit-scrollbar-corner { background-color: var(--p-light);}

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
        border-color: var(--p-primary) !important;
        outline: 0  !important;
        box-shadow: none  !important;
    }
</style>
