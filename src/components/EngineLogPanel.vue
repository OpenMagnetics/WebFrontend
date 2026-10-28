<script>
import { useEngineDiagnosticsStore } from '/src/stores/engineDiagnostics'

// MKF's own warnings and log, for advanced users (Settings > Advanced > Engine log panel).
// The engine keeps structured records ({level, module, message, count, detail}); the store drains them
// after engine calls while the panel is enabled. Collapsed, it is the footer's "Engine log" button
// with the warning count (Footer.vue); expanded, a panel like the debug console's.
export default {
    name: 'EngineLogPanel',
    setup() {
        const engineDiagnosticsStore = useEngineDiagnosticsStore();
        return { engineDiagnosticsStore };
    },
    data() {
        return {
            searchQuery: '',
            autoScroll: true,
        };
    },
    computed: {
        filteredRecords() {
            const records = this.engineDiagnosticsStore.records;
            if (!this.searchQuery) return records;
            const q = this.searchQuery.toLowerCase();
            return records.filter((r) => r.message.toLowerCase().includes(q) || r.module.toLowerCase().includes(q)
                || (this.tooltipText(r) ?? '').toLowerCase().includes(q));
        },
    },
    watch: {
        'engineDiagnosticsStore.records.length'() {
            if (this.autoScroll && this.engineDiagnosticsStore.panelOpen) {
                this.$nextTick(() => {
                    const container = this.$refs.recordContainer;
                    if (container) container.scrollTop = container.scrollHeight;
                });
            }
        },
    },
    methods: {
        // "1 record", "2 records"
        counted(count, noun) {
            return `${count} ${noun}${count === 1 ? '' : 's'}`;
        },
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString('en-US', {
                hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
        },
        levelClass(level) {
            switch (level) {
                case 'CRITICAL':
                case 'ERROR': return 'text-danger';
                case 'WARNING': return 'text-warning';
                case 'INFO': return 'text-info';
                default: return 'text-secondary';
            }
        },
        // What the row's tooltip says: the latest value of the part of an engine message that varies
        // between its repeats (one row per message, counted), then the technical text behind the
        // message. null when the record has neither.
        tooltipText(record) {
            const lines = [];
            if (record.latestDetail) lines.push(`latest: ${record.latestDetail}`);
            if (record.detail) lines.push(record.detail);
            return lines.length > 0 ? lines.join('\n') : null;
        },
        copyToClipboard() {
            const text = this.filteredRecords.map((r) =>
                `[${this.formatTime(r.timestamp)}] [${r.level}] [${r.module}] ${r.message}${r.count > 1 ? ` (x${r.count})` : ''}`
                + (r.latestDetail ? `\n    Latest: ${r.latestDetail}` : '')
                + (r.detail ? `\n    Details: ${r.detail}` : '')
            ).join('\n');
            navigator.clipboard.writeText(text);
        },
    },
};
</script>

<template>
    <div v-if="engineDiagnosticsStore.logReachable && engineDiagnosticsStore.panelOpen" class="engine-log-panel" data-cy="EngineLogPanel">
        <div class="engine-log-header">
            <div class="engine-log-title">
                <i class="pi pi-cog mr-2"></i>
                Engine log (MKF)
                <span class="engine-log-badge">
                    {{ counted(engineDiagnosticsStore.records.length, 'record') }},
                    {{ counted(engineDiagnosticsStore.warningCount, 'warning') }}<span v-if="engineDiagnosticsStore.errorCount > 0">, </span><span v-if="engineDiagnosticsStore.errorCount > 0" class="text-danger">{{ counted(engineDiagnosticsStore.errorCount, 'error') }}</span>
                </span>
                <span v-if="engineDiagnosticsStore.allowMaterialDataExtrapolation" class="engine-log-extrapolating" data-cy="EngineLogPanel-extrapolating">
                    Extrapolating material data
                </span>
            </div>
            <div class="engine-log-controls">
                <button class="engine-log-btn" @click="engineDiagnosticsStore.clearRecords()" title="Clear">
                    <i class="pi pi-trash"></i>
                </button>
                <button class="engine-log-btn" @click="copyToClipboard()" title="Copy all">
                    <i class="pi pi-clipboard"></i>
                </button>
                <button class="engine-log-btn" @click="engineDiagnosticsStore.panelOpen = false" title="Collapse">
                    <i class="pi pi-chevron-down"></i>
                </button>
            </div>
        </div>

        <div class="engine-log-toolbar">
            <input v-model="searchQuery" type="text" class="engine-log-search" placeholder="Search engine log..." />
            <label class="engine-log-autoscroll">
                <input type="checkbox" v-model="autoScroll"> Auto-scroll
            </label>
        </div>

        <div v-if="engineDiagnosticsStore.collectionError" class="engine-log-error" data-cy="EngineLogPanel-error">
            {{ engineDiagnosticsStore.collectionError }}
        </div>

        <div ref="recordContainer" class="engine-log-body">
            <div v-if="filteredRecords.length === 0" class="engine-log-empty">
                No engine log records yet
            </div>
            <div v-for="record in filteredRecords" :key="record.id" class="engine-log-record" :class="`record-${record.level.toLowerCase()}`" data-cy="EngineLogPanel-record">
                <span class="engine-log-timestamp">{{ formatTime(record.timestamp) }}</span>
                <span class="engine-log-level" :class="levelClass(record.level)">{{ record.level }}</span>
                <span class="engine-log-module">{{ record.module }}</span>
                <pre class="engine-log-message">{{ record.message }}<span v-if="record.count > 1" class="engine-log-count"> (x{{ record.count }})</span></pre>
                <!-- The latest value of what varies between the message's repeats, and the technical text
                     behind the message (engine code, raw report): a tooltip, not a line. -->
                <i
                    v-if="tooltipText(record)"
                    v-tooltip.left="{ value: tooltipText(record), class: 'engine-log-detail-tooltip' }"
                    class="pi pi-info-circle engine-log-detail"
                    :aria-label="tooltipText(record)"
                    data-cy="EngineLogPanel-record-detail"
                ></i>
            </div>
        </div>
    </div>
</template>

<style scoped>
.engine-log-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    width: min(100vw, 900px);
    height: 280px;
    background: rgba(var(--p-dark-rgb), 0.97);
    border-top: 2px solid var(--p-warning);
    border-right: 1px solid rgba(var(--p-white-rgb), 0.1);
    z-index: 9997;
    display: flex;
    flex-direction: column;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.85rem;
}

.engine-log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: rgba(var(--p-black-rgb), 0.3);
    border-bottom: 1px solid rgba(var(--p-white-rgb), 0.1);
}

.engine-log-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--p-warning);
    font-weight: 600;
}

.engine-log-badge {
    font-size: 0.75rem;
    opacity: 0.7;
    font-weight: 400;
    color: var(--p-white);
}

.engine-log-extrapolating {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    background: rgba(var(--p-warning-rgb), 0.2);
    color: var(--p-warning);
}

.engine-log-controls {
    display: flex;
    gap: 0.5rem;
}

.engine-log-btn {
    background: transparent;
    border: 1px solid rgba(var(--p-white-rgb), 0.2);
    color: var(--p-white);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
}

.engine-log-btn:hover {
    background: rgba(var(--p-white-rgb), 0.1);
    border-color: var(--p-warning);
}

.engine-log-toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(var(--p-black-rgb), 0.2);
    border-bottom: 1px solid rgba(var(--p-white-rgb), 0.1);
    align-items: center;
}

.engine-log-search {
    flex: 1;
    background: rgba(var(--p-white-rgb), 0.05);
    border: 1px solid rgba(var(--p-white-rgb), 0.2);
    color: var(--p-white);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
}

.engine-log-autoscroll {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: rgba(var(--p-white-rgb), 0.7);
    font-size: 0.8rem;
    cursor: pointer;
}

.engine-log-error {
    padding: 0.25rem 1rem;
    color: var(--p-danger);
    font-size: 0.8rem;
}

.engine-log-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
}

.engine-log-empty {
    text-align: center;
    color: rgba(var(--p-white-rgb), 0.4);
    padding: 2rem;
}

.engine-log-record {
    display: flex;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    margin-bottom: 1px;
    align-items: flex-start;
}

.engine-log-record:hover {
    background: rgba(var(--p-white-rgb), 0.05);
}

.record-warning {
    background: rgba(var(--p-warning-rgb), 0.1);
}

.record-error,
.record-critical {
    background: rgba(var(--p-danger-rgb), 0.1);
}

.engine-log-timestamp {
    color: rgba(var(--p-white-rgb), 0.4);
    font-size: 0.75rem;
    white-space: nowrap;
}

.engine-log-level {
    font-size: 0.7rem;
    font-weight: 600;
    min-width: 60px;
}

.engine-log-module {
    font-size: 0.7rem;
    color: rgba(var(--p-white-rgb), 0.6);
    white-space: nowrap;
}

.engine-log-message {
    margin: 0;
    color: rgba(var(--p-white-rgb), 0.9);
    white-space: pre-wrap;
    word-break: break-word;
    flex: 1;
    font-size: 0.8rem;
    font-family: inherit;
}

.engine-log-detail {
    color: rgba(var(--p-white-rgb), 0.5);
    font-size: 0.8rem;
    padding-top: 0.15rem;
    cursor: help;
}

.engine-log-detail:hover {
    color: var(--p-warning);
}

.engine-log-count {
    color: rgba(var(--p-white-rgb), 0.5);
}

</style>

<style>
/* The detail of a record is the engine's full text: keep its line breaks, wrap long words.
   PrimeVue gives a tooltip its own inline z-index, below the panel's (9997): the tooltip of a
   record would open behind the panel it belongs to. */
.engine-log-detail-tooltip {
    z-index: 9998 !important;
}

.engine-log-detail-tooltip .p-tooltip-text {
    white-space: pre-wrap;
    word-break: break-word;
    max-width: 36rem;
    font-size: 0.8rem;
}
</style>
