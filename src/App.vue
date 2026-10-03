<template>
    <router-view />
    <CookieConsent />
    <ConsolePanel />
    <EngineLogPanel />
</template>

<script>
import CookieConsent from './components/CookieConsent.vue';
import ConsolePanel from './components/ConsolePanel.vue';
import EngineLogPanel from './components/EngineLogPanel.vue';

export default {
    name: "App",
    components: { CookieConsent, ConsolePanel, EngineLogPanel },
};
</script>

<style scoped>
</style>
