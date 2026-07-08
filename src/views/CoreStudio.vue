<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import CoreStudioPanel from '../components/CoreStudio/CoreStudioPanel.vue'
</script>

<!-- Core Studio page — the actual studio lives in components/CoreStudio/
     CoreStudioPanel.vue so other apps (e.g. CoreDataXWeb) can embed it with
     their own header/footer and theme. This view only wraps it in ours. -->

<template>
    <div class="d-flex flex-column min-vh-100" :style="$styleStore.magneticBuilder.main">
        <Header />
        <main role="main" class="main p-0 mx-0 mb-0 flex-grow-1">
            <CoreStudioPanel />
        </main>
        <Footer class="mt-auto" />
    </div>
</template>
