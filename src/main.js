import { createApp } from 'vue'
// import './style.css'
import App from './App.vue'
import './assets/css/custom.css'
import 'bootstrap';
import router from "./router";
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import VueCookies from 'vue-cookies'
import tooltip from "./directives/tooltip.js";
import "/src/assets/css/tooltip.css";


const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App);
app.use(router);
app.use(pinia)
app.use(VueCookies, { expires: '7d'})
app.directive("tooltip", tooltip);
app.mount("#app");
