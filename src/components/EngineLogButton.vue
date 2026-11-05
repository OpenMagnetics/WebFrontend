<script>
import { useEngineDiagnosticsStore } from '/src/stores/engineDiagnostics'

// The button that opens the Engine log (EngineLogPanel.vue). In the magnetic tool it sits in the tool
// menu, below Magnetic Adviser; on pages without the tool menu it sits in the footer (Alf, 2026-11-05).
// The tool menu's copy registers itself while rendered, and the footer's copy steps aside meanwhile,
// so the page always has exactly one.
export default {
    name: 'EngineLogButton',
    props: {
        placement: {
            type: String,
            required: true,
            validator: (value) => ['footer', 'toolMenu'].includes(value),
        },
    },
    setup() {
        const engineDiagnosticsStore = useEngineDiagnosticsStore();
        return { engineDiagnosticsStore };
    },
    computed: {
        shown() {
            if (!this.engineDiagnosticsStore.logReachable) return false;
            if (this.placement === 'footer') return this.engineDiagnosticsStore.toolMenuEngineLogButtons === 0;
            return true;
        },
        issueCount() {
            return this.engineDiagnosticsStore.warningCount + this.engineDiagnosticsStore.errorCount;
        },
        // Neutral when the log is quiet, soft yellow with warnings, red with errors.
        stateClass() {
            if (this.engineDiagnosticsStore.errorCount > 0) return 'engine-log-button-error';
            if (this.engineDiagnosticsStore.warningCount > 0) return 'engine-log-button-warning';
            return null;
        },
    },
    mounted() {
        if (this.placement === 'toolMenu') this.engineDiagnosticsStore.toolMenuEngineLogButtons += 1;
    },
    unmounted() {
        if (this.placement === 'toolMenu') this.engineDiagnosticsStore.toolMenuEngineLogButtons -= 1;
    },
};
</script>

<template>
    <button
        v-if="shown"
        class="engine-log-button"
        :class="[`engine-log-button-${placement}`, stateClass]"
        data-cy="EngineLogPanel-toggle"
        title="Engine log (MKF warnings and log)"
        @click="engineDiagnosticsStore.panelOpen = !engineDiagnosticsStore.panelOpen"
    >
        <i class="pi pi-cog"></i>
        <span>Engine log<template v-if="issueCount > 0"> ({{ issueCount }})</template></span>
    </button>
</template>

<style scoped>
.engine-log-button-footer {
    margin-left: 0.5rem;
    font-size: 0.74rem;
    font-weight: 600;
    color: var(--p-white);
    background: var(--p-secondary);
    border: 1px solid var(--p-secondary);
    border-radius: 5px;
    padding: 0.15rem 0.6rem;
    cursor: pointer;
    white-space: nowrap;
    transition: filter 0.15s;
}
.engine-log-button-footer i {
    margin-right: 0.25rem;
}
.engine-log-button-footer:hover {
    filter: brightness(1.15);
}

/* The tool menu styles its own buttons (passed in as classes); only the state colours are added. */
.engine-log-button.engine-log-button-warning {
    color: var(--p-warning);
    background: rgba(var(--p-warning-rgb), 0.18);
    border-color: rgba(var(--p-warning-rgb), 0.6);
}
.engine-log-button.engine-log-button-error {
    color: var(--p-white);
    background: var(--p-danger);
    border-color: var(--p-danger);
}
</style>
