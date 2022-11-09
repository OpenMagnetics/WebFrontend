<style>

    html {
      position: relative;
      min-height: 100%;
      padding-bottom:160px;
    }
    footer {
      position: absolute;
      bottom: 0;
      width: 100%;
      height: 100px;
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
        max-width: 95vw;
        align-items: center;
        overflow: auto;
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

    .accordion-button:not(.collapsed) {
        color: var(--bs-primary)  !important;
        background-color: var(--bs-light) !important;
        border-color: var(--bs-primary) !important;
    }


    .accordion-button {
        color: var(--bs-primary)  !important;
        background-color: var(--bs-light) !important;
        border-color: var(--bs-primary) !important;
    }

    .accordion-button:focus {
        border-color: var(--bs-primary) !important;
        outline: 0  !important;
        box-shadow: none  !important;
    }
    .accordion-body {
        border-bottom: none !important;
    }

    .accordion-button:link, .accordion-button:visited, .accordion-button:hover, .accordion-button:active  {
        background-color: var(--bs-secondary) !important;
        color: var(--bs-primary) !important;
        text-decoration: none !important;
        border: hidden !important;
        border-color: var(--bs-primary) !important;
        box-shadow: 0px !important;

          
    }

</style>


<script setup >
import LoginModal from '/src/components/Login.vue'
import { useUserStore } from '/src/stores/user'
</script>

<script>

export default {
    components: { LoginModal },
    data() {
        const userStore = useUserStore()
        return {
            showModal: false,
            loggedIn: false,
            username: null,
            userStore,
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
                this.userStore.login()
                this.userStore.setUsername(this.username)
            }
        },
        onLoggedOut() {
            this.$cookies.remove("username");
            this.loggedIn = false
            this.username = null
            this.userStore.logout()
            this.userStore.setUsername(null)
        }
    },
    computed: {
        numberMagnetics() {
            return 42
        }
    },
    mounted() {
        let fontawesome = document.createElement('script')
        fontawesome.setAttribute('src', 'https://kit.fontawesome.com/d5a40d6941.js')
        document.head.appendChild(fontawesome)
        this.onLoggedIn()
    }
}
</script>

<template>
    <nav class="navbar navbar-expand-lg bg-light navbar-dark text-primary mb-2" id="header_wrapper">
        <div class="container-fluid">
<!--             <a href="/">
                <img src="/static/images/logo.png" width="40" height="auto" href="/" class="d-inline-block align-top mr-2" alt="">
            </a> -->
            <a class="navbar-brand text-primary" href="/">Open Magnetics</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon navbar-primary"></span>
            </button>

            <div class="collapse navbar-collapse" id="navbarNavDropdown">
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <router-link class="nav-link text-primary" to="/roadmap">Roadmap</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link class="nav-link text-primary" to="/musings">Alf's Musings</router-link>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle rounded-3 ms-3 text-light bg-primary ps-3" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            Create Element
                        </a>
                        <ul class="dropdown-menu" style="margin: 0">
                            <li><a class="dropdown-item" href="/operation_point">Operation Point</a></li>
                            <li><a class="dropdown-item disabled" href="#">Core</a></li>
                            <li><a class="dropdown-item disabled" href="#">Simulation</a></li>
                        </ul>
                    </li>
                </ul>
            </div>
            <div class="collapse navbar-collapse" id="navbarNavDropdown">
                <ul class="navbar-nav ms-auto">
                    <li v-if="!loggedIn" class="nav-item">
                        <span class="nav-item">
                            <button class="btn nav-link text-primary" data-bs-toggle="modal" data-bs-target="#registerModal">Register</button>
                        </span>
                    </li>
                    <li v-if="!loggedIn" class="nav-item">
                        <span class="nav-item">
                            <button class="btn nav-link text-primary" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
                        </span>
                    </li>
                    <li v-if="loggedIn" class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle rounded-3 ps-1 text-light bg-primary ps-3 pe-3" href="#" role="button" data-bs-toggle="offcanvas" data-bs-target="#UserOffCanvas" aria-controls="UserOffCanvas">
                            {{username}}
                        </a>
<!--                         <ul class="dropdown-menu" style="margin: 0" >
                            <li><a class="dropdown-item disabled" href="#">My magnetics</a></li>
                            <li><a class="dropdown-item disabled" href="#">My operation points</a></li>
                            <li><a class="dropdown-item disabled" href="#">My cores</a></li>
                            <li><a class="dropdown-item disabled" href="#">My bobbins</a></li>
                            <li><a class="dropdown-item disabled" href="#">My wires</a></li>
                        </ul> -->
                    </li>
                </ul>
            </div>

        </div>
    </nav>
 
    <div class="offcanvas offcanvas-end bg-light" tabindex="-1" id="UserOffCanvas" aria-labelledby="UserOffCanvasLabel">
        <div class="offcanvas-header">
            <h5 class="offcanvas-title text-white fs-3" id="UserOffCanvasLabel">{{username}}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
            <div class="list-group" style="margin: 0" >
                <a class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50 " href="#">My magnetics <span class="badge text-bg-secondary opacity-80">{{numberMagnetics}}</span> </a>
                <a class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50 " href="#">My operation points <span class="badge text-bg-secondary opacity-80">{{numberMagnetics}}</span> </a>
                <a class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50 " href="#">My cores <span class="badge text-bg-secondary opacity-80">{{numberMagnetics}}</span> </a>
                <a class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50 " href="#">My bobbins <span class="badge text-bg-secondary opacity-80">{{numberMagnetics}}</span> </a>
                <a class="list-group-item list-group-item-action bg-light text-primary border-primary border-opacity-50 " href="#">My wires <span class="badge text-bg-secondary opacity-80">{{numberMagnetics}}</span> </a>
            </div>
            <button class="btn mt-5 text-dark bg-primary fs-5" data-bs-dismiss="offcanvas" @click="onLoggedOut">Logout</button>
        </div>
    </div>

    <!-- Modal -->
    <div class="modal fade" id="registerModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
        <LoginModal :isLogin="false" @onLoggedIn="onLoggedIn"/>
    </div>
    <div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="modalLabel" aria-hidden="true">
        <LoginModal :isLogin="true" @onLoggedIn="onLoggedIn"/>
    </div>
</template>
