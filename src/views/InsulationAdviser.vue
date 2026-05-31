<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { toTitleCase } from 'WebSharedComponents/assets/js/utils.js'

import GenericTool from '../components/Toolbox/GenericTool.vue'

</script>

<script>
export default {
    data() {
        const currentStoryline = {
            "insulationRequirements": {
                title: "Insulation Requirements",
            },
        };

        return {
            currentStoryline,
            updateStoryline: 0,
        }
    },
    created() {
        // The workflow / tool selection is normally set by the Header click
        // handler (onInsulationCoordinator). Replay it here so that visiting
        // /insulation_adviser directly (deep-link, refresh, automated test)
        // mounts the InsulationAdviser panel instead of the default
        // Magnetic Builder Design Requirements view.
        // Must run in `created()` (not `mounted()`) so that GenericTool's
        // first render picks the insulation subsection — otherwise the
        // template falls through to MagneticBuilder, whose BasicCoreSelector
        // crashes on an empty style store.
        this.$stateStore.resetMagneticTool();
        this.$stateStore.selectWorkflow("insulationCoordinator");
        this.$stateStore.selectTool("insulationAdviser");
        this.$stateStore.setCurrentToolSubsection("insulationRequirements");
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header/>
        <main class="container-fluid wrap p-0 flex-grow-1">
            <GenericTool
                class="container content"
                :currentStoryline="currentStoryline"
                :showStoryline="false"
                :dataTestLabel="'InsulationAdviser'"
            />
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>


<style lang="css">
.wrap {
  position: relative;
}

.wrap:before {
      content: ' ';
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 1;
      background-image: linear-gradient(to bottom, rgba(var(--p-dark-rgb), 0.9), rgba(var(--p-dark-rgb), 1)), url('/images/background_insulation.jpg');
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
}

.content {
    background-color: transparent;
    position: relative;
}

</style>
