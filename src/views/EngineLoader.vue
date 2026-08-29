<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'


</script>

<script>
export default {
    data() {
        return {
            // ABT #929: the loader used to promise "just a few seconds" and spin forever when the
            // engine never came up — there was no failure state at all, so a stalled fetch of the
            // 32 MB engine looked identical to a slow one and the tab had to be closed. main.js
            // retries twice on its own; when it gives up it fires om-engine-load-failed and we say
            // so plainly, with the reason and a way out.
            loadFailed: false,
            failureMessage: '',
        }
    },
    mounted() {
        this.onEngineLoadFailed = (event) => {
            this.loadFailed = true;
            this.failureMessage = event?.detail?.message || '';
        };
        window.addEventListener('om-engine-load-failed', this.onEngineLoadFailed);
        // The failure may have fired before this view mounted (the engine init races the
        // lazy-loaded route), so pick up the flag main.js already set.
        if (window.__omEngineLoadError) {
            this.loadFailed = true;
            this.failureMessage = window.__omEngineLoadError;
        }
    },
    beforeUnmount() {
        window.removeEventListener('om-engine-load-failed', this.onEngineLoadFailed);
    },
    methods: {
        reload() {
            // Deliberate user retry: clear the exhausted budget so main.js will try again.
            try { sessionStorage.removeItem('omEngineInitRetries'); } catch { /* private mode */ }
            window.location.reload();
        },
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100" :style="$styleStore.engineLoader.main">
        <Header />
        <main role="main" class="main p-0 m-0 text-center" :style="$styleStore.engineLoader.main">
            <div v-if="!loadFailed" class="mt-5 pt-5">
                <h1 class="rounded-2 mt-5">Loading Magnetic Engine and Databases</h1>
                <h2 class="rounded-2 mt-1">(It will take just a few seconds)</h2>
                <img class="mx-auto d-block col-12" alt="loading" style="width: 30%; height: auto;" :src="$settingsStore.loadingGif">
            </div>
            <div v-else class="mt-5 pt-5" data-cy="EngineLoader-failed">
                <h1 class="rounded-2 mt-5">The magnetic engine could not be loaded</h1>
                <h2 class="rounded-2 mt-1">This is almost always a network problem while downloading the engine.</h2>
                <p class="mt-3" data-cy="EngineLoader-failure-reason">{{ failureMessage }}</p>
                <button class="btn btn-primary mt-3" data-cy="EngineLoader-retry-button" @click="reload">
                    Try again
                </button>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>
