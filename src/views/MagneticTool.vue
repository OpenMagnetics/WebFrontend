<script setup>
import { useMasStore } from '../stores/mas'
import { useAdviseCacheStore } from '../stores/adviseCache'
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { toTitleCase } from 'WebSharedComponents/assets/js/utils.js'

import GenericTool from '../components/Toolbox/GenericTool.vue'
import { kirchhoffHandoff } from '/src/composables/kirchhoffHandoff'

</script>

<script>
const TOPOLOGY_HINT_DISMISSED_KEY = 'omTopologyHintDismissed';

export default {
    data() {
        const magneticBuilderStoryline = {
            "designRequirements": {
                title: "Design Req.",
                nextTool: "operatingPoints"
            },
            "operatingPoints": {
                title: "Op. Points",
                prevTool: "designRequirements",
                nextTool: "magneticBuilder",
            },
            "magneticBuilder": {
                title: "Magnetic Builder",
                prevTool: "operatingPoints",
                nextTool: "magneticSummary",
            },
            "magneticSummary": {
                title: "Summary",
                prevTool: "magneticBuilder",
            },
        };

        const currentStoryline = magneticBuilderStoryline;

        // ABT #161: a prior visit to the Insulation Coordinator (or Magnetic
        // Viewer) leaves selectedWorkflow pointing at a workflow that has no
        // magneticBuilder tool. GenericTool then resolves getCurrentToolState()
        // to undefined and renders a blank page. Restore a magnetic-tool
        // workflow deterministically whenever the current one cannot host the
        // magnetic builder — covers both the "Continue design" button and a
        // direct navigation / deep-link to /magnetic_tool.
        const activeWorkflow = this.$stateStore.selectedWorkflow;
        const activeWorkflowState = this.$stateStore.toolboxStates[activeWorkflow];
        if (!activeWorkflowState || !activeWorkflowState.magneticBuilder) {
            this.$stateStore.selectWorkflow("design");
        }

        if (kirchhoffHandoff.value) {
            // Kirchhoff handed us a MAS — the bridge already loaded the inputs into the mas store.
            // KEEP them (do NOT resetMas, which would wipe the operating point back to the default),
            // mark the design loaded, and jump straight to the magnetic adviser (it auto-runs there).
            this.$stateStore.selectTool("magneticBuilder");
            this.$stateStore.designLoaded();
            const adviseCacheStore = useAdviseCacheStore();
            adviseCacheStore.cleanCoreAdvises();
            adviseCacheStore.cleanMasAdvises();
            this.$stateStore.getCurrentToolState().subsection = 'magneticAdviser';
        }
        else if (!this.$stateStore.isAnyDesignLoaded()) {
            this.$stateStore.selectTool("magneticBuilder");
            this.$stateStore.designLoaded();
            const masStore = useMasStore();

            if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.Power) {
                this.$stateStore.reset();
                masStore.resetMas("power");
            }
            if (this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.CommonModeChoke) {
                this.$stateStore.reset();
                masStore.resetMas("filter");
            }


            const adviseCacheStore = useAdviseCacheStore();
            adviseCacheStore.cleanCoreAdvises();
            adviseCacheStore.cleanMasAdvises();
        }

        let topologyHintDismissed = false;
        try {
            topologyHintDismissed = localStorage.getItem(TOPOLOGY_HINT_DISMISSED_KEY) != null;
        } catch (error) {
            // Storage blocked (private window): the hint just shows again next time.
        }

        return {
            currentStoryline,
            masStore: useMasStore(),
            topologyHintDismissed,
            topologyHintDetail: "Enter the converter's specification and the operating points are computed for you.",
        }
    },
    computed: {
        // A manual power design still on its requirements, with no converter chosen: point to the
        // topology wizards, which compute the operating points from the converter's specification.
        showTopologyHint() {
            return !this.topologyHintDismissed
                && this.$stateStore.getCurrentApplication() == this.$stateStore.SupportedApplications.Power
                && this.$stateStore.getCurrentToolState()?.subsection == 'designRequirements'
                && this.masStore.mas.inputs.designRequirements.topology == null;
        },
    },
    methods: {
        async onStartFromTopology() {
            await this.$router.push(`${import.meta.env.BASE_URL}wizards_landing`);
        },
        dismissTopologyHint() {
            this.topologyHintDismissed = true;
            try {
                localStorage.setItem(TOPOLOGY_HINT_DISMISSED_KEY, '1');
            } catch (error) {
                // Storage blocked: dismissed for this visit only.
            }
        },
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100" :style="$styleStore.magneticBuilder.main">
        <Header
        />
        <main role="main" class="main">
            <div class="container">
                <div v-if="showTopologyHint" class="om-topology-hint" data-cy="MagneticTool-topology-hint">
                    <i class="pi pi-lightbulb om-topology-hint-icon"></i>
                    <span class="om-topology-hint-text">
                        Designing for a known converter (flyback, buck, LLC, PFC…)?
                    </span>
                    <span class="om-topology-hint-btn-wrap" v-tooltip.bottom="topologyHintDetail">
                        <button
                            class="om-topology-hint-btn"
                            data-cy="MagneticTool-topology-hint-start"
                            aria-describedby="MagneticTool-topology-hint-detail"
                            v-tooltip.bottom.focus="topologyHintDetail"
                            @click="onStartFromTopology"
                        >
                            Start from a converter topology
                        </button>
                        <span id="MagneticTool-topology-hint-detail" class="om-topology-hint-detail">{{ topologyHintDetail }}</span>
                    </span>
                    <button class="om-topology-hint-close" data-cy="MagneticTool-topology-hint-dismiss" title="Dismiss" @click="dismissTopologyHint">
                        <i class="pi pi-times"></i>
                    </button>
                </div>
                <GenericTool
                    :currentStoryline="currentStoryline"
                    :dataTestLabel="'MagneticBuilder'"
                    :showControlPanel="true"
                    :showAnsysButtons="true"
                />
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

<style scoped>
.om-topology-hint {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.75rem 0 0;
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(var(--p-primary-rgb), 0.4);
    border-radius: 8px;
    background: rgba(var(--p-primary-rgb), 0.08);
    color: var(--p-white);
    font-size: 0.85rem;
}

.om-topology-hint-icon {
    color: var(--p-primary);
    font-size: 1.1rem;
}

.om-topology-hint-text {
    flex: 1;
}

.om-topology-hint-btn-wrap {
    position: relative;
    display: inline-flex;
}

/* The banner's detail is the button's tooltip; this copy is for screen readers. */
.om-topology-hint-detail {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.om-topology-hint-btn {
    white-space: nowrap;
    font-weight: 600;
    color: var(--p-dark);
    background: var(--p-primary);
    border: 1px solid var(--p-primary);
    border-radius: 6px;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
}

.om-topology-hint-btn:hover {
    filter: brightness(1.1);
}

.om-topology-hint-close {
    background: transparent;
    border: none;
    color: rgba(var(--p-white-rgb), 0.6);
    cursor: pointer;
}

.om-topology-hint-close:hover {
    color: var(--p-white);
}
</style>
