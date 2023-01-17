import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { useUserStore } from '/src/stores/user'

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
    if (to.name == "CoreGappingArtisan") {
        const userStore = useUserStore()
        userStore.coreSubsection = 'gappingArtisan';
    }
    else if (to.name == "CoreShapeArtisan") {
        const userStore = useUserStore()
        userStore.coreSubsection = 'shapeArtisan';
    }
    else if (to.name == "SimulationCoreAdviser") {
        const userStore = useUserStore()
        userStore.coreSimulationSubsection = 'coreAdviser';
    }
    else if (to.name == "SimulationInductanceCalculator") {
        const userStore = useUserStore()
        userStore.coreSimulationSubsection = 'inductanceCalculator';
    }
    next()
})
export default router

