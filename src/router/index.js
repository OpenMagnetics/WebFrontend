import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { useUserStore } from '/src/stores/user'
import { useDataCacheStore } from '/src/stores/dataCache'
import axios from "axios";

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/musings',
        name: 'Musings',
        component: () => import('../views/Musings.vue')
    },
    {
        path: '/cookie_policy',
        name: 'CookiePolicy',
        component: () => import('../views/CookiePolicy.vue')
    },
    {
        path: '/legal_notice',
        name: 'LegalNotice',
        component: () => import('../views/LegalNotice.vue')
    },
    {
        path: '/musings/:index',
        name: 'MusingLoader',
        component: () => import('../views/MusingsLoader.vue')
    },
    {
        path: '/roadmap',
        name: 'Roadmap',
        component: () => import('../views/Roadmap.vue')
    },
    {
        path: '/operation_point/:slug',
        name: 'OperationPointSlug',
        component: () => import('../views/SlugLoader.vue')
    },
    {
        path: '/operation_point',
        name: 'OperationPoint',
        component: () => import('../views/OperationPoint.vue')
    },
    {
        path: '/user',
        name: 'User',
        component: () => import('../views/User.vue')
    },
    {
        path: '/core',
        name: 'Core',
        component: () => import('../views/Core.vue')
    },
    {
        path: '/core_gapping_artisan',
        name: 'CoreGappingArtisan',
        component: () => import('../views/Core.vue')
    },
    {
        path: '/core_shape_artisan',
        name: 'CoreShapeArtisan',
        component: () => import('../views/Core.vue')
    },
    {
        path: '/core/:slug',
        name: 'CoreSlug',
        component: () => import('../views/SlugLoader.vue')
    },
    {
        path: '/simulation',
        name: 'Simulation',
        component: () => import('../views/Simulation.vue')
    },
    {
        path: '/simulation/:slug',
        name: 'SimulationSlug',
        component: () => import('../views/SlugLoader.vue')
    },
    {
        path: '/simulation_core_adviser',
        name: 'SimulationCoreAdviser',
        component: () => import('../views/Simulation.vue')
    },
    {
        path: '/simulation_inductance_calculator',
        name: 'SimulationInductanceCalculator',
        component: () => import('../views/Simulation.vue')
    },
]
const router = createRouter({
    history: createWebHistory(),
    routes,
});



router.beforeEach((to, from, next) => {
    const userStore = useUserStore()
    const dataCacheStore = useDataCacheStore()

    if (to.name == "CoreGappingArtisan") {
        userStore.coreSubsection = 'gappingArtisan';
    }
    else if (to.name == "CoreShapeArtisan") {
        userStore.coreSubsection = 'shapeArtisan';
    }
    else if (to.name == "SimulationCoreAdviser") {
        userStore.coreSimulationSubsection = 'coreAdviser';
    }
    else if (to.name == "SimulationInductanceCalculator") {
        userStore.coreSimulationSubsection = 'inductanceCalculator';
    }

    const nonDataViews = ['/', '/home', '/roadmap', '/musings']

    if (dataCacheStore.notificationsTimestamp == null || (dataCacheStore.notificationsTimestamp + dataCacheStore.notificationsTtlInMilliseconds < Date.now())) {
        dataCacheStore.notificationsTimestamp = Date.now()
        console.warn("Reloading notifications")
        const urlNotifications = import.meta.env.VITE_API_ENDPOINT + '/get_notifications'
        axios.post(urlNotifications, {})
        .then(response => {
            console.log(response.data)
            dataCacheStore.notifications = response.data["notifications"]
        })
        .catch(error => {
            console.error("Error getting notifications")
            console.error(error.data)
        });
    }
    if (!nonDataViews.includes(to.path)) {
        if (dataCacheStore.dataTimestamp == null || (dataCacheStore.dataTimestamp + dataCacheStore.dataTtlInMilliseconds < Date.now())) {
            dataCacheStore.dataTimestamp = Date.now()
            console.warn("Reloading data")

            const urlMaterials = import.meta.env.VITE_API_ENDPOINT + '/core_get_commercial_materials'
            const core = userStore.getGlobalCore
            axios.post(urlMaterials, {})
            .then(response => {
                console.log(response.data)
                dataCacheStore.commercialMaterials = response.data["commercial_materials"]
                dataCacheStore.commercialMaterialsLoaded()
            })
            .catch(error => {
                console.error("Error loading material library")
                console.error(error.data)
            });

            const urlShapes = import.meta.env.VITE_API_ENDPOINT + '/core_get_commercial_data'
            axios.post(urlShapes, {})
            .then(response => {
                console.log(response.data)
                dataCacheStore.commercialCores = response.data["commercial_cores"]
                response.data["commercial_cores"].forEach((item) => {
                    dataCacheStore.commercialShapes.push(item['functionalDescription']['shape'])
                })
                dataCacheStore.commercialShapesLoaded()
            })
            .catch(error => {
                console.error("Error loading shape library")
                console.error(error.data)
            });

        }
    }

    next()
})
export default router

