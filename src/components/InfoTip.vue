<script>
let infoTipCount = 0;

// An info icon that shows an explanation as a tooltip, on hover AND on keyboard focus.
// PrimeVue's v-tooltip listens to either mouse or focus events, never both, so the hover
// tooltip sits on the wrapper and the focus tooltip on the button; both open at the same
// spot with the same text. The text is also tied to the button with aria-describedby, so a
// screen reader reads it without the tooltip. A default slot replaces the icon with a short
// visible status (e.g. "Derived") that carries the explanation the same way.
export default {
    props: {
        text: {
            type: String,
            required: true,
        },
        // What the icon is about, read as the button's name ("About operating points").
        label: {
            type: String,
            required: true,
        },
        dataCy: {
            type: String,
            default: null,
        },
    },
    data() {
        infoTipCount += 1;
        return {
            descriptionId: 'om-info-tip-' + infoTipCount,
        };
    },
}
</script>

<template>
    <span class="om-info-tip" v-tooltip.top="text">
        <button
            type="button"
            class="om-info-tip-btn"
            :class="{ 'om-info-tip-badge': $slots.default }"
            v-tooltip.top.focus="text"
            :aria-label="label"
            :aria-describedby="descriptionId"
            :data-cy="dataCy"
        >
            <slot><i class="pi pi-info-circle" aria-hidden="true"></i></slot>
        </button>
        <span :id="descriptionId" class="om-info-tip-text">{{ text }}</span>
    </span>
</template>

<style scoped>
.om-info-tip {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
}

.om-info-tip-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.35rem;
    height: 1.35rem;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: rgba(var(--p-white-rgb), 0.62);
    font-size: 0.85rem;
    line-height: 1;
    cursor: help;
    transition: color 0.15s, background 0.15s;
}

.om-info-tip-btn:hover,
.om-info-tip-btn:focus-visible {
    color: var(--p-primary);
    background: rgba(var(--p-primary-rgb), 0.12);
}

.om-info-tip-btn:focus-visible {
    outline: 2px solid var(--p-primary);
    outline-offset: 1px;
}

.om-info-tip-btn.om-info-tip-badge {
    width: auto;
    height: auto;
    padding: 0.05rem 0.5rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--om-info-tip-badge-colour, rgba(var(--p-white-rgb), 0.76));
}

.om-info-tip-btn.om-info-tip-badge:hover,
.om-info-tip-btn.om-info-tip-badge:focus-visible {
    color: var(--om-info-tip-badge-colour, var(--p-white));
    background: rgba(var(--p-white-rgb), 0.08);
}

/* Read by screen readers through aria-describedby; never drawn. */
.om-info-tip-text {
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
</style>
