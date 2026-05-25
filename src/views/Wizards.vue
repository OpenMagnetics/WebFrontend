<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'

import CmcWizard from '../components/Wizards/CmcWizard.vue'
import DmcWizard from '../components/Wizards/DmcWizard.vue'
import FlybackWizard from '../components/Wizards/FlybackWizard.vue'
import BuckBoostWizard from '../components/Wizards/BuckBoostWizard.vue'
import SepicWizard from '../components/Wizards/SepicWizard.vue'
import IsolatedBuckBoostWizard from '../components/Wizards/IsolatedBuckBoostWizard.vue'
import PushPullWizard from '../components/Wizards/PushPullWizard.vue'
import ForwardWizard from '../components/Wizards/ForwardWizard.vue'
import PfcWizard from '../components/Wizards/PfcWizard.vue'
import DabWizard from '../components/Wizards/DabWizard.vue'
import LlcWizard from '../components/Wizards/LlcWizard.vue'
import CllcWizard from '../components/Wizards/CllcWizard.vue'
import PsfbWizard from '../components/Wizards/PsfbWizard.vue'
import PshbWizard from '../components/Wizards/PshbWizard.vue'
import AhbWizard from '../components/Wizards/AhbWizard.vue'
import CukWizard from '../components/Wizards/CukWizard.vue'
import ZetaWizard from '../components/Wizards/ZetaWizard.vue'
import FourSwitchBuckBoostWizard from '../components/Wizards/FourSwitchBuckBoostWizard.vue'
import WeinbergWizard from '../components/Wizards/WeinbergWizard.vue'
import ClllcWizard from '../components/Wizards/ClllcWizard.vue'
import SrcWizard from '../components/Wizards/SrcWizard.vue'
import ViennaWizard from '../components/Wizards/ViennaWizard.vue'
import CurrentTransformerWizard from '../components/Wizards/CurrentTransformerWizard.vue'

</script>

<script>
export default {
    data() {
        return {
        }
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100" :style="$styleStore.main">
        <Header />
        <main role="main" class="main" :style="$styleStore.main">
            <CmcWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.CommonModeChoke"
                :dataTestLabel="'CmcWizard'"
            />
            <DmcWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.DifferentialModeChoke"
                :dataTestLabel="'DmcWizard'"
            />
            <FlybackWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Flyback"
                :dataTestLabel="'FlybackWizard'"
            />
            <BuckBoostWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Buck"
                :converterName="'Buck'"
                :dataTestLabel="'BuckWizard'"
            />
            <BuckBoostWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Boost"
                :converterName="'Boost'"
                :dataTestLabel="'BoostWizard'"
            />
            <SepicWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Sepic"
                :dataTestLabel="'SepicWizard'"
            />
            <IsolatedBuckBoostWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.IsolatedBuck"
                :converterName="'Isolated Buck'"
                :dataTestLabel="'IsolatedBuckWizard'"
            />
            <IsolatedBuckBoostWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.IsolatedBuckBoost"
                :converterName="'Isolated Buck-Boost'"
                :dataTestLabel="'IsolatedBuckBoostWizard'"
            />
            <PushPullWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.PushPull"
                :converterName="'Push-Pull'"
                :dataTestLabel="'PushPullWizard'"
            />
            <ForwardWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.SingleSwitchForward"
                :converterName="'Single-Switch Forward'"
                :dataTestLabel="'SingleSwitchForwardWizard'"
            />
            <ForwardWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.TwoSwitchForward"
                :converterName="'Two-Switch Forward'"
                :dataTestLabel="'TwoSwitchForwardWizard'"
            />
            <ForwardWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.ActiveClampForward"
                :converterName="'Active Clamp Forward'"
                :dataTestLabel="'ActiveClampForwardWizard'"
            />
            <PfcWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Pfc"
                :dataTestLabel="'PfcWizard'"
            />
            <DabWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.DualActiveBridge"
                :dataTestLabel="'DabWizard'"
            />
            <LlcWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.LlcResonant"
                :dataTestLabel="'LlcWizard'"
            />
            <CllcWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.CllcResonant"
                :dataTestLabel="'CllcWizard'"
            />
            <PsfbWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.PhaseShiftFullBridge"
                :dataTestLabel="'PsfbWizard'"
            />
            <PshbWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.PhaseShiftHalfBridge"
                :dataTestLabel="'PshbWizard'"
            />
            <AhbWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.AsymmetricHalfBridge"
                :dataTestLabel="'AhbWizard'"
            />
            <CukWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Cuk"
                :dataTestLabel="'CukWizard'"
            />
            <ZetaWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Zeta"
                :dataTestLabel="'ZetaWizard'"
            />
            <FourSwitchBuckBoostWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.FourSwitchBuckBoost"
                :dataTestLabel="'FourSwitchBuckBoostWizard'"
            />
            <WeinbergWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Weinberg"
                :dataTestLabel="'WeinbergWizard'"
            />
            <ClllcWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Clllc"
                :dataTestLabel="'ClllcWizard'"
            />
            <SrcWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.SeriesResonant"
                :dataTestLabel="'SrcWizard'"
            />
            <ViennaWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Vienna"
                :dataTestLabel="'ViennaWizard'"
            />
            <CurrentTransformerWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.CurrentTransformer"
                :dataTestLabel="'CurrentTransformerWizard'"
            />
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

