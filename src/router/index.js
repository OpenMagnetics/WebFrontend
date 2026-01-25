import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/Home.vue')
    },
    {
        path: '/engine_loader',
        name: 'EngineLoader',
        component: () => import('../views/EngineLoader.vue')
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
        path: '/magnetic_tool',
        name: 'MagneticTool',
        component: () => import('../views/MagneticTool.vue')
    },
    {
        path: '/insulation_adviser',
        name: 'InsulationAdviser',
        component: () => import('../views/InsulationAdviser.vue')
    },


    {
        path: '/catalog_tool',
        name: 'CatalogTool',
        component: () => import('../views/CatalogTool.vue')
    },
    {
        path: '/catalog',
        name: 'Catalog',
        component: () => import('../views/Catalog.vue')
    },
    {
        path: '/magnetic_viewer',
        name: 'MagneticViewer',
        component: () => import('../views/MagneticViewer.vue')
    },

    {
        path: '/wizards',
        name: 'Wizards',
        component: () => import('../views/Wizards.vue')
    },
    {
        path: '/wizards_landing',
        name: 'WizardsLanding',
        component: () => import('../views/WizardsLanding.vue')
    },


    // {
    //     path: '/dune',
    //     name: 'Dune',
    //     component: () => import('../views/Dune.vue')
    // },
    {
        path: '/cross_referencer_selection',
        name: 'CrossReferencerSelection',
        component: () => import('../views/CrossReferencerSelections/CrossReferencerSelectionFairRite.vue')
    },
    {
        path: '/core_cross_referencer_fair_rite',
        name: 'CoreCrossReferencerFairRite',
        component: () => import('../views/CrossReferencers/CrossReferencerFairRite.vue')
    },
    {
        path: '/core_material_cross_referencer_fair_rite',
        name: 'CoreMaterialCrossReferencerFairRite',
        component: () => import('../views/CrossReferencers/CrossReferencerFairRite.vue')
    },
    {
        path: '/core_shape_cross_referencer_fair_rite',
        name: 'CoreShapeCrossReferencerFairRite',
        component: () => import('../views/CrossReferencers/CrossReferencerFairRite.vue')
    },
    {
        path: '/core_cross_referencer',
        name: 'CoreCrossReferencer',
        component: () => import('../views/CrossReferencers/CrossReferencer.vue')
    },
    {
        path: '/core_material_cross_referencer',
        name: 'CoreMaterialCrossReferencer',
        component: () => import('../views/CrossReferencers/CrossReferencer.vue')
    },
    {
        path: '/core_shape_cross_referencer',
        name: 'CoreShapeCrossReferencer',
        component: () => import('../views/CrossReferencers/CrossReferencer.vue')
    },

]
const router = createRouter({
    history: createWebHistory(),
    routes,
});


export default router
