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

::-webkit-scrollbar { height: 3px;}
::-webkit-scrollbar-button {  background-color: var(--bs-light); }
::-webkit-scrollbar-track {  background-color: var(--bs-light);}
::-webkit-scrollbar-track-piece { background-color: var(--bs-dark);}
::-webkit-scrollbar-thumb {  background-color: var(--bs-light); border-radius: 3px;}
::-webkit-scrollbar-corner { background-color: var(--bs-light);}
</style>


<script>
export default {
    mounted() {
      let fontawesome = document.createElement('script')
      fontawesome.setAttribute('src', 'https://kit.fontawesome.com/d5a40d6941.js')
      document.head.appendChild(fontawesome)
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
                </ul>
            </div>
        </div>
    </nav>
</template>
