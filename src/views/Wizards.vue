<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'

import CmcWizard from '/src/components/Wizards/CmcWizard.vue'

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
                :dataTestLabel="'CmcWizard'"
            />
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

