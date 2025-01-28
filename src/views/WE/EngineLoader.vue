<script setup>
import Header from '/src/components/WE/Header.vue'


</script>

<script>
export default {
    props: {
    },
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
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main p-0 m-0 text-center">
            <div class="mt-5 pt-5"> 
            <h1 :class="$settingsStore.labelBgColor + ' ' + $settingsStore.textColor" class="rounded-2 mt-5">Loading Magnetic Engine and Databases</h1>
            <h2 :class="$settingsStore.labelBgColor + ' ' + $settingsStore.textColor" class="rounded-2 mt-1">(It will take just a few seconds)</h2>
            <img class="mx-auto d-block col-12" alt="loading" style="width: auto; height: 20%;" :src="$settingsStore.loadingGif">
            </div> 
        </main>
    </div>
</template>
