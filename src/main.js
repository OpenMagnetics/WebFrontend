import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'
import './assets/css/custom.css'
import 'bootstrap';
import router from "./router";
import { createPinia } from 'pinia'
import VueCookies from 'vue-cookies'

const pinia = createPinia()
const app = createApp(App);
app.use(router);
app.use(pinia)
app.use(VueCookies, { expires: '7d'})
app.mount("#app");
