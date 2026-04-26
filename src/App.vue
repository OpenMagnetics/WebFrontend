<template>
    <router-view />
    <CookieConsent />
    <ConsolePanel />
</template>

<script>
import CookieConsent from './components/CookieConsent.vue';
import ConsolePanel from './components/ConsolePanel.vue';

export default {
    name: "App",
    components: { CookieConsent, ConsolePanel },
};
</script>

<style scoped>
</style>
