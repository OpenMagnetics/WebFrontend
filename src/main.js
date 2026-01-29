import { createApp } from 'vue'
import App from './App.vue'
import { Tooltip } from 'bootstrap';
import 'bootstrap';
import router from "./router";
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import VueCookies from 'vue3-cookies'
import tooltip from "/WebSharedComponents/Common/TooltipDirective.vue";
import axios from "axios";
import { useUserStore } from '/src/stores/user'
import { useSettingsStore } from '/src/stores/settings'
import { useStateStore } from '/src/stores/state'
import { useStyleStore } from '/src/stores/style'
import { useFairRiteStyleStore } from '/src/stores/fairRiteStyle'
import { VueWindowSizePlugin } from 'vue-window-size/plugin';
import { initWorker } from '/WebSharedComponents/assets/js/mkfRuntime'
import VueLatex from 'vatex'
import { checkAndClearOutdatedStores } from '/src/stores/storeVersioning'

// Monkey-patch Bootstrap Tooltip to fix _activeTrigger null errors
const originalIsWithActiveTrigger = Tooltip.prototype._isWithActiveTrigger;
Tooltip.prototype._isWithActiveTrigger = function() {
    if (!this._activeTrigger || typeof this._activeTrigger !== 'object') {
        this._activeTrigger = {};
    }
    return originalIsWithActiveTrigger.call(this);
};

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

// Preload function to start loading WASM and data in background from home page
let preloadPromise = null;
let preloadedMkf = null; // Store preloaded mkf separately, don't set $mkf until engine loader
function preloadMKF() {
    if (preloadPromise || app.config.globalProperties.$mkf != null) {
        return preloadPromise; // Already preloading or loaded
    }
    
    console.warn("Preloading MKF from home page...");
    
    preloadPromise = (async () => {
        try {
            // Initialize MKF in Web Worker
            // WASM files are in public/wasm folder, served at /wasm/ in production
            const wasmJsUrl = `${import.meta.env.BASE_URL}wasm/libMKF.wasm.js`;
            const mkf = await initWorker(wasmJsUrl);
            preloadedMkf = mkf; // Store but don't set globally yet
            
            // Load data and wait for completion
            console.warn("Preload: Loading core materials, shapes and wires...");
            await Promise.all([
                mkf.load_core_materials("").then(() => console.log("Preload: Core materials loaded")),
                mkf.load_core_shapes("").then(() => console.log("Preload: Core shapes loaded")),
                mkf.load_wires("").then(() => console.log("Preload: Wires loaded"))
            ]);
            
            console.warn("MKF preload complete - All data ready");
            return mkf;
        } catch (error) {
            console.error("Error preloading MKF:", error);
            preloadPromise = null; // Allow retry
            throw error;
        }
    })();
    
    return preloadPromise;
}

app.mount("#app");

router.beforeEach((to, from, next) => {

    if (app.config.globalProperties.$mkf != null && !app.config.globalProperties.$mkf._loading && to.name == "EngineLoader") {
        if (app.config.globalProperties.$userStore.loadingPath != null) {
            const newPath = app.config.globalProperties.$userStore.loadingPath;
            app.config.globalProperties.$userStore.loadingPath = null;
            router.push(newPath);
        }
        else {
            // If WASM is loaded and we go to engine loader, we just return to where we were
            setTimeout(() => {router.push(from.path);}, 500);
        }
    }
    else if (app.config.globalProperties.$userStore.loadingPath !=null && app.config.globalProperties.$mkf != null && to.name == "EngineLoader") {
        const newPath = app.config.globalProperties.$userStore.loadingPath;
        app.config.globalProperties.$userStore.loadingPath = null;
        setTimeout(() => {router.push(from.path);}, 500);
    }

    const nonDataViews = [`${import.meta.env.BASE_URL}`, `${import.meta.env.BASE_URL}home`, `${import.meta.env.BASE_URL}insulation_adviser`]

    var loadData = !nonDataViews.includes(to.path);

    const fairRiteWorkflow = to.path.includes("fair_rite") || from.path.includes("fair_rite");

    if (fairRiteWorkflow) {
        app.config.globalProperties.$styleStore = useFairRiteStyleStore()
    }
    else {
        app.config.globalProperties.$styleStore = useStyleStore()
    }

    // Start preloading when on home page (non-data views)
    if (!loadData && app.config.globalProperties.$mkf == null) {
        preloadMKF();
    }

    if (loadData) {
        if (app.config.globalProperties.$mkf == null && to.name != "EngineLoader") {
            app.config.globalProperties.$userStore.loadingPath = to.path
            router.push(`${import.meta.env.BASE_URL}engine_loader`)
        }
        else if (app.config.globalProperties.$mkf == null && to.name == "EngineLoader") {
            // Minimum time to display the loader (in ms)
            const minimumLoaderTime = 500;
            const loaderStartTime = Date.now();
            
            // Mark as loading to prevent re-entry
            app.config.globalProperties.$mkf = { ready: Promise.resolve(), _loading: true };
            
            // Check if preloading already completed or is in progress
            // If preloadPromise exists, await it - it includes all data loading
            const initPromise = preloadPromise 
                ? preloadPromise                  // In progress or complete (includes data loading)
                : preloadedMkf 
                    ? Promise.resolve(preloadedMkf)  // Shouldn't happen, but just in case
                    : (async () => {                 // Fresh init - need to load data separately
                        console.warn("Initializing MKF in Web Worker (fresh)...")
                        // WASM files are in public/wasm folder, served at /wasm/ in production
                        const wasmJsUrl = `${import.meta.env.BASE_URL}wasm/libMKF.wasm.js`;
                        return await initWorker(wasmJsUrl);
                    })();
            
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
                    
                    // Wait for MKF initialization (either from preload or fresh)
                    // If preloadPromise exists, it includes data loading, so wait for it fully
                    const mkf = await initPromise;
                    app.config.globalProperties.$mkf = mkf;
                    
                    // If preloadPromise was used, data is already loaded (preload includes data loading)
                    // Only need to load if we did fresh init without preload
                    const preloadWasUsed = preloadPromise != null;

                    // Load core materials, shapes, wires - WAIT for all to complete
                    // Skip if preload was used (it already loaded the base data)
                    const loadPromises = [];
                    
                    if (!preloadWasUsed) {
                        console.warn("Loading core materials in simulator")
                        loadPromises.push(mkf.load_core_materials("").then(() => console.log("Core materials loaded")));
                        
                        console.warn("Loading core shapes in simulator")
                        loadPromises.push(mkf.load_core_shapes("").then(() => console.log("Core shapes loaded")));
                        
                        console.warn("Loading wires in simulator")
                        loadPromises.push(mkf.load_wires("").then(() => console.log("Wires loaded")));
                    } else {
                        console.warn("Preload already loaded base data, skipping...");
                    }

                    // Wait for ALL loading to complete
                    if (loadPromises.length > 0) {
                        await Promise.all(loadPromises);
                    }
                    console.warn("All data loaded");

                    // Ensure minimum loader display time before navigating
                    const newPath = app.config.globalProperties.$userStore.loadingPath;
                    app.config.globalProperties.$userStore.loadingPath = null;
                    const elapsedTime = Date.now() - loaderStartTime;
                    const remainingTime = Math.max(0, minimumLoaderTime - elapsedTime);
                    setTimeout(() => router.push(newPath), remainingTime)
                } catch (error) {
                    console.error("Error initializing MKF:", error);
                }
            })();

        }
    }

    next();
})