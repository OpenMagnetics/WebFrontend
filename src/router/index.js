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
        path: '/terms',
        name: 'TermsOfService',
        component: () => import('../views/TermsOfService.vue')
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
        path: '/core_studio',
        name: 'CoreStudio',
        component: () => import('../views/CoreStudio.vue')
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
    {
        path: '/designs',
        name: 'MyDesigns',
        component: () => import('../views/MyDesigns.vue')
    },
    {
        path: '/account',
        name: 'Account',
        component: () => import('../views/Account.vue')
    },
    {
        path: '/inventory',
        name: 'MyInventory',
        component: () => import('../views/MyInventory.vue')
    },
    {
        path: '/share/d/:token',
        name: 'SharedDesign',
        component: () => import('../views/SharedDesign.vue')
    },
    {
        path: '/share/i/:token',
        name: 'SharedInventory',
        component: () => import('../views/SharedInventory.vue')
    },
    {
        path: '/orgs',
        name: 'Organizations',
        component: () => import('../views/Organizations.vue')
    },
    {
        path: '/accept_invite',
        name: 'AcceptInvite',
        component: () => import('../views/AcceptInvite.vue')
    },
    {
        path: '/verify_email',
        name: 'VerifyEmail',
        component: () => import('../views/EmailAction.vue')
    },
    {
        path: '/reset_password',
        name: 'ResetPassword',
        component: () => import('../views/EmailAction.vue')
    },
    {
        // Catch-all: unknown paths render a blank page otherwise (vue-router
        // mounts nothing without a matching route). Send the user home.
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        redirect: '/',
    },

]
const router = createRouter({
    history: createWebHistory(),
    routes,
});


export default router
