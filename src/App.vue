<template>
    <router-view />
</template>

<script setup>
import { engineConstants } from '/src/assets/js/defaults.js'
</script>

<script>
export default {
    name: "App",
    created() {
        return this.$axios.post(import.meta.env.VITE_API_ENDPOINT + '/get_constants', {})
        .then(response => {
            for (const [key, value] of Object.entries(response.data)) {
                engineConstants[key] = Number(value)
            }
            console.log(engineConstants)
        })
        .catch(error => {
                console.error("Could not read constants from MKF")
        });
    }
};
</script>

<style scoped>
.logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
}
.logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
    filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
