import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'


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
    {
        path: '/musings/1_critic_dowell_method_global_ac_resistance',
        name: 'Musings1',
        component: () => import('../views/musings/Musing1.vue')
    },
    {
        path: '/musings/2_critic_dowell_method_mmf_inductor',
        name: 'Musings2',
        component: () => import('../views/musings/Musing2.vue')
    },
    {
        path: '/musings/3_critic_dowell_method_harmonics',
        name: 'Musings3',
        component: () => import('../views/musings/Musing3.vue')
    },
    {
        path: '/musings/4_roshen_method_core_losses',
        name: 'Musings4',
        component: () => import('../views/musings/Musing4.vue')
    },
    {
        path: '/musings/5_magnetic_components_for_dummies',
        name: 'Musings5',
        component: () => import('../views/musings/Musing5.vue')
    },
    {
        path: '/musings/6_magnetic_cores_for_dummies',
        name: 'Musings6',
        component: () => import('../views/musings/Musing6.vue')
    },
    {
        path: '/musings/7_magnetic_core_shapes_effective_parameters',
        name: 'Musings7',
        component: () => import('../views/musings/Musing7.vue')
    },
    {
        path: '/musings/8_magnetic_cores_shape_etymology_and_economy',
        name: 'Musings8',
        component: () => import('../views/musings/Musing8.vue')
    },
    {
        path: '/musings/9_inductance_methods_and_ieee_study',
        name: 'Musings9',
        component: () => import('../views/musings/Musing9.vue')
    },
    {
        path: '/musings/10_gap_reluctance_and_muehlethaler_method',
        name: 'Musings10',
        component: () => import('../views/musings/Musing10.vue')
    },
    {
        path: '/musings/11_inductance_variables_and_stenglein_method',
        name: 'Musings11',
        component: () => import('../views/musings/Musing11.vue')
    },
    {
        path: '/musings/12_reluctance_magnetic_core_permeability_dependencies',
        name: 'Musings12',
        component: () => import('../views/musings/Musing12.vue')
    },
    {
        path: '/tool_selection',
        name: 'ToolSelection',
        component: () => import('../views/ToolSelection.vue')
    },
    {
        path: '/magnetic_adviser',
        name: 'MagneticAdviser',
        component: () => import('../views/MagneticAdviser.vue')
    },
    {
        path: '/magnetic_specification',
        name: 'MagneticSpecification',
        component: () => import('../views/MagneticSpecification.vue')
    },
    {
        path: '/magnetic_core_adviser',
        name: 'MagneticCoreAdviser',
        component: () => import('../views/MagneticCoreAdviser.vue')
    },
    {
        path: '/insulation_adviser',
        name: 'InsulationAdviser',
        component: () => import('../views/InsulationAdviser.vue')
    },
]
const router = createRouter({
    history: createWebHistory(),
    routes,
});


export default router
