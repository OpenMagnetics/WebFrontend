<script setup>
/*
 * FloatingHelpButton
 *
 * A bottom-right floating action button that launches the SAME guided-tour
 * mechanism as the Header's Help button (src/tours → startTourForContext).
 * It exists for views that do NOT render the Header (the cross-referencer
 * tools), so those pages still have a way to open their page tour.
 *
 * The tour that opens is resolved from the current route name exactly as the
 * Header button does, so a view only needs a matching entry in
 * src/tours/definitions.js (ROUTE_TOURS / SUBSECTION_TOURS).
 */
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStateStore } from '/src/stores/state'
import { startTourForContext } from '../tours'

const route = useRoute()
const stateStore = useStateStore()

// First-visit attention pulse for users who have never opened a tour,
// mirroring the Header help button (shares the same persisted flag).
const pulse = ref(localStorage.getItem('omHelpTourSeen') == null)

function startHelpTour() {
    localStorage.setItem('omHelpTourSeen', '1')
    pulse.value = false
    startTourForContext(route.name, stateStore)
}
</script>

<template>
    <button
        type="button"
        data-cy="FloatingHelpButton"
        class="om-floating-help-btn"
        :class="{ 'om-help-pulse': pulse }"
        aria-label="Interactive tour of this page"
        title="Interactive tour of this page"
        @click="startHelpTour"
    >
        <i class="pi pi-question-circle" aria-hidden="true"></i>
    </button>
</template>

<style scoped>
.om-floating-help-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: var(--p-primary);
    background: var(--p-dark);
    border: 1px solid rgba(var(--p-primary-rgb), 0.55);
    box-shadow: 0 4px 16px rgba(var(--p-black-rgb), 0.35);
    cursor: pointer;
    z-index: 1050;
    transition: background 0.15s, border-color 0.15s, transform 0.1s, box-shadow 0.15s;
}
.om-floating-help-btn:hover {
    background: rgba(var(--p-primary-rgb), 0.18);
    border-color: rgba(var(--p-primary-rgb), 0.85);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(var(--p-primary-rgb), 0.28);
}
.om-floating-help-btn:focus-visible {
    outline: 2px solid var(--p-primary);
    outline-offset: 2px;
}

/* First-visit attention pulse, matching the Header help button. */
.om-floating-help-btn.om-help-pulse {
    animation: om-floating-help-pulse 2s ease-out infinite;
}
@keyframes om-floating-help-pulse {
    0% { box-shadow: 0 0 0 0 rgba(var(--p-primary-rgb), 0.55); }
    70% { box-shadow: 0 0 0 12px rgba(var(--p-primary-rgb), 0); }
    100% { box-shadow: 0 0 0 0 rgba(var(--p-primary-rgb), 0); }
}
</style>
