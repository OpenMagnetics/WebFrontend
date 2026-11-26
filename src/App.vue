<template>
    <router-view />
    <CookieConsent />
    <ConsolePanel />
    <EngineLogPanel />
    <MasHandoffNotice />
</template>

<script>
import CookieConsent from './components/CookieConsent.vue';
import ConsolePanel from './components/ConsolePanel.vue';
import EngineLogPanel from './components/EngineLogPanel.vue';
import MasHandoffNotice from './components/MasHandoffNotice.vue';

export default {
    name: "App",
    components: { CookieConsent, ConsolePanel, EngineLogPanel, MasHandoffNotice },
};
</script>

<style scoped>
</style>
