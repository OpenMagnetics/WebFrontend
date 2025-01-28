<script setup >
import { defineAsyncComponent } from "vue";
import { useUserDatabaseStore } from '/src/stores/userDatabase'
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
        const userDatabaseStore = useUserDatabaseStore()
        return {
            showModal: false,
            loggedIn: false,
            username: null,
            userDatabaseStore,
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
    },
    computed: {
        getOperationPointsLength() {
            if (this.userDatabaseStore.operationPoints != null)
                return this.userDatabaseStore.operationPoints.length
            else
                return "Loading"
        },
        getCoresLength() {
            if (this.userDatabaseStore.cores != null)
                return this.userDatabaseStore.cores.length
            else
                return "Loading"
        },
        getBobbinsLength() {
            if (this.userDatabaseStore.bobbins != null)
                return this.userDatabaseStore.bobbins.length
            else
                return "Loading"
        },
        getWiresLength() {
            if (this.userDatabaseStore.wires != null)
                return this.userDatabaseStore.wires.length
            else
                return "Loading"
        },
        getMagneticsLength() {
            if (this.userDatabaseStore.magnetics != null)
                return this.userDatabaseStore.magnetics.length
            else
                return "Loading"
        },
        onCatalogAdviser() {
            const catalogStore = useCatalogStore();
            catalogStore.resetCatalog();
            this.$userStore.resetMagneticTool();
            this.$userStore.selectApplication("catalog");
            this.$userStore.selectTool("catalogAdviser");

            if (this.$route.name != 'CatalogTool')
                setTimeout(() => {this.$router.push('/we_catalog_tool');}, 100);
            else
                setTimeout(() => {this.$router.push('/we_engine_loader');}, 100);
        },
        onCatalog() {
            if (this.$route.name != 'Catalog')
                setTimeout(() => {this.$router.push('/we_catalog');}, 100);
            else
                setTimeout(() => {this.$router.push('/we_engine_loader');}, 100);
        },
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
        this.onLoggedIn()
    }
}
</script>

<template>
    <nav class="navbar navbar-expand-lg bg-white navbar-white text-primary mb-1 om-header" id="header_wrapper">
        <div class="container-fluid">
            <div class="text-dark me-5 fs-4">
                <a data-cy="Header-logo-home-link" href="/we_catalog_tool">
                    <img src="/images/welogodark.svg" height="40" href="/we_catalog_tool" class="d-inline-block align-top me-3 " alt="OpenMagnetics Logo">
                </a>
                CMC Designer
            </div>
            <button class="navbar-toggler text-primary" ref="headerToggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon text-white"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNavDropdown">
                <ul class="navbar-nav ms-auto text-center">
                    <li><button data-cy="Header-catalog-adviser-link" :class="headerTogglerIsVisible? 'w-100' : 'mx-1' " class="dropdown-item btn btn-block nav-link text-primary bg-white border-primary px-2" @click="onCatalogAdviser"><i class="me-2 fa-solid fa-book"></i>El CHOKER</button></li>
                    <li><button data-cy="Header-catalog-link" :class="headerTogglerIsVisible? 'w-100' : 'mx-1' " class="dropdown-item btn btn-block nav-link text-primary bg-white border-primary px-2" @click="onCatalog"><i class="me-2 fa-solid fa-book"></i>Catalog</button></li>
                </ul>
            </div>

        </div>
    </nav>
 
    <div class="offcanvas offcanvas-end bg-light" tabindex="-1" id="UserOffCanvas" aria-labelledby="UserOffCanvasLabel">
        <div class="offcanvas-header">
            <h5 class="offcanvas-title text-white fs-3" id="UserOffCanvasLabel">{{username}}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="UserOffCanvasClose"></button>
        </div>
        <div class="offcanvas-body">
            <div class="list-group" style="margin: 0" >
                <button data-cy="Header-inventory-operation-points-link" class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50" data-bs-dismiss="offcanvas" @click="onClickNumberOperationPoints">My operation points <span class="badge text-bg-secondary opacity-80">{{getOperationPointsLength}}</span> </button>
                <button data-cy="Header-inventory-cores-link" class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50" data-bs-dismiss="offcanvas" @click="onClickNumberCores">My cores <span class="badge text-bg-secondary opacity-80">{{getCoresLength}}</span> </button>
                <button data-cy="Header-inventory-bobbins-link" class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50" data-bs-dismiss="offcanvas" @click="onClickNumberBobbins">My bobbins <span class="badge text-bg-secondary opacity-80">{{getBobbinsLength}}</span> </button>
                <button data-cy="Header-inventory-wires-link" class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50" data-bs-dismiss="offcanvas" @click="onClickNumberWires">My wires <span class="badge text-bg-secondary opacity-80">{{getWiresLength}}</span> </button>
                <button data-cy="Header-inventory-magnetics-link" class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50" data-bs-dismiss="offcanvas" @click="onClickNumberMagnetics">My magnetics <span class="badge text-bg-secondary opacity-80">{{getMagneticsLength}}</span> </button>
            </div>
            <button data-cy="Header-logout-button" class="btn mt-5 text-dark bg-primary fs-5" data-bs-dismiss="offcanvas" @click="onLoggedOut">Logout</button>
        </div>
    </div>

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
