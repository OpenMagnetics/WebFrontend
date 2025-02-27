<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'

import CmcWizard from '../components/Wizards/CmcWizard.vue'

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
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

