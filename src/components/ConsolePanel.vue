<script>
import { useConsoleStore } from '/src/stores/console'

export default {
    name: 'ConsolePanel',
    setup() {
        const consoleStore = useConsoleStore();
        return { consoleStore };
    },
    data() {
        return {
            searchQuery: '',
            autoScroll: true,
        };
    },
    computed: {
        filteredLogs() {
            let logs = this.consoleStore.filteredLogs;
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                logs = logs.filter(log => log.message.toLowerCase().includes(q));
            }
            return logs;
        },
        isEnabled() {
            return this.$settingsStore?.magneticBuilderSettings?.enableDebugConsole || false;
        },
    },
    watch: {
        'consoleStore.logs': {
            deep: true,
            handler() {
                if (this.autoScroll && this.consoleStore.isVisible) {
                    this.$nextTick(() => {
                        const container = this.$refs.logContainer;
                        if (container) {
                            container.scrollTop = container.scrollHeight;
                        }
                    });
                }
            },
        },
    },
    methods: {
        formatTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                fractionalSecondDigits: 3 
            });
        },
        getLevelIcon(level) {
            switch (level) {
                case 'error': return 'bi bi-x-circle-fill';
                case 'warn': return 'bi bi-exclamation-triangle-fill';
                case 'log': return 'bi bi-info-circle-fill';
                default: return 'bi bi-circle-fill';
            }
        },
        getLevelClass(level) {
            switch (level) {
                case 'error': return 'text-danger';
                case 'warn': return 'text-warning';
                case 'log': return 'text-info';
                default: return 'text-secondary';
            }
        },
        getSourceBadgeClass(source) {
            switch (source) {
                case 'mkf': return 'bg-primary';
                case 'wasm': return 'bg-success';
                case 'vue': return 'bg-info';
                default: return 'bg-secondary';
            }
        },
        copyToClipboard() {
            const text = this.filteredLogs.map(log => 
                `[${this.formatTime(log.timestamp)}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
            ).join('\n');
            navigator.clipboard.writeText(text).then(() => {
                // Could show a toast here
            });
        },
    },
};
</script>

<template>
    <div v-if="isEnabled && consoleStore.isVisible" class="console-panel">
        <div class="console-header">
            <div class="console-title">
                <i class="bi bi-terminal-fill me-2"></i>
                Console
                <span class="console-badge" :class="{ 'text-danger': consoleStore.errorCount > 0 }">
                    {{ consoleStore.logCount }} logs
                    <span v-if="consoleStore.errorCount > 0" class="ms-1">({{ consoleStore.errorCount }} errors)</span>
                </span>
            </div>
            <div class="console-controls">
                <button class="console-btn" @click="consoleStore.clearLogs()" title="Clear">
                    <i class="bi bi-trash"></i>
                </button>
                <button class="console-btn" @click="copyToClipboard()" title="Copy all">
                    <i class="bi bi-clipboard"></i>
                </button>
                <button class="console-btn" @click="consoleStore.toggleVisibility()" title="Close">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>

        <div class="console-toolbar">
            <input 
                v-model="searchQuery" 
                type="text" 
                class="console-search" 
                placeholder="Search logs..."
            />
            
            <select v-model="consoleStore.filterLevel" class="console-filter">
                <option value="all">All Levels</option>
                <option value="log">Log</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
            </select>

            <select v-model="consoleStore.filterSource" class="console-filter">
                <option value="all">All Sources</option>
                <option value="mkf">MKF</option>
                <option value="wasm">WASM</option>
                <option value="vue">Vue</option>
                <option value="other">Other</option>
            </select>

            <label class="console-autoscroll">
                <input type="checkbox" v-model="autoScroll"> Auto-scroll
            </label>
        </div>

        <div ref="logContainer" class="console-body">
            <div v-if="filteredLogs.length === 0" class="console-empty">
                No logs to display
            </div>
            
            <div 
                v-for="log in filteredLogs" 
                :key="log.id" 
                class="console-log"
                :class="`log-${log.level}`"
            >
                <span class="console-timestamp">{{ formatTime(log.timestamp) }}</span>
                <i :class="[getLevelIcon(log.level), getLevelClass(log.level), 'console-icon']"></i>
                <span class="console-source" :class="getSourceBadgeClass(log.source)">
                    {{ log.source }}
                </span>
                <pre class="console-message">{{ log.message }}</pre>
            </div>
        </div>
    </div>
    
    <!-- Toggle button -->
    <button 
        v-else-if="isEnabled"
        class="console-toggle" 
        @click="consoleStore.toggleVisibility()"
        :class="{ 'has-errors': consoleStore.errorCount > 0 }"
    >
        <i class="bi bi-terminal"></i>
        <span v-if="consoleStore.errorCount > 0" class="console-error-badge">
            {{ consoleStore.errorCount }}
        </span>
    </button>
</template>

<style scoped>
.console-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: rgba(20, 20, 30, 0.97);
    border-top: 2px solid var(--bs-primary);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.85rem;
}

.console-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.console-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--bs-primary);
    font-weight: 600;
}

.console-badge {
    font-size: 0.75rem;
    opacity: 0.7;
    font-weight: 400;
}

.console-controls {
    display: flex;
    gap: 0.5rem;
}

.console-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s;
}

.console-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--bs-primary);
}

.console-toolbar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    align-items: center;
}

.console-search {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
}

.console-search::placeholder {
    color: rgba(255, 255, 255, 0.4);
}

.console-filter {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
}

.console-filter option {
    background: #1a1a2e;
}

.console-autoscroll {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.8rem;
    cursor: pointer;
}

.console-body {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
}

.console-empty {
    text-align: center;
    color: rgba(255, 255, 255, 0.4);
    padding: 2rem;
}

.console-log {
    display: flex;
    gap: 0.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    margin-bottom: 1px;
    align-items: flex-start;
}

.console-log:hover {
    background: rgba(255, 255, 255, 0.05);
}

.log-error {
    background: rgba(220, 53, 69, 0.1);
}

.log-warn {
    background: rgba(255, 193, 7, 0.1);
}

.console-timestamp {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.75rem;
    white-space: nowrap;
    min-width: 85px;
}

.console-icon {
    font-size: 0.7rem;
    margin-top: 0.2rem;
}

.console-source {
    font-size: 0.65rem;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    color: #fff;
    white-space: nowrap;
    text-transform: uppercase;
    font-weight: 600;
    min-width: 50px;
    text-align: center;
}

.console-message {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    white-space: pre-wrap;
    word-break: break-word;
    flex: 1;
    font-size: 0.8rem;
    font-family: inherit;
}

.console-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bs-primary);
    border: none;
    color: #fff;
    font-size: 1.2rem;
    cursor: pointer;
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    transition: all 0.2s;
}

.console-toggle:hover {
    transform: scale(1.1);
}

.console-toggle.has-errors {
    animation: pulse 2s infinite;
}

.console-error-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: var(--bs-danger);
    color: #fff;
    font-size: 0.7rem;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
}

@keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
    50% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
}

/* Scrollbar styling */
.console-body::-webkit-scrollbar {
    width: 8px;
}

.console-body::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
}

.console-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
}

.console-body::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}
</style>
