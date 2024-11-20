import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../views/Home.vue')
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
        name: 'PowerMagneticTool',
        component: () => import('../views/PowerMagneticTool.vue')
    },
    {
        path: '/filter_magnetic_tool',
        name: 'FilterMagneticTool',
        component: () => import('../views/FilterMagneticTool.vue')
    },
    {
        path: '/insulation_adviser',
        name: 'InsulationAdviser',
        component: () => import('../views/InsulationAdviser.vue')
    },
    // {
    //     path: '/dune',
    //     name: 'Dune',
    //     component: () => import('../views/Dune.vue')
    // },
    {
        path: '/cross_referencer_selection',
        name: 'CrossReferencerSelection',
        component: () => import('../views/CrossReferencerSelections/CrossReferencerSelection.vue')
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
        path: '/cross_referencer_selection_standex',
        name: 'CrossReferencerSelectionStandex',
        component: () => import('../views/CrossReferencerSelections/CrossReferencerSelectionStandex.vue')
    },
    {
        path: '/core_cross_referencer_standex',
        name: 'CoreCrossReferencerStandex',
        component: () => import('../views/CrossReferencers/CrossReferencerStandex.vue')
    },
    {
        path: '/core_material_cross_referencer_standex',
        name: 'CoreMaterialCrossReferencerStandex',
        component: () => import('../views/CrossReferencers/CrossReferencerStandex.vue')
    },
    {
        path: '/core_shape_cross_referencer_standex',
        name: 'CoreShapeCrossReferencerStandex',
        component: () => import('../views/CrossReferencers/CrossReferencerStandex.vue')
    },


    {
        path: '/cross_referencer_selection_fair_rite',
        name: 'CrossReferencerSelectionFairRite',
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
        path: '/cross_referencer_selection_ferroxcube',
        name: 'CrossReferencerSelectionFerroxcube',
        component: () => import('../views/CrossReferencerSelections/CrossReferencerSelectionFerroxcube.vue')
    },
    {
        path: '/core_cross_referencer_ferroxcube',
        name: 'CoreCrossReferencerFerroxcube',
        component: () => import('../views/CrossReferencers/CrossReferencerFerroxcube.vue')
    },
    {
        path: '/core_material_cross_referencer_ferroxcube',
        name: 'CoreMaterialCrossReferencerFerroxcube',
        component: () => import('../views/CrossReferencers/CrossReferencerFerroxcube.vue')
    },
    {
        path: '/core_shape_cross_referencer_ferroxcube',
        name: 'CoreShapeCrossReferencerFerroxcube',
        component: () => import('../views/CrossReferencers/CrossReferencerFerroxcube.vue')
    },


    {
        path: '/cross_referencer_selection_magnetics',
        name: 'CrossReferencerSelectionMagnetics',
        component: () => import('../views/CrossReferencerSelections/CrossReferencerSelectionMagnetics.vue')
    },
    {
        path: '/core_cross_referencer_magnetics',
        name: 'CoreCrossReferencerMagnetics',
        component: () => import('../views/CrossReferencers/CrossReferencerMagnetics.vue')
    },
    {
        path: '/core_material_cross_referencer_magnetics',
        name: 'CoreMaterialCrossReferencerMagnetics',
        component: () => import('../views/CrossReferencers/CrossReferencerMagnetics.vue')
    },
    {
        path: '/core_shape_cross_referencer_magnetics',
        name: 'CoreShapeCrossReferencerMagnetics',
        component: () => import('../views/CrossReferencers/CrossReferencerMagnetics.vue')
    },


    {
        path: '/cross_referencer_selection_micrometals',
        name: 'CrossReferencerSelectionMicrometals',
        component: () => import('../views/CrossReferencerSelections/CrossReferencerSelectionMicrometals.vue')
    },
    {
        path: '/core_cross_referencer_micrometals',
        name: 'CoreCrossReferencerMicrometals',
        component: () => import('../views/CrossReferencers/CrossReferencerMicrometals.vue')
    },
    {
        path: '/core_material_cross_referencer_micrometals',
        name: 'CoreMaterialCrossReferencerMicrometals',
        component: () => import('../views/CrossReferencers/CrossReferencerMicrometals.vue')
    },
    {
        path: '/core_shape_cross_referencer_micrometals',
        name: 'CoreShapeCrossReferencerMicrometals',
        component: () => import('../views/CrossReferencers/CrossReferencerMicrometals.vue')
    },


    {
        path: '/cross_referencer_selection_tdk',
        name: 'CrossReferencerSelectionTDK',
        component: () => import('../views/CrossReferencerSelections/CrossReferencerSelectionTDK.vue')
    },
    {
        path: '/core_cross_referencer_tdk',
        name: 'CoreCrossReferencerTDK',
        component: () => import('../views/CrossReferencers/CrossReferencerTDK.vue')
    },
    {
        path: '/core_material_cross_referencer_tdk',
        name: 'CoreMaterialCrossReferencerTDK',
        component: () => import('../views/CrossReferencers/CrossReferencerTDK.vue')
    },
    {
        path: '/core_shape_cross_referencer_tdk',
        name: 'CoreShapeCrossReferencerTDK',
        component: () => import('../views/CrossReferencers/CrossReferencerTDK.vue')
    },

]
const router = createRouter({
    history: createWebHistory(),
    routes,
});


export default router
