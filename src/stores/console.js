import { defineStore } from 'pinia'

export const useConsoleStore = defineStore('console', {
    state: () => ({
        logs: [],
        maxLogs: 1000,
        isVisible: false,
        filterLevel: 'all', // 'all', 'log', 'warn', 'error'
        filterSource: 'all', // 'all', 'mkf', 'wasm', 'vue', 'other'
    }),

    getters: {
        filteredLogs: (state) => {
            let filtered = state.logs;
            
            if (state.filterLevel !== 'all') {
                filtered = filtered.filter(log => log.level === state.filterLevel);
            }
            
            if (state.filterSource !== 'all') {
                filtered = filtered.filter(log => log.source === state.filterSource);
            }
            
            return filtered;
        },

        logCount: (state) => state.logs.length,
        errorCount: (state) => state.logs.filter(l => l.level === 'error').length,
        warnCount: (state) => state.logs.filter(l => l.level === 'warn').length,
    },

    actions: {
        addLog(level, args, source = 'other') {
            const timestamp = new Date().toISOString();
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return '[Object]';
                    }
                }
                return String(arg);
            }).join(' ');

            // Detect source from message content
            if (source === 'other') {
                if (message.includes('[MKF]') || message.includes('WASM') || message.includes('wasm')) {
                    source = 'mkf';
                } else if (message.includes('[Vue]') || message.includes('Vue warn')) {
                    source = 'vue';
                }
            }

            const log = {
                id: Date.now() + Math.random(),
                timestamp,
                level,
                message,
                source,
                rawArgs: args,
            };

            this.logs.push(log);

            // Trim if exceeds max
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(-this.maxLogs);
            }
        },

        clearLogs() {
            this.logs = [];
        },

        toggleVisibility() {
            this.isVisible = !this.isVisible;
        },

        show() {
            this.isVisible = true;
        },

        hide() {
            this.isVisible = false;
        },

        setFilterLevel(level) {
            this.filterLevel = level;
        },

        setFilterSource(source) {
            this.filterSource = source;
        },
    },
});
