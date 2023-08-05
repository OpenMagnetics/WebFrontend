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
            app.config.globalProperties.$dataCacheStore.timestamp = Date.now()

            const urlMaterials = import.meta.env.VITE_API_ENDPOINT + '/core_get_commercial_materials'
            const core = app.config.globalProperties.$userStore.getGlobalCore
            setTimeout(() => {app.config.globalProperties.$userStore.armDeadManSwitch()}, 1000);
            
            axiosInstance.post(urlMaterials, {})
            .then(response => {
                app.config.globalProperties.$dataCacheStore.commercialMaterials = response.data["commercial_materials"]
                app.config.globalProperties.$dataCacheStore.commercialMaterialsLoaded()
                setTimeout(() => app.config.globalProperties.$userStore.disarmDeadManSwitch(), 1000);
            })
            .catch(error => {
                console.error("Error loading material library")
                console.error(error.data)
            });

            const urlShapes = import.meta.env.VITE_API_ENDPOINT + '/core_get_commercial_data'
            axiosInstance.post(urlShapes, {})
            .then(response => {
                app.config.globalProperties.$dataCacheStore.commercialCores = response.data["commercial_cores"]
                app.config.globalProperties.$dataCacheStore.commercialShapes = []
                response.data["commercial_cores"].forEach((item) => {
                    app.config.globalProperties.$dataCacheStore.commercialShapes.push(item['functionalDescription']['shape'])
                })
                app.config.globalProperties.$dataCacheStore.commercialShapesLoaded()
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