<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
</script>

<script>
import { WIZARD_GROUPS } from '../components/Wizards/wizardCatalog'
import { sketchTraces } from '../components/Wizards/topologySketches'

const SCOPE_WIDTH = 240;
const SCOPE_HEIGHT = 84;

// New Magnetic > From a converter topology: every wizard as a tile, grouped by converter family,
// with a search box and family filters. Each tile's screen sketches the current in that
// topology's magnetic (topologySketches.js). The header's fly-out lists the same wizards.
export default {
    data() {
        return {
            searchQuery: '',
            selectedFamily: null,
            scopeWidth: SCOPE_WIDTH,
            scopeHeight: SCOPE_HEIGHT,
            groups: WIZARD_GROUPS.map((group) => ({
                ...group,
                items: group.items.map((item) => ({
                    ...item,
                    traces: sketchTraces(item.store, SCOPE_WIDTH, SCOPE_HEIGHT),
                })),
            })),
        };
    },
    computed: {
        totalCount() {
            return this.groups.reduce((n, group) => n + group.items.length, 0);
        },
        filteredGroups() {
            const q = this.searchQuery.trim().toLowerCase();
            return this.groups
                .filter((group) => this.selectedFamily == null || group.label === this.selectedFamily)
                .map((group) => ({
                    ...group,
                    items: q === '' ? group.items : group.items.filter((item) =>
                        [item.label, item.title, item.description, item.magnetic, group.label]
                            .some((text) => text.toLowerCase().includes(q))),
                }))
                .filter((group) => group.items.length > 0);
        },
    },
    methods: {
        cardCy(item) {
            return item.cy.replace(/-link$/, '-card');
        },
        familyCy(group) {
            return 'WizardsLanding-family-' + group.label.replace(/[^A-Za-z0-9]/g, '');
        },
        selectFamily(label) {
            this.selectedFamily = this.selectedFamily === label ? null : label;
        },
        clearFilters() {
            this.searchQuery = '';
            this.selectedFamily = null;
        },
        async onWizard(item) {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectWizard(this.$stateStore.Wizards[item.store]);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}wizards`);
        },
        async onManualDesign() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.Power);
            await this.$nextTick();
            await this.$router.push(`${import.meta.env.BASE_URL}magnetic_tool`);
        },
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main tl-page flex-grow-1">
            <header class="tl-hero">
                <h1 class="tl-title">Which converter is your magnetic for?</h1>
                <p class="tl-lede">
                    Pick it, enter its electrical specification, and the operating points are computed for you.
                    The magnetic is then sized from them.
                </p>

                <label class="tl-search">
                    <i class="pi pi-search" aria-hidden="true"></i>
                    <input
                        v-model="searchQuery"
                        type="search"
                        data-cy="WizardsLanding-search"
                        placeholder="Search: flyback, LLC, PFC, transformer…"
                        aria-label="Search converters"
                    />
                </label>

                <nav class="tl-families" aria-label="Converter families">
                    <button
                        type="button"
                        class="tl-family-chip"
                        :aria-pressed="selectedFamily == null ? 'true' : 'false'"
                        data-cy="WizardsLanding-family-All"
                        @click="selectedFamily = null"
                    >
                        All <span class="tl-chip-count">{{ totalCount }}</span>
                    </button>
                    <button
                        v-for="group in groups"
                        :key="group.label"
                        type="button"
                        class="tl-family-chip"
                        :aria-pressed="selectedFamily === group.label ? 'true' : 'false'"
                        :data-cy="familyCy(group)"
                        @click="selectFamily(group.label)"
                    >
                        <i class="bi" :class="group.icon" aria-hidden="true"></i>
                        {{ group.label }} <span class="tl-chip-count">{{ group.items.length }}</span>
                    </button>
                </nav>
            </header>

            <section
                v-for="group in filteredGroups"
                :key="group.label"
                class="tl-group"
                :data-cy="'WizardsLanding-group-' + group.label.replace(/[^A-Za-z0-9]/g, '')"
            >
                <div class="tl-group-head">
                    <h2 class="tl-group-title">{{ group.label }}</h2>
                    <p class="tl-group-desc">{{ group.description }}</p>
                </div>

                <div class="tl-grid">
                    <button
                        v-for="(item, index) in group.items"
                        :key="item.cy"
                        type="button"
                        class="tl-tile"
                        :data-cy="cardCy(item)"
                        :style="{ '--tl-order': index }"
                        @click="onWizard(item)"
                    >
                        <span class="tl-scope" aria-hidden="true">
                            <svg :viewBox="`0 0 ${scopeWidth} ${scopeHeight}`" focusable="false">
                                <line class="tl-axis" x1="0" :y1="scopeHeight / 2" :x2="scopeWidth" :y2="scopeHeight / 2" />
                                <polyline
                                    v-for="(trace, traceIndex) in item.traces"
                                    :key="traceIndex"
                                    class="tl-trace"
                                    :class="'tl-trace-' + trace.tone"
                                    :points="trace.points"
                                    pathLength="1"
                                />
                            </svg>
                        </span>
                        <span class="tl-tile-body">
                            <span class="tl-tile-name">{{ item.title }}</span>
                            <span class="tl-tile-magnetic">{{ item.magnetic }}</span>
                            <span class="tl-tile-desc">{{ item.description }}</span>
                        </span>
                    </button>
                </div>
            </section>

            <div v-if="filteredGroups.length === 0" class="tl-empty" data-cy="WizardsLanding-no-results">
                <p>No converter matches "{{ searchQuery }}"{{ selectedFamily ? ` in ${selectedFamily}` : '' }}.</p>
                <button type="button" class="tl-link-btn" @click="clearFilters">Show all converters</button>
            </div>

            <aside class="tl-manual">
                <div>
                    <h2 class="tl-manual-title">Converter not listed, or you already have the operating points?</h2>
                    <p class="tl-manual-text">Design the magnetic manually: enter its requirements and operating points yourself.</p>
                </div>
                <button type="button" class="tl-manual-btn" data-cy="WizardsLanding-manual-design" @click="onManualDesign">
                    <i class="pi pi-pencil" aria-hidden="true"></i>Manual design
                </button>
            </aside>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

<style scoped>
.tl-page {
    --tl-panel-1: color-mix(in srgb, var(--p-light) 92%, var(--p-white) 8%);
    --tl-panel-2: var(--p-light);
    --tl-border: rgba(var(--p-white-rgb), 0.1);
    --tl-text: var(--p-white);
    --tl-muted: rgba(var(--p-white-rgb), 0.62);
    --tl-trace-first: var(--p-primary);
    --tl-trace-second: var(--p-info);
    --tl-trace-third: var(--p-warning);

    width: 100%;
    /* The tiles use the screen; only the hero's text keeps a readable measure. */
    max-width: 1760px;
    /* Only the sides: the top margin is .main's, which clears the fixed header. */
    margin-left: auto;
    margin-right: auto;
    padding: 3rem clamp(1rem, 3vw, 3rem) 4rem;
    color: var(--tl-text);
    text-align: left;
}

/* ---------- Hero ---------- */
.tl-hero {
    max-width: 52rem;
    margin-bottom: 2.75rem;
}

.tl-title {
    font-size: clamp(2rem, 4.2vw, 3.25rem);
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -0.025em;
    color: var(--tl-text);
    margin: 0 0 0.9rem;
}

.tl-lede {
    font-size: 1.08rem;
    line-height: 1.55;
    color: var(--tl-muted);
    max-width: 40rem;
    margin: 0 0 1.75rem;
}

.tl-search {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 36rem;
    padding: 0 1rem;
    background: linear-gradient(180deg, var(--tl-panel-1) 0%, var(--tl-panel-2) 100%);
    border: 1px solid var(--tl-border);
    border-left: 3px solid rgba(var(--p-primary-rgb), 0.8);
    border-radius: 12px;
    box-shadow: 0 6px 20px rgba(var(--p-black-rgb), 0.45), inset 0 1px 0 rgba(var(--p-white-rgb), 0.06);
    cursor: text;
}

.tl-search i {
    color: var(--p-primary);
}

.tl-search input {
    flex: 1;
    min-width: 0;
    padding: 0.85rem 0;
    background: transparent;
    border: none;
    color: var(--tl-text);
    font-size: 1.05rem;
}

.tl-search input:focus {
    outline: none;
}

.tl-search:focus-within {
    border-color: rgba(var(--p-primary-rgb), 0.6);
    box-shadow: 0 0 0 3px rgba(var(--p-primary-rgb), 0.25), 0 6px 20px rgba(var(--p-black-rgb), 0.45);
}

.tl-search input::placeholder {
    color: rgba(var(--p-white-rgb), 0.4);
}

.tl-families {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1.25rem;
}

.tl-family-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.85rem;
    background: transparent;
    border: 1px solid var(--tl-border);
    border-radius: 999px;
    color: var(--tl-muted);
    font-size: 0.88rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.tl-family-chip:hover {
    color: var(--tl-text);
    border-color: rgba(var(--p-primary-rgb), 0.5);
}

.tl-family-chip[aria-pressed="true"] {
    color: var(--p-primary);
    background: rgba(var(--p-primary-rgb), 0.14);
    border-color: rgba(var(--p-primary-rgb), 0.7);
}

.tl-chip-count {
    font-variant-numeric: tabular-nums;
    opacity: 0.65;
}

/* ---------- Families ---------- */
.tl-group {
    margin-bottom: 2.75rem;
}

.tl-group-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.35rem 1rem;
    padding-bottom: 0.75rem;
    margin-bottom: 1.1rem;
    border-bottom: 1px solid var(--tl-border);
}

.tl-group-title {
    font-size: 1.3rem;
    font-weight: 650;
    color: var(--p-primary);
    margin: 0;
}

.tl-group-desc {
    font-size: 0.92rem;
    color: var(--tl-muted);
    margin: 0;
}

.tl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
    gap: 1rem;
}

/* ---------- Tiles ---------- */
.tl-tile {
    display: flex;
    flex-direction: column;
    padding: 0;
    text-align: left;
    color: var(--tl-text);
    background: linear-gradient(180deg, var(--tl-panel-1) 0%, var(--tl-panel-2) 100%);
    border: 1px solid var(--tl-border);
    border-radius: 14px;
    box-shadow: 0 6px 20px rgba(var(--p-black-rgb), 0.45), inset 0 1px 0 rgba(var(--p-white-rgb), 0.06);
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.tl-tile:hover,
.tl-tile:focus-visible {
    border-color: rgba(var(--p-primary-rgb), 0.65);
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(var(--p-black-rgb), 0.55), 0 0 0 1px rgba(var(--p-primary-rgb), 0.25);
}

.tl-tile:focus-visible {
    outline: 2px solid var(--p-primary);
    outline-offset: 2px;
}

/* The oscilloscope screen: graticule of 6 x 4 divisions behind the trace. */
.tl-scope {
    display: block;
    margin: 0.65rem 0.65rem 0;
    border-radius: 9px;
    background-color: var(--p-dark);
    background-image:
        linear-gradient(rgba(var(--p-white-rgb), 0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(var(--p-white-rgb), 0.07) 1px, transparent 1px);
    background-size: calc(100% / 6) 25%;
    background-position: -1px -1px;
    border: 1px solid rgba(var(--p-white-rgb), 0.08);
    box-shadow: inset 0 0 24px rgba(var(--p-black-rgb), 0.7);
}

.tl-scope svg {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 240 / 84;
    overflow: visible;
}

.tl-axis {
    stroke: rgba(var(--p-white-rgb), 0.16);
    stroke-width: 1;
    stroke-dasharray: 3 3;
}

.tl-trace {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    animation: tl-draw 1.1s cubic-bezier(0.3, 0.6, 0.3, 1) both;
    animation-delay: calc(var(--tl-order, 0) * 60ms);
}

.tl-trace-first {
    stroke: var(--tl-trace-first);
    filter: drop-shadow(0 0 3px rgba(var(--p-primary-rgb), 0.75));
}

.tl-trace-second {
    stroke: var(--tl-trace-second);
    filter: drop-shadow(0 0 3px rgba(var(--p-info-rgb), 0.7));
}

.tl-trace-third {
    stroke: var(--tl-trace-third);
    filter: drop-shadow(0 0 3px rgba(var(--p-warning-rgb), 0.7));
}

/* Hovering or focusing a tile sweeps its trace again, like a fresh acquisition. */
.tl-tile:hover .tl-trace,
.tl-tile:focus-visible .tl-trace {
    animation: tl-sweep 0.8s cubic-bezier(0.3, 0.6, 0.3, 1) both;
}

@keyframes tl-draw {
    from { stroke-dashoffset: 1; }
    to { stroke-dashoffset: 0; }
}

@keyframes tl-sweep {
    from { stroke-dashoffset: 1; }
    to { stroke-dashoffset: 0; }
}

.tl-tile-body {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.85rem 1rem 1.1rem;
}

.tl-tile-name {
    font-size: 1.05rem;
    font-weight: 650;
    line-height: 1.25;
}

.tl-tile-magnetic {
    align-self: flex-start;
    padding: 0.1rem 0.55rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--p-primary);
    background: rgba(var(--p-primary-rgb), 0.14);
    border: 1px solid rgba(var(--p-primary-rgb), 0.4);
}

.tl-tile-desc {
    font-size: 0.85rem;
    line-height: 1.45;
    color: var(--tl-muted);
}

/* ---------- Empty state and manual design ---------- */
.tl-empty {
    padding: 2.5rem 0;
    color: var(--tl-muted);
}

.tl-link-btn {
    background: none;
    border: none;
    padding: 0;
    color: var(--p-primary);
    text-decoration: underline;
    cursor: pointer;
}

.tl-manual {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem 2rem;
    margin-top: 1rem;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(180deg, var(--tl-panel-1) 0%, var(--tl-panel-2) 100%);
    border: 1px solid var(--tl-border);
    border-left: 3px solid rgba(var(--p-primary-rgb), 0.8);
    border-radius: 14px;
}

.tl-manual-title {
    font-size: 1.05rem;
    font-weight: 650;
    margin: 0 0 0.25rem;
    color: var(--tl-text);
}

.tl-manual-text {
    margin: 0;
    font-size: 0.92rem;
    color: var(--tl-muted);
}

.tl-manual-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.2rem;
    border-radius: 10px;
    border: 1px solid rgba(var(--p-primary-rgb), 0.6);
    background: rgba(var(--p-primary-rgb), 0.85);
    color: var(--p-dark);
    font-weight: 650;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
}

.tl-manual-btn:hover {
    background: var(--p-primary);
    transform: translateY(-1px);
}

.tl-manual-btn:focus-visible,
.tl-family-chip:focus-visible,
.tl-link-btn:focus-visible {
    outline: 2px solid var(--p-primary);
    outline-offset: 2px;
}

@media (max-width: 576px) {
    .tl-page {
        padding: 2rem 1rem 3rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .tl-trace,
    .tl-tile:hover .tl-trace,
    .tl-tile:focus-visible .tl-trace {
        animation: none;
    }
    .tl-tile,
    .tl-tile:hover {
        transition: none;
        transform: none;
    }
}
</style>
