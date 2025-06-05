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
import Module from '/src/assets/js/libMKF.wasm.js';
import { useStyleStore } from '/src/stores/style'
import { useWeStyleStore } from '/src/stores/weStyle'
import { useFairRiteStyleStore } from '/src/stores/fairRiteStyle'
import { VueWindowSizePlugin } from 'vue-window-size/plugin';


const axiosInstance = axios.create()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App);
app.use(router);
app.use(pinia)
app.use(VueCookies, { expires: '7d'})
app.directive("tooltip", tooltip);
app.use(VueWindowSizePlugin);
app.config.globalProperties.$axios = axiosInstance
app.config.globalProperties.$userStore = useUserStore()
app.config.globalProperties.$settingsStore = useSettingsStore()
app.config.globalProperties.$stateStore = useStateStore()

app.mount("#app");

router.beforeEach((to, from, next) => {

    if (app.config.globalProperties.$mkf != null && (to.name == "EngineLoader" || to.name == "WEEngineLoader")) {
        // If WASM is loaded and we go to enginer loader, we just return to where we were
        setTimeout(() => {router.push(from.path);}, 500);
    }

    const nonDataViews = ['/', '/home', '/insulation_adviser']

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
            router.push('/we_engine_loader')
        }
        else if (app.config.globalProperties.$mkf == null && to.name != "EngineLoader" && !weWorkflow) {
            app.config.globalProperties.$userStore.loadingPath = to.path
            router.push('/engine_loader')
        }
        else if (app.config.globalProperties.$mkf == null && (to.name == "EngineLoader" || to.name == "WEEngineLoader")) {
            const loadAllParts = !weWorkflow || (weWorkflow && app.config.globalProperties.$settingsStore.catalogAdviserSettings.useAllParts);
            const loadExternalParts = true;
            // const loadExternalParts = weWorkflow;
            setTimeout(() => 
                {

                    console.warn("Loading core materials in backend")
                    fetch("/core_materials.ndjson")
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
                    try {
                        app.config.globalProperties.$mkf = {
                            ready: new Promise(resolve => {
                                Module({
                                    onRuntimeInitialized () {
                                        app.config.globalProperties.$mkf = Object.assign(this, {
                                            ready: Promise.resolve()
                                        });

                                        app.config.globalProperties.$mkf.ready.then(_ => {
                                            fetch("/core_materials.ndjson")
                                            .then((data) => data.text())
                                            .then((data) => {
                                                    if (loadAllParts) {
                                                        app.config.globalProperties.$mkf.load_core_materials("");
                                                    }
                                                    if (loadExternalParts) {
                                                        app.config.globalProperties.$mkf.load_core_materials(data);
                                                    }
                                                })
                                            .catch((error) => {
                                                console.error("error fetching core_materials.ndjson")
                                                console.error(error)
                                            })
                                            console.warn("Loading core shapes in simulator")
                                            fetch("/core_shapes.ndjson")
                                            .then((data) => data.text())
                                            .then((data) => {
                                                    if (loadAllParts) {
                                                        app.config.globalProperties.$mkf.load_core_shapes("");
                                                    }
                                                    if (loadExternalParts) {
                                                        app.config.globalProperties.$mkf.load_core_shapes(data);
                                                    }
                                            })
                                            .catch((error) => {
                                                console.error("error fetching core_shapes.ndjson")
                                                console.error(error)
                                            })
                                            console.warn("Loading wires in simulator")
                                            app.config.globalProperties.$mkf.load_wires("");
                                            router.push(app.config.globalProperties.$userStore.loadingPath)
                                        }).catch((error) => {
                                            console.error(error)
                                        })

                                        resolve(); 
                                    }
                                });
                            })
                        };
                    }
                    catch(error){
                        // console.error(error);
                    }
                }
                , 100);

        }
    }

    next();
})