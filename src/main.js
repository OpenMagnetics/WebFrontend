import { createApp } from 'vue'
import App from './App.vue'
import './assets/css/custom.css'
import 'bootstrap';
import router from "./router";
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import VueCookies from 'vue-cookies'
import tooltip from "./directives/tooltip.js";
import "/src/assets/css/tooltip.css";
import axios from "axios";
import { useUserStore } from '/src/stores/user'
import { useDataCacheStore } from '/src/stores/dataCache'
import VueResizeText from "vue3-resize-text"
import Module from '/src/assets/js/libMKF.wasm.js';
import { removeEmpty } from '/src/assets/js/utils.js';


const axiosInstance = axios.create()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App);
app.use(router);
app.use(pinia)
app.use(VueCookies, { expires: '7d'})
app.use(VueResizeText)
app.directive("tooltip", tooltip);
app.config.globalProperties.$axios = axiosInstance
app.config.globalProperties.$userStore = useUserStore()
app.config.globalProperties.$dataCacheStore = null
app.mount("#app");


router.beforeEach((to, from, next) => {
    const nonDataViews = ['/', '/home', '/roadmap', '/musings', '/musing']
    const nonDataStrings = ['musing']

    var loadData = !nonDataViews.includes(to.path)
    nonDataStrings.forEach((item) => {
        if (to.path.includes(item)) {
            loadData = false
        } 
    })


    if (loadData) {
        
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
    		app.config.globalProperties.$dataCacheStore = useDataCacheStore()
    	}

	    if (to.name == "CoreGappingArtisan") {
	        app.config.globalProperties.$userStore.coreSubsection = 'gappingArtisan';
	    }
	    else if (to.name == "CoreShapeArtisan") {
	        app.config.globalProperties.$userStore.coreSubsection = 'shapeArtisan';
	    }
	    else if (to.name == "SimulationCoreAdviser") {
	        app.config.globalProperties.$userStore.coreSimulationSubsection = 'coreAdviser';
	    }
	    else if (to.name == "SimulationInductanceCalculator") {
	        app.config.globalProperties.$userStore.coreSimulationSubsection = 'inductanceCalculator';
	    }

        if (app.config.globalProperties.$dataCacheStore.timestamp == null || (app.config.globalProperties.$dataCacheStore.timestamp + app.config.globalProperties.$dataCacheStore.ttlInMilliseconds < Date.now())) {

            const url = import.meta.env.VITE_API_ENDPOINT + '/read_mas_database'
            setTimeout(() => {app.config.globalProperties.$userStore.armDeadManSwitch()}, 1000);
            axiosInstance.post(url, {})
            .then(response => {
                var data = response.data;
                data = removeEmpty(data);

                app.config.globalProperties.$dataCacheStore.masData = data;
                app.config.globalProperties.$dataCacheStore.commercialMaterialsLoaded();
                app.config.globalProperties.$dataCacheStore.commercialShapesLoaded();
                app.config.globalProperties.$dataCacheStore.timestamp = Date.now()
                setTimeout(() => app.config.globalProperties.$userStore.disarmDeadManSwitch(), 1000);
            })
            .catch(error => {
                console.error("Error loading shape library")
                console.error(error.data)
            });
        }
    }

    next()
})