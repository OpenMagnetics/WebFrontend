<script setup>
import Dialog from 'primevue/dialog'
</script>

<script>
export default {
    components: { Dialog },
    props: {
        // User-facing reasons the current step cannot continue. Empty while the
        // step is valid.
        errors: {
            type: Array,
            default: () => [],
        },
        // Whether the current step is blocking. A step can block without naming
        // a reason (subsections that still emit only the boolean), and that is
        // precisely the case this panel exists to stop being silent.
        blocked: {
            type: Boolean,
            default: false,
        },
        dataTestLabel: {
            type: String,
            default: 'StorylineErrors',
        },
    },
    data() {
        return {
            detailVisible: false,
        }
    },
    computed: {
        // Never render an empty complaint: if the step blocks without saying
        // why, say at least that much rather than showing a bare header.
        messages() {
            if (!this.blocked) return [];
            if (this.errors.length > 0) return this.errors;
            return ["This step is not complete yet. Review the fields on this page."];
        },
    },
    watch: {
        // Don't leave a stale list floating over a step that has since been
        // fixed (or over a different step the user navigated to).
        messages(value) {
            if (value.length == 0) this.detailVisible = false;
        },
    },
}
</script>

<template>
    <div
        v-if="messages.length > 0"
        class="storyline-errors"
        :data-cy="dataTestLabel + '-panel'"
    >
        <!-- The sidebar column is ~1/12 of the page, far too narrow for full
             sentences, so the card is only a summary; the readable list lives
             in the dialog it opens. -->
        <button
            class="ste-card"
            :data-cy="dataTestLabel + '-open'"
            :title="messages.join('\n')"
            @click="detailVisible = true"
        >
            <i class="pi pi-exclamation-triangle"></i>
            <span class="ste-title">Fix Errors</span>
            <span class="ste-count" :data-cy="dataTestLabel + '-count'">{{messages.length}}</span>
            <span class="ste-hint">click for details</span>
        </button>

        <Dialog
            :visible="detailVisible"
            @update:visible="(v) => detailVisible = v"
            :modal="false"
            :draggable="true"
            :dismissableMask="false"
            :data-cy="dataTestLabel + '-dialog'"
            :style="{ width: 'min(92vw, 620px)' }"
            :pt="{ root: { class: 'storyline-errors-dialog' } }"
        >
            <template #header>
                <div class="d-flex align-items-center ste-dialog-header">
                    <i class="pi pi-exclamation-triangle mr-2"></i>
                    <span>{{messages.length}} {{messages.length == 1 ? 'thing' : 'things'}} to fix before continuing</span>
                </div>
            </template>
            <ul class="ste-list" :data-cy="dataTestLabel + '-list'">
                <li
                    v-for="(message, index) in messages"
                    :key="index"
                    class="ste-item"
                    :data-cy="dataTestLabel + '-item-' + index"
                >
                    {{message}}
                </li>
            </ul>
        </Dialog>
    </div>
</template>

<style scoped>
/* Matches the other left-sidebar cards (Steps / Actions), accented with the
   theme's danger colour instead of the primary one. */
.storyline-errors {
    background: rgba(var(--p-dark-rgb), 0.55);
    border: 1px solid rgba(var(--p-danger-rgb), 0.35);
    border-top: 3px solid rgba(var(--p-danger-rgb), 0.9);
    border-radius: 14px;
    margin: 0.15rem 0 0.5rem 0;
    overflow: hidden;
    box-shadow: 0 6px 24px rgba(var(--p-dark-rgb), 0.45), inset 0 1px 0 rgba(var(--p-white-rgb), 0.04);
}

.ste-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    width: 100%;
    padding: 0.55rem 0.35rem;
    background: rgba(var(--p-danger-rgb), 0.10);
    border: 0;
    color: var(--p-danger);
    cursor: pointer;
}

.ste-card:hover {
    background: rgba(var(--p-danger-rgb), 0.18);
}

.ste-card i {
    font-size: 1rem;
    filter: drop-shadow(0 0 4px rgba(var(--p-danger-rgb), 0.45));
}

.ste-title {
    font-weight: 600;
    font-size: 0.85rem;
    line-height: 1.1;
}

.ste-count {
    min-width: 1.35rem;
    padding: 0 0.35rem;
    border-radius: 999px;
    background: rgba(var(--p-danger-rgb), 0.25);
    font-size: 0.75rem;
    line-height: 1.35rem;
}

.ste-hint {
    font-size: 0.6rem;
    line-height: 1.1;
    opacity: 0.75;
    color: rgba(var(--p-white-rgb), 0.8);
}
</style>

<!-- NOT scoped on purpose: PrimeVue teleports the Dialog to <body>, so a scoped
     block never reaches it and the panel renders with no background at all.
     Everything here is namespaced under .storyline-errors-dialog. -->
<style>
.storyline-errors-dialog {
    z-index: 9999;
    background: var(--p-light);
    border: 1px solid rgba(var(--p-danger-rgb), 0.45);
    border-radius: 14px;
    box-shadow: 0 18px 48px rgba(var(--p-dark-rgb), 0.65);
}

.storyline-errors-dialog .p-dialog-header,
.storyline-errors-dialog .p-dialog-content {
    background: transparent;
    color: rgba(var(--p-white-rgb), 0.9);
}

.storyline-errors-dialog .p-dialog-header {
    border-bottom: 1px solid rgba(var(--p-danger-rgb), 0.3);
    padding: 0.75rem 1rem;
}

.storyline-errors-dialog .p-dialog-content {
    padding: 0.9rem 1rem 1.1rem 1rem;
    border-radius: 0 0 14px 14px;
}

.storyline-errors-dialog .ste-dialog-header {
    color: var(--p-danger);
    font-weight: 600;
}

.storyline-errors-dialog .ste-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 55vh;
    overflow-y: auto;
    text-align: left;
}

.storyline-errors-dialog .ste-item {
    padding: 0.55rem 0.7rem;
    font-size: 0.9rem;
    line-height: 1.4;
    color: rgba(var(--p-white-rgb), 0.9);
    border-left: 3px solid rgba(var(--p-danger-rgb), 0.7);
    background: rgba(var(--p-white-rgb), 0.05);
    border-radius: 0 8px 8px 0;
    margin-bottom: 0.45rem;
    overflow-wrap: anywhere;
}

.storyline-errors-dialog .ste-item:last-child {
    margin-bottom: 0;
}
</style>
