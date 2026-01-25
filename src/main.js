import { createApp } from 'vue'
import App from './App.vue'
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
import { useStateStore } from '/src/stores/state'
import { useStyleStore } from '/src/stores/style'
import { useWeStyleStore } from '/src/stores/weStyle'
import { useFairRiteStyleStore } from '/src/stores/fairRiteStyle'
import { VueWindowSizePlugin } from 'vue-window-size/plugin';
import { initWorker } from '/WebSharedComponents/assets/js/mkfRuntime'
import VueLatex from 'vatex'
import { checkAndClearOutdatedStores } from '/src/stores/storeVersioning'

// Check and clear outdated stores BEFORE Pinia is initialized
// This ensures old store data with incompatible field names is cleared
checkAndClearOutdatedStores();

const axiosInstance = axios.create()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App);
app.use(router);
app.use(pinia)
app.use(VueCookies, { expires: '7d'})
app.directive("tooltip", tooltip);
app.use(VueWindowSizePlugin);
app.use(VueLatex);
app.config.globalProperties.$axios = axiosInstance
app.config.globalProperties.$userStore = useUserStore()
app.config.globalProperties.$settingsStore = useSettingsStore()
app.config.globalProperties.$stateStore = useStateStore()

export const globals = app.config.globalProperties

app.mount("#app");

router.beforeEach((to, from, next) => {

    if (app.config.globalProperties.$mkf != null && (to.name == "EngineLoader" || to.name == "WEEngineLoader")) {
        if (app.config.globalProperties.$userStore.loadingPath != null) {
            const newPath = app.config.globalProperties.$userStore.loadingPath;
            app.config.globalProperties.$userStore.loadingPath = null;
            router.push(newPath);
        }
        else {
            // If WASM is loaded and we go to enginer loader, we just return to where we were
            setTimeout(() => {router.push(from.path);}, 500);
        }
    }

    const nonDataViews = [`${import.meta.env.BASE_URL}`, `${import.meta.env.BASE_URL}home`, `${import.meta.env.BASE_URL}insulation_adviser`]

    var loadData = !nonDataViews.includes(to.path);

    const weWorkflow = to.path.includes("we_") || from.path.includes("we_");
    const fairRiteWorkflow = to.path.includes("fair_rite") || from.path.includes("fair_rite");

    if (fairRiteWorkflow) {
        app.config.globalProperties.$styleStore = useFairRiteStyleStore()
    }
    else if (weWorkflow) {
        app.config.globalProperties.$styleStore = useWeStyleStore()
    }
    else {
        app.config.globalProperties.$styleStore = useStyleStore()
    }


    if (loadData) {
        if (app.config.globalProperties.$mkf == null && to.name != "WEEngineLoader" && weWorkflow) {
            app.config.globalProperties.$userStore.loadingPath = to.path
            router.push(`${import.meta.env.BASE_URL}we_engine_loader`)
        }
        else if (app.config.globalProperties.$mkf == null && to.name != "EngineLoader" && !weWorkflow) {
            app.config.globalProperties.$userStore.loadingPath = to.path
            router.push(`${import.meta.env.BASE_URL}engine_loader`)
        }
        else if (app.config.globalProperties.$mkf == null && (to.name == "EngineLoader" || to.name == "WEEngineLoader")) {
            const loadAllParts = !weWorkflow || (weWorkflow && app.config.globalProperties.$settingsStore.catalogAdviserSettings.useAllParts);
            // const loadExternalParts = false;
            const loadExternalParts = weWorkflow;
            
            // Mark as loading to prevent re-entry
            app.config.globalProperties.$mkf = { ready: Promise.resolve(), _loading: true };
            
            (async () => {
                try {
                    console.warn("Loading core materials in backend")
                    fetch(`${import.meta.env.BASE_URL}core_materials.ndjson`)
                    .then((data) => data.text())
                    .then((data) => {
                            if (!data.startsWith("<")) {
                                const postData = {
                                    "coreMaterialsString": data
                                };
                                const url = import.meta.env.VITE_API_ENDPOINT + '/load_external_core_materials';

                                app.config.globalProperties.$axios.post(url, postData)
                                .then(response => {
                                })
                                .catch(error => {
                                    console.error(error);
                                });
                            }
                        })
                    
                    // Initialize MKF in Web Worker
                    console.warn("Initializing MKF in Web Worker...")
                    const wasmJsUrl = new URL('/src/assets/js/libMKF.wasm.js', window.location.origin).href;
                    const mkf = await initWorker(wasmJsUrl);
                    app.config.globalProperties.$mkf = mkf;

                    // Load core materials
                    console.warn("Loading core materials in simulator")
                    if (loadAllParts) {
                        await mkf.load_core_materials("");
                    }
                    if (loadExternalParts) {
                        try {
                            const coreMaterialsData = await fetch(`${import.meta.env.BASE_URL}core_materials.ndjson`).then(r => r.text());
                            if (!coreMaterialsData.startsWith("<")) {
                                await mkf.load_core_materials(coreMaterialsData);
                            }
                        } catch (error) {
                            console.error("error fetching core_materials.ndjson", error);
                        }
                    }

                    // Load core shapes
                    console.warn("Loading core shapes in simulator")
                    if (loadAllParts) {
                        await mkf.load_core_shapes("");
                    }
                    if (loadExternalParts) {
                        try {
                            const coreShapesData = await fetch(`${import.meta.env.BASE_URL}core_shapes.ndjson`).then(r => r.text());
                            if (!coreShapesData.startsWith("<")) {
                                await mkf.load_core_shapes(coreShapesData);
                            }
                        } catch (error) {
                            console.error("error fetching core_shapes.ndjson", error);
                        }
                    }

                    // Load wires
                    console.warn("Loading wires in simulator")
                    if (loadAllParts) {
                        await mkf.load_wires("");
                    }
                    if (loadExternalParts) {
                        try {
                            const wiresData = await fetch(`${import.meta.env.BASE_URL}lab_osma_wires.ndjson`).then(r => r.text());
                            if (!wiresData.startsWith("<")) {
                                await mkf.load_wires(wiresData);
                            }
                        } catch (error) {
                            console.error("error fetching lab_osma_wires.ndjson", error);
                        }
                    }

                    // Load cores
                    console.warn("Loading cores in simulator")
                    if (loadExternalParts) {
                        try {
                            const coresData = await fetch(`${import.meta.env.BASE_URL}lab_osma_cores.ndjson`).then(r => r.text());
                            if (!coresData.startsWith("<")) {
                                await mkf.load_cores(coresData, app.config.globalProperties.$settingsStore.adviserSettings.allowToroidalCores, app.config.globalProperties.$settingsStore.adviserSettings.useOnlyCoresInStock);
                            }
                        } catch (error) {
                            console.error("error fetching lab_osma_cores.ndjson", error);
                        }
                    }

                    const newPath = app.config.globalProperties.$userStore.loadingPath;
                    app.config.globalProperties.$userStore.loadingPath = null;
                    router.push(newPath)
                } catch (error) {
                    console.error("Error initializing MKF:", error);
                }
            })();

        }
    }

    next();
})