<script setup>
</script>

<script>
import { useEngineDiagnosticsStore } from '/src/stores/engineDiagnostics'

const CONSENT_KEY = 'om_cookie_consent';

export default {
    setup() {
        const engineDiagnosticsStore = useEngineDiagnosticsStore();
        return { engineDiagnosticsStore };
    },
    computed: {
        engineLogIssueCount() {
            return this.engineDiagnosticsStore.warningCount + this.engineDiagnosticsStore.errorCount;
        },
        // Green when the log is quiet, soft yellow with warnings, red with errors.
        engineLogStateClass() {
            if (this.engineDiagnosticsStore.errorCount > 0) return 'om-footer-engine-log-error';
            if (this.engineDiagnosticsStore.warningCount > 0) return 'om-footer-engine-log-warning';
            return null;
        },
    },
    methods: {
        resetConsent() {
            localStorage.removeItem(CONSENT_KEY);
            window.dispatchEvent(new Event('om-reset-consent'));
        },
    },
};
</script>

<template>
    <footer class="om-footer">
        <div class="om-footer-bar">
            <div class="om-footer-left">
                <img src="/images/newLogo.png" width="22" height="15" alt="OpenMagnetics Logo">
                <span class="om-footer-name">OpenMagnetics</span>
                <span class="om-footer-sep">·</span>
                <span class="om-footer-copy">© 2022–{{ new Date().getFullYear() }}</span>
                <button
                    v-if="engineDiagnosticsStore.logReachable"
                    class="om-footer-engine-log"
                    :class="engineLogStateClass"
                    data-cy="EngineLogPanel-toggle"
                    title="Engine log (MKF warnings and log)"
                    @click="engineDiagnosticsStore.panelOpen = !engineDiagnosticsStore.panelOpen"
                >
                    <i class="pi pi-cog mr-1"></i>Engine log<span v-if="engineLogIssueCount > 0" class="ml-1">({{ engineLogIssueCount }})</span>
                </button>
            </div>

            <div class="om-footer-links">
                <a data-cy="Footer-cookie-policy-link" href="/cookie_policy" class="om-footer-link">Cookie Policy</a>
                <a data-cy="Footer-legal-link" href="/legal_notice" class="om-footer-link">Privacy Policy</a>
                <a href="/terms" class="om-footer-link">Terms</a>
                <a href="https://github.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer" class="om-footer-link">
                    <i class="pi pi-github mr-1"></i>GitHub
                </a>
                <a href="https://en.liberapay.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer" class="om-footer-link">
                    <i class="pi pi-dollar mr-1"></i>Donate
                </a>
                <button class="om-footer-prefs-btn" @click="resetConsent">
                    <i class="pi pi-cookie mr-1"></i>Cookies
                </button>
            </div>
        </div>
    </footer>
</template>

<style scoped>
.om-footer {
    min-width: 100%;
    min-height: 46px;
    background: linear-gradient(180deg,
        rgba(var(--p-dark-rgb), 0.82) 0%,
        rgba(var(--p-dark-rgb), 0.95) 100%);
    border-top: 1px solid rgba(var(--p-primary-rgb), 0.25);
    box-shadow: 0 -3px 12px rgba(var(--p-black-rgb), 0.3);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}

.om-footer-bar {
    min-height: 46px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 0.35rem 1.5rem;
    gap: 0.35rem 1rem;
}

.om-footer-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
}

.om-footer-name {
    font-size: 0.78rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--p-primary) 0%, color-mix(in srgb, var(--p-primary) 70%, white 30%) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.om-footer-sep {
    color: rgba(var(--p-white-rgb), 0.2);
    font-size: 0.75rem;
}

.om-footer-copy {
    font-size: 0.72rem;
    color: rgba(var(--p-white-rgb), 0.28);
}

.om-footer-links {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    flex-wrap: wrap;
}

.om-footer-link {
    font-size: 0.74rem;
    color: rgba(var(--p-white-rgb), 0.4);
    text-decoration: none;
    padding: 0.2rem 0.55rem;
    border-radius: 5px;
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;
}
.om-footer-link:hover {
    color: var(--p-primary);
    background: rgba(var(--p-primary-rgb), 0.07);
    text-decoration: none;
}

.om-footer-prefs-btn {
    font-size: 0.74rem;
    color: rgba(var(--p-white-rgb), 0.35);
    background: transparent;
    border: 1px solid rgba(var(--p-primary-rgb), 0.2);
    border-radius: 5px;
    padding: 0.2rem 0.55rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    white-space: nowrap;
}
.om-footer-prefs-btn:hover {
    color: var(--p-primary);
    border-color: rgba(var(--p-primary-rgb), 0.5);
    background: rgba(var(--p-primary-rgb), 0.07);
}

.om-footer-engine-log {
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
.om-footer-engine-log:hover {
    filter: brightness(1.15);
}
.om-footer-engine-log-warning {
    color: var(--p-warning);
    background: rgba(var(--p-warning-rgb), 0.18);
    border-color: rgba(var(--p-warning-rgb), 0.6);
}
.om-footer-engine-log-error {
    color: var(--p-white);
    background: var(--p-danger);
    border-color: var(--p-danger);
}
</style>
