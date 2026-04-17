<template>
    <router-view />
    <CookieConsent />
</template>

<script>
import CookieConsent from './components/CookieConsent.vue';

export default {
    name: "App",
    components: { CookieConsent },
};
</script>

<style scoped>
</style>
