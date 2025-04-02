<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'

import CmcWizard from '../components/Wizards/CmcWizard.vue'
import FlybackWizard from '../components/Wizards/FlybackWizard.vue'

</script>

<script>
export default {
    data() {
        return {
        }
    },
    methods: {
    },
    mounted() {
    },
    created() {
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
            <FlybackWizard
                v-if="$stateStore.getCurrentWizard() == $stateStore.Wizards.Flyback"
                :dataTestLabel="'FlybackWizard'"
            />
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

