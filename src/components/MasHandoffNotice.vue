<script setup>
import { masHandoff } from '/src/composables/masHandoff'
</script>

<script>
// The state of a ?handoff=mas design handoff (composables/masHandoff.js), on every page: waiting for
// the design, opening it, or why it could not be opened. Nothing is shown on a normal visit.
export default {
    computed: {
        state() { return masHandoff.value; },
        visible() { return this.state != null && this.state.status !== 'loaded'; },
        senderName() { return this.state?.sender ?? 'the page that opened OpenMagnetics'; },
    },
    methods: {
        dismiss() { masHandoff.value = null; },
    },
}
</script>

<template>
    <div v-if="visible" class="om-mas-handoff" :class="{ 'om-mas-handoff-error': state.status === 'error' }"
         data-cy="MasHandoff-notice" :data-status="state.status"
         :role="state.status === 'error' ? 'alert' : 'status'" aria-live="polite">
        <i :class="state.status === 'error' ? 'pi pi-exclamation-triangle' : 'pi pi-spin pi-spinner'" aria-hidden="true"></i>
        <span v-if="state.status === 'waiting'" data-cy="MasHandoff-waiting">Waiting for the design from {{ senderName }}…</span>
        <span v-else-if="state.status === 'loading'" data-cy="MasHandoff-loading">Opening the design from {{ senderName }}…</span>
        <span v-else data-cy="MasHandoff-error" class="om-mas-handoff-message">{{ state.message }}</span>
        <button v-if="state.status === 'error'" type="button" class="om-mas-handoff-close" data-cy="MasHandoff-dismiss"
                aria-label="Dismiss" @click="dismiss"><i class="pi pi-times" aria-hidden="true"></i></button>
    </div>
</template>

<style scoped>
.om-mas-handoff {
    position: fixed;
    top: 72px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    max-width: min(720px, calc(100vw - 32px));
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 6px;
    color: rgba(var(--p-white-rgb), 0.92);
    background: rgba(var(--p-dark-rgb), 0.97);
    border: 1px solid rgba(var(--p-primary-rgb), 0.35);
    border-left: 3px solid var(--p-primary);
    box-shadow: 0 8px 32px rgba(var(--p-black-rgb), 0.5);
}
.om-mas-handoff > .pi { margin-top: 3px; color: var(--p-primary); }
.om-mas-handoff-error { border-color: rgba(var(--p-danger-rgb), 0.5); border-left-color: rgb(var(--p-danger-rgb)); }
.om-mas-handoff-error > .pi { color: rgb(var(--p-danger-rgb)); }
.om-mas-handoff-message { white-space: pre-line; }
.om-mas-handoff-close {
    margin-left: auto;
    background: transparent;
    border: 0;
    color: inherit;
    cursor: pointer;
    padding: 2px 4px;
}
</style>
