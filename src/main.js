import { createApp } from 'vue'
import App from './App.vue'
import router from "./router";
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import VueCookies from 'vue3-cookies'
import PrimeVueTooltip from 'primevue/tooltip'
import axios from "axios";
import { useUserStore } from '/src/stores/user'
import { useMasStore } from '/src/stores/mas'
import { useSettingsStore } from '/src/stores/settings'
import { useStateStore } from '/src/stores/state'
import { initTelemetry } from 'WebSharedComponents/assets/js/telemetry.js'
import { useStyleStore } from '/src/stores/style'
import { useFairRiteStyleStore } from '/src/stores/fairRiteStyle'
import { useCustomPartsStore } from '/src/stores/customParts'
import { useInventoryStore } from '/src/stores/inventory'
import { useModelSettingsStore } from '/MagneticBuilder/src/stores/modelSettings'
import { VueWindowSizePlugin } from 'vue-window-size/plugin';
import { initWorker } from 'WebSharedComponents/assets/js/mkfRuntime'
import { initKirchhoffWorker } from 'WebSharedComponents/assets/js/kirchhoffRuntime'
import VueLatex from 'vatex'
import { checkAndClearOutdatedStores, getVersionedWasmUrl } from '/src/stores/storeVersioning'
import { useConsoleStore } from '/src/stores/console'
import { installKirchhoffHandoff } from '/src/composables/kirchhoffHandoff'

// PrimeVue: Aura dark preset, tinted with the OM teal as primary
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import 'primeicons/primeicons.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
// primeflex.css is imported from src/assets/scss/custom.scss after the
// theme-base so PrimeFlex's grid utilities win the cascade for col-N.

const OmAura = definePreset(Aura, {
    semantic: {
        primary: {
            50:  '#eaf3f3',
            100: '#cae0e0',
            200: '#9ec4c3',
            300: '#75a8a7',
            400: '#5d9e9c',
            500: '#539796',
            600: '#4b8887',
            700: '#3f7372',
            800: '#335e5d',
            900: '#274948',
            950: '#192f2e',
        },
        colorScheme: {
            dark: {
                surface: {
                    0:   '#ffffff',
                    50:  '#f5f5f5',
                    100: '#e4e4e4',
                    200: '#d4d4d4',
                    300: '#b8b8b8',
                    400: '#8a8a8a',
                    500: '#5e5e5e',
                    600: '#3a3a3a',
                    700: '#2a2a2a',
                    800: '#1f1f1f',
                    900: '#1a1a1a',
                    950: '#101010',
                },
                formField: {
                    // Lighter dark for input backgrounds so they read against the
                    // panel surfaces; matches OM theme.light (#2a2a2a).
                    background: '#2a2a2a',
                    disabledBackground: '#1f1f1f',
                    filledBackground: '#2a2a2a',
                    filledFocusBackground: '#2a2a2a',
                    borderColor: '#3a3a3a',
                    hoverBorderColor: '{primary.600}',
                    focusBorderColor: '{primary.500}',
                    color: '#d4d4d4',
                    placeholderColor: '#8a8a8a',
                },
            },
        },
    },
})

// Check and clear outdated stores BEFORE Pinia is initialized
// This ensures old store data with incompatible field names is cleared
checkAndClearOutdatedStores();

const axiosInstance = axios.create()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
{
    const v = new URLSearchParams(window.location.search).get('colortest');
    let testColor = null;
    if (v === '1' || v === 'white') {
        import('./assets/scss/color-test.scss');
        testColor = '#ffffff';
    } else if (v === 'black') {
        import('./assets/scss/color-test-black.scss');
        testColor = '#000000';
    }
    if (testColor) {
        const COLOR_RX = /^\s*(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/;
        const replaceColors = (obj, seen = new WeakSet()) => {
            if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
            seen.add(obj);
            for (const k of Object.keys(obj)) {
                const val = obj[k];
                if (typeof val === 'string' && COLOR_RX.test(val)) {
                    obj[k] = testColor;
                } else if (val && typeof val === 'object') {
                    replaceColors(val, seen);
                }
            }
        };
        pinia.use(({ store }) => {
            if (store.$id !== 'style' && store.$id !== 'fairRiteStyle') return;
            store.$onAction(({ after }) => {
                after(() => replaceColors(store.$state));
            });
            replaceColors(store.$state);
        });
    }
}

const app = createApp(App);
app.use(router);
app.use(pinia)
app.use(VueCookies, { expires: '7d'})
app.directive('tooltip', PrimeVueTooltip);
app.use(VueWindowSizePlugin);
app.use(VueLatex);
app.use(PrimeVue, {
    theme: {
        preset: OmAura,
        options: {
            darkModeSelector: '.om-dark',
            cssLayer: { name: 'primevue', order: 'app, primevue' },
        },
    },
});
// App is always dark-themed
document.documentElement.classList.add('om-dark');
app.config.globalProperties.$axios = axiosInstance
app.config.globalProperties.$userStore = useUserStore()
app.config.globalProperties.$settingsStore = useSettingsStore()
app.config.globalProperties.$stateStore = useStateStore()

// Optional account session: ask the backend once per boot whether the session
// cookie is still valid, and start settings sync while logged in. Everything
// is fire-and-forget — anonymous use must never wait on the account service.
import { useAuthStore } from '/src/stores/auth'
import { startSettingsSync } from '/src/services/settingsSync'
const _authStore = useAuthStore()
_authStore.fetchMe().then(() => {
    if (_authStore.isLoggedIn) {
        startSettingsSync(app.config.globalProperties.$settingsStore)
    }
})
_authStore.$subscribe(() => {
    if (_authStore.isLoggedIn) {
        startSettingsSync(app.config.globalProperties.$settingsStore)
    }
})

// Tab-scoped telemetry session ID (resets on tab close; not tied to user identity)
const _sid = sessionStorage.getItem('om_telemetry_sid') || crypto.randomUUID()
sessionStorage.setItem('om_telemetry_sid', _sid)
app.config.globalProperties.$telemetrySid = _sid
// Design telemetry: one shared module fed the current MAS so every export and
// design-completion captures the design. masProvider reads the live mas store.
const _masStore = useMasStore()
initTelemetry({
    axios: axiosInstance,
    sessionId: _sid,
    environment: import.meta.env.VITE_ENV || 'production',
    appVersion: import.meta.env.VITE_APP_VERSION || null,
    masProvider: () => (_masStore && _masStore.mas) || null,
    // Privacy filter: designs referencing private inventory parts are
    // recorded without their MAS payload (see telemetry.js).
    privatePartNamesProvider: () => useInventoryStore().privatePartNames,
})

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
            const wasmJsUrl = getVersionedWasmUrl(`${import.meta.env.BASE_URL}wasm/libMKF.wasm.js`);
            const mkf = await initWorker(wasmJsUrl);
            preloadedMkf = mkf; // Store but don't set globally yet
            
            // Load data and wait for completion
            console.warn("[MAIN] Preload: Loading core materials, shapes and wires...");
            await Promise.all([
                mkf.load_core_materials("").then(() => console.log("Preload: Core materials loaded")),
                mkf.load_core_shapes("").then(() => console.log("Preload: Core shapes loaded")),
                mkf.load_wires("").then(() => console.log("Preload: Wires loaded"))
            ]);

            // Re-inject the user's Core Studio parts (custom shapes/materials)
            // on top of the catalog so they show up in every selector.
            await useCustomPartsStore().reinject(mkf);

            // Account inventory (Phase 2): bring the engine in line with the
            // persisted adviser scope (merge-inject / LibraryContext). No-op
            // for scope 'public' or when signed out; failures are loud but
            // must not block the engine boot for anonymous use.
            try {
                await useInventoryStore().applyScope(mkf);
            } catch (error) {
                console.error('Inventory scope could not be applied:', error);
            }
            
            // Initialize model settings from WASM during preload
            console.warn("Preload: Initializing model settings...");
            const modelSettingsStore = useModelSettingsStore();
            await modelSettingsStore.loadFromWASM();
            console.warn("Preload: Model settings initialized");
            
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

// Preload webKirchhoff (converter models: design + ngspice simulation) in its own Web Worker,
// alongside webMKF (magnetics-only). Fire-and-forget: it has no data to load (no core materials /
// shapes / wires), so warming the worker is all that is needed. The wizards await waitForKirchhoff()
// on demand, so a slow preload never blocks; this just hides the WASM compile latency behind the
// home page like preloadMKF() does.
let kirchhoffPreloadPromise = null;
function preloadKirchhoff() {
    if (kirchhoffPreloadPromise) {
        return kirchhoffPreloadPromise;
    }
    kirchhoffPreloadPromise = (async () => {
        try {
            const wasmJsUrl = getVersionedWasmUrl(`${import.meta.env.BASE_URL}wasm/libKirchhoff.js`);
            const kh = await initKirchhoffWorker(wasmJsUrl);
            console.warn("webKirchhoff preload complete");
            return kh;
        } catch (error) {
            console.error("Error preloading webKirchhoff:", error);
            kirchhoffPreloadPromise = null; // Allow retry
            throw error;
        }
    })();
    return kirchhoffPreloadPromise;
}

// Console interception for debug panel
let consoleStore = null;
const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
};

function interceptConsole() {
    if (!consoleStore) {
        consoleStore = useConsoleStore();
    }

    console.log = function(...args) {
        originalConsole.log.apply(console, args);
        if (consoleStore) consoleStore.addLog('log', args);
    };

    console.warn = function(...args) {
        originalConsole.warn.apply(console, args);
        if (consoleStore) consoleStore.addLog('warn', args);
    };

    console.error = function(...args) {
        originalConsole.error.apply(console, args);
        if (consoleStore) consoleStore.addLog('error', args);
    };

    console.info = function(...args) {
        originalConsole.info.apply(console, args);
        if (consoleStore) consoleStore.addLog('log', args);
    };
}

// Delay interception slightly to ensure Pinia is ready
setTimeout(interceptConsole, 100);

app.mount("#app");

// If Kirchhoff opened us to design a magnetic, wire the cross-origin handoff (no-op otherwise).
installKirchhoffHandoff(router);

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
    // On the fully-initialized worker proxy, `$mkf._loading` resolves to a
    // generated async method (truthy), so the `!$mkf._loading` branch above
    // never fires once loading is done. This branch is what actually bounces
    // the engine_loader "trampoline" used by Header.onWizards & co. (push
    // /engine_loader while already on the target route to force a remount).
    // Do not remove it as dead code — without it the app parks on
    // /engine_loader forever when switching wizards.
    //
    // Navigate to the explicit `loadingPath` (the intended destination), NOT
    // `from.path`. For the wizard/tool remount trampolines loadingPath is set to
    // the route the user is already on, so the two are identical. But for a MAS
    // upload from home, loadingPath is `magnetic_tool` while from.path is `/`;
    // using from.path there bounced the user silently back home when the engine
    // was already loaded (intermittent — only when $mkf was warm at upload time).
    else if (app.config.globalProperties.$userStore.loadingPath !=null && app.config.globalProperties.$mkf != null && to.name == "EngineLoader") {
        const newPath = app.config.globalProperties.$userStore.loadingPath;
        app.config.globalProperties.$userStore.loadingPath = null;
        setTimeout(() => {router.push(newPath);}, 500);
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
        preloadKirchhoff();
    }

    if (loadData) {
        // Data views need webKirchhoff too (wizard auto-runs fire on mount) — the home-page
        // preload never happened on a direct /wizards deep-link, and without this the
        // kirchhoff worker never initializes and waitForKirchhoff() pends forever (every
        // converter action appears dead). Idempotent: guarded by kirchhoffPreloadPromise.
        // Only start it once MKF is up: compiling the 15 MB kirchhoff WASM concurrently with
        // the critical-path MKF cold init pushes the engine_loader past its time budget
        // (the fresh-init branch below fires it right after MKF is ready instead).
        if (app.config.globalProperties.$mkf != null) {
            preloadKirchhoff();
        }
        if (app.config.globalProperties.$mkf == null && to.name != "EngineLoader") {
            // fullPath, not path: emailed links (/reset_password?token=...,
            // /accept_invite?id=..., share pages) must keep their query
            // string across the engine-loader bounce.
            app.config.globalProperties.$userStore.loadingPath = to.fullPath
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
                        const wasmJsUrl = getVersionedWasmUrl(`${import.meta.env.BASE_URL}wasm/libMKF.wasm.js`);
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

                    // MKF is up — now warm webKirchhoff off the critical path (fire-and-forget,
                    // idempotent). Deep-linked wizard views get a working converter engine
                    // moments later without having competed with the MKF cold compile above.
                    preloadKirchhoff();
                    
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

                    // Re-inject the user's Core Studio parts (custom shapes/
                    // materials) on top of the catalog. The preload path does
                    // this too; the loaders upsert by name so it's idempotent.
                    await useCustomPartsStore().reinject(mkf);

                    // Account inventory scope (idempotent, see preload path).
                    try {
                        await useInventoryStore().applyScope(mkf);
                    } catch (error) {
                        console.error('Inventory scope could not be applied:', error);
                    }
                    console.warn("All data loaded");
                    
                    // Initialize model settings from WASM
                    console.warn("Initializing model settings...");
                    const modelSettingsStore = useModelSettingsStore();
                    await modelSettingsStore.loadFromWASM();
                    console.warn("Model settings initialized");

                    // Ensure minimum loader display time before navigating
                    // Fall back to home when loadingPath is null — happens when
                    // the user pastes /engine_loader directly and there's no
                    // prior destination to return to. Without this, router.push(null)
                    // throws TypeError ("Cannot read properties of null reading
                    // 'path'") and the loader is stuck forever.
                    const newPath = app.config.globalProperties.$userStore.loadingPath
                        || `${import.meta.env.BASE_URL}`;
                    app.config.globalProperties.$userStore.loadingPath = null;
                    const elapsedTime = Date.now() - loaderStartTime;
                    const remainingTime = Math.max(0, minimumLoaderTime - elapsedTime);
                    // Only redirect to the original destination if the user hasn't
                    // navigated away from the engine_loader in the meantime (e.g. by
                    // clicking the home logo while WASM was still loading).
                    //
                    // The check must RETRY, not run once: when the WASM was already
                    // preloaded, this code finishes before the router has resolved
                    // the (lazy-loaded) /engine_loader navigation itself, so
                    // currentRoute is still the previous route at the first check.
                    // A one-shot check loses that race and parks the app on
                    // /engine_loader forever.
                    const redirectDeadline = Date.now() + 10000;
                    const redirectWhenOnLoader = () => {
                        if (router.currentRoute.value.name === 'EngineLoader') {
                            router.push(newPath);
                        }
                        else if (Date.now() < redirectDeadline) {
                            setTimeout(redirectWhenOnLoader, 100);
                        }
                        // else: the user really navigated somewhere else — leave them be.
                    };
                    setTimeout(redirectWhenOnLoader, remainingTime)
                } catch (error) {
                    console.error("Error initializing MKF:", error);
                }
            })();

        }
    }

    next();
})