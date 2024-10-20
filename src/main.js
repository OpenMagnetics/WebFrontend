import { createApp } from 'vue'
import App from './App.vue'
import './assets/css/custom.css'
import 'bootstrap';
import router from "./router";
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import VueCookies from 'vue3-cookies'
import tooltip from "./directives/tooltip.js";
import "/src/assets/css/tooltip.css";
import axios from "axios";
import { useUserStore } from '/src/stores/user'
import { useSettingsStore } from '/src/stores/settings'
import { useDataCacheStore } from '/src/stores/dataCache'
import Module from '/src/assets/js/libMKF.wasm.js';
import { removeEmpty } from '/src/assets/js/utils.js';


const axiosInstance = axios.create()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App);
app.use(router);
app.use(pinia)
app.use(VueCookies, { expires: '7d'})
app.directive("tooltip", tooltip);
app.config.globalProperties.$axios = axiosInstance
app.config.globalProperties.$userStore = useUserStore()
app.config.globalProperties.$settingsStore = useSettingsStore()
app.config.globalProperties.$dataCacheStore = null
app.mount("#app");


router.beforeEach((to, from, next) => {
    const nonDataViews = ['/', '/home']

    var loadData = !nonDataViews.includes(to.path);

    if (loadData) {
        
        console.log("Loading");
        app.config.globalProperties.$mkf = {
            ready: new Promise(resolve => {
                Module({
                    onRuntimeInitialized () {
                        app.config.globalProperties.$mkf = Object.assign(this, {
                            ready: Promise.resolve()
                        });
                        resolve();
                    }
                });
            })
        };

    	if (app.config.globalProperties.$dataCacheStore == null) {
    		app.config.globalProperties.$dataCacheStore = useDataCacheStore();
    	}
    }

    console.log("Loaded");
    next();
})