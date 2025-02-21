<script setup >
import { defineAsyncComponent } from "vue";
import { useElementVisibility  } from '@vueuse/core'
import { ref } from 'vue'
import { useCatalogStore } from '/src/stores/catalog'
import '/src/assets/css/wuerth.css' 
</script>

<script>

const headerToggler = ref(null)
const headerTogglerIsVisible = useElementVisibility(headerToggler)

export default {
    components: {
        BugReporterModal: defineAsyncComponent(() => import('/src/components/User/BugReporter.vue') ),
        DeadManSwitch: defineAsyncComponent(() => import('/src/components/User/DeadManSwitch.vue') ),
        NotificationsModal: defineAsyncComponent(() => import('/src/components/NotificationsModal.vue') ),
    },
    data() {
        return {
            showModal: false,
            loggedIn: false,
            username: null,
        }
    },
    methods: {
        onShowModal() {
            this.showModal = true
        },
        onLoggedIn() {
            this.loggedIn = this.$cookies.get('username') != null
            this.username = this.$cookies.get('username')
            if (this.loggedIn) {
                this.$userStore.login()
                this.$userStore.setUsername(this.username)
            }
        },
        onClickNumberOperationPoints() {
            this.$userStore.setUserSubsection("operationPoints")
            this.$router.push('/user');
        },
        onClickNumberCores() {
            this.$userStore.setUserSubsection("cores")
            this.$router.push('/user');
        },
        onClickNumberBobbins() {
            this.$userStore.setUserSubsection("bobbins")
            this.$router.push('/user');
        },
        onClickNumberWires() {
            this.$userStore.setUserSubsection("wires")
            this.$router.push('/user');
        },
        onClickNumberMagnetics() {
            this.$userStore.setUserSubsection("magnetics")
            this.$router.push('/user');
        },
        onLoggedOut() {
            this.$cookies.remove("username");
            this.loggedIn = false
            this.username = null
            this.$userStore.reset()
            this.$userStore.logout()
            this.$userStore.setUsername(null)
        },
        onLoadCommercialShape(data) {
            this.$userStore.setGlobalCoreShape(data)
        },
        onLoadCommercialMaterial(data) {
            this.$userStore.setGlobalCoreMaterial(data)
        },
        onHome() {
            setTimeout(() => {this.$router.push('/we_home');}, 100);
        },
        onCatalogAdviser() {
            const catalogStore = useCatalogStore();
            catalogStore.resetCatalog();
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("catalog");
            this.$stateStore.selectTool("catalogAdviser");
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.CommonModeChokeCatalog);

            if (this.$route.name != 'WECatalogTool')
                setTimeout(() => {this.$router.push('/we_catalog_tool');}, 100);
            else
                setTimeout(() => {this.$router.push('/we_engine_loader');}, 100);
        },
        onCatalog() {
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.CommonModeChokeCatalog);
            if (this.$route.name != 'WECatalog')
                setTimeout(() => {this.$router.push('/we_catalog');}, 100);
            else
                setTimeout(() => {this.$router.push('/we_engine_loader');}, 100);
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
        this.$settingsStore.loadingGif = "/images/loading_wuerth.gif";
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

        this.onLoggedIn()
    }
}
</script>

<template>
    <nav class="navbar navbar-expand-lg mb-1 om-header" id="header_wrapper" :style="$styleStore.header.main">
        <div class="container-fluid">
            <div class="me-5">
                <button data-cy="Header-logo-home-link" class="bg-transparent border-0" @click="onHome">
                    <img src="/images/welogodark.svg" height="40" class="d-inline-block align-top me-3" alt="WE Logo">
                </button>
                <button
                    :style="$styleStore.header.title"
                    data-cy="Header-brand-home-link"
                    class="ms-5 border-0"
                    @click="onCatalogAdviser"
                >
                    {{'CMC Designer'}}
                </button>
            </div>
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
                <ul class="navbar-nav ms-auto text-center">
                    <li>
                        <button
                            :style="$styleStore.header.designSectionDropdown"
                            data-cy="Header-catalog-adviser-link"
                            :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                            class="dropdown-item btn btn-block nav-link border-primary px-2"
                            @click="onCatalogAdviser"
                        >
                            <i class="me-2 fa-solid fa-book"></i>{{'El CHOKER'}}
                        </button>
                    </li>
                    <li>
                        <button
                            :style="$styleStore.header.designSectionDropdown"
                            data-cy="Header-catalog-link"
                            :class="headerTogglerIsVisible? 'w-100' : 'mx-1' "
                            class="dropdown-item btn btn-block nav-link border-primary px-2"
                            @click="onCatalog"
                        >
                            <i class="me-2 fa-solid fa-book"></i>{{'Catalog'}}
                        </button>
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
