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
import { initWorker, applyRealWindingGeometrySetting } from 'WebSharedComponents/assets/js/mkfRuntime'
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

            // Real winding BEFORE the first wind. The painter draws the turns it is
            // given and never re-winds, so a coil wound while this was still off is
            // painted as idealised rings however the flag reads later — which is what
            // made the 2D view fall back to the ideal layout on every page reload.
            await applyRealWindingGeometrySetting(
                mkf, useSettingsStore().magneticBuilderSettings.useRealWindingGeometry);
            
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

// Every exit from /engine_loader must be VERIFIED, not fire-and-forget. A one-shot router.push can be
// issued while the loader navigation is still in flight and simply be superseded, which parks the app
// on the loader until the tab is closed (ABT #909). Sitting on the loader once the engine is ready is
// ALWAYS wrong, so: push, then keep re-checking until we are actually off it. Stops immediately when
// we leave — including when the user navigated somewhere else themselves, since then the route is no
// longer EngineLoader and we must not yank them.
function leaveEngineLoader(router, targetPath) {
    if (targetPath == null) return;
    const deadline = Date.now() + 60000;
    let attempts = 0;
    const tryLeave = () => {
        if (router.currentRoute.value.name !== 'EngineLoader') return;   // out, or the user moved
        attempts++;
        if (attempts === 1 || attempts % 20 === 0) {
            console.warn(`[EngineLoader] still on the loader after ${attempts} exit attempt(s); `
                         + `target=${targetPath}`);
        }
        router.push(targetPath).catch((e) => {
            const msg = String(e?.message || e);
            console.warn('[EngineLoader] router.push was rejected:', msg);
            // A route's lazy chunk failed to load, so the SPA navigation can never succeed and
            // retrying it is pointless — every attempt fails the same way and the app sits on the
            // loader forever (ABT #909). This happens in dev when vite cannot serve a module under
            // concurrent cold loads, and in production when a deploy has replaced the hashed chunk
            // this tab still references. Both recover from a hard navigation, which re-fetches the
            // current index.html and its chunk map. Once per target, so a genuinely broken build
            // cannot put us in a reload loop.
            if (!/dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg)) return;
            const key = 'omHardNavAfterChunkFailure:' + targetPath;
            try {
                if (sessionStorage.getItem(key)) return;
                sessionStorage.setItem(key, '1');
            } catch { /* private mode: fall through and navigate anyway */ }
            console.warn('[EngineLoader] lazy chunk unavailable — recovering with a full page load');
            window.location.assign(targetPath);
        });
        if (Date.now() < deadline) setTimeout(tryLeave, 250);
    };
    tryLeave();
}

router.beforeEach((to, from, next) => {

    if (app.config.globalProperties.$mkf != null && !app.config.globalProperties.$mkf._loading && to.name == "EngineLoader") {
        if (app.config.globalProperties.$userStore.loadingPath != null) {
            const newPath = app.config.globalProperties.$userStore.loadingPath;
            app.config.globalProperties.$userStore.loadingPath = null;
            leaveEngineLoader(router, newPath);
        }
        else {
            // If WASM is loaded and we go to engine loader, we just return to where we were
            setTimeout(() => leaveEngineLoader(router, from.path), 500);
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
        setTimeout(() => leaveEngineLoader(router, newPath), 500);
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
                        const freshMkf = await initWorker(wasmJsUrl);
                        // Same as the preload path: the flag has to be in the engine
                        // before anything winds, not before anything paints.
                        await applyRealWindingGeometrySetting(
                            freshMkf, useSettingsStore().magneticBuilderSettings.useRealWindingGeometry);
                        return freshMkf;
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
                    // Diagnostic flag (ABT #909): lets a stalled page be classified as "engine came
                    // up but the router never left the loader" vs "the engine never came up".
                    window.__omEngineReady = true;
                    // ABT #929: the engine is up, so a LATER transient failure deserves its own
                    // retry budget rather than inheriting a spent one from earlier in this session.
                    try { sessionStorage.removeItem('omEngineInitRetries'); } catch { /* private mode */ }

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
                    // This used to be a 100 ms poll bounded by a 10 s deadline. Under load — several
                    // WASM engines compiling at once, or a cold vite dep-optimise after a rebuild —
                    // the router can take longer than that to resolve the lazy-loaded EngineLoader
                    // route. When the poll gave up first, nothing was left to move the app on and it
                    // parked on /engine_loader until the tab was closed: the stall behind ABT #909
                    // (and the reason batch Playwright runs produced a different set of
                    // openWizard timeouts every time).
                    //
                    // Watch the router instead of racing a clock. The guard is unchanged — only ever
                    // redirect while we are ACTUALLY on the loader — so a user who navigated away is
                    // never yanked, which is what makes an unbounded watcher safe: the loader is a
                    // trampoline, never a destination.
                    // Not necessarily on the loader yet — the navigation to it may still be
                    // resolving — so watch for it landing as well as retrying the exit itself.
                    let stopWatching = null;
                    const exit = () => {
                        if (router.currentRoute.value.name === 'EngineLoader') {
                            if (stopWatching) { stopWatching(); stopWatching = null; }
                            leaveEngineLoader(router, newPath);
                            return true;
                        }
                        return false;
                    };
                    setTimeout(() => {
                        if (exit()) return;
                        stopWatching = router.afterEach(() => { exit(); });
                    }, remainingTime)
                } catch (error) {
                    // A throw here leaves the app on /engine_loader with a spinner and no
                    // explanation. Mark it distinctively so a stall can be told apart from the
                    // routing race above (ABT #909) instead of both looking like "it hung".
                    window.__omEngineLoadError = String(error?.message || error);
                    console.error("[EngineLoader] engine initialization FAILED — the app cannot leave "
                                  + "the loader:", error);
                    // ABT #929: "cannot leave the loader" used to be the end of it — the spinner ran
                    // forever under a heading promising "just a few seconds", and the tab had to be
                    // closed. The dominant cause is a transient failure fetching the 32 MB engine,
                    // which a fresh document clears, so retry before giving up. Bounded via
                    // sessionStorage exactly like the chunk-failure recovery in leaveEngineLoader,
                    // so a genuinely broken build cannot put the app in a reload loop.
                    const retryKey = 'omEngineInitRetries';
                    let attempts = 0;
                    try { attempts = Number(sessionStorage.getItem(retryKey) || 0); } catch { /* private mode */ }
                    if (attempts < 2) {
                        try { sessionStorage.setItem(retryKey, String(attempts + 1)); } catch { /* private mode */ }
                        console.warn(`[EngineLoader] retrying engine initialization `
                                     + `(attempt ${attempts + 1} of 2) with a full page load`);
                        window.location.reload();
                        return;
                    }
                    // Out of retries: stop showing a spinner that implies progress. The loader view
                    // renders this instead (EngineLoader.vue), so the user learns what happened and
                    // can retry deliberately rather than watching an animation that means nothing.
                    console.error('[EngineLoader] giving up after ' + attempts + ' retries');
                    window.dispatchEvent(new CustomEvent('om-engine-load-failed', {
                        detail: { message: window.__omEngineLoadError },
                    }));
                }
            })();

        }
    }

    next();
})