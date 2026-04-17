<script setup>
</script>

<script>
const CONSENT_KEY = 'om_cookie_consent';

export default {
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
            </div>

            <div class="om-footer-links">
                <a data-cy="Footer-cookie-policy-link" href="/cookie_policy" class="om-footer-link">Cookie Policy</a>
                <a data-cy="Footer-legal-link" href="/legal_notice" class="om-footer-link">Privacy Policy</a>
                <a href="https://github.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer" class="om-footer-link">
                    <i class="fa-brands fa-github me-1"></i>GitHub
                </a>
                <a href="https://en.liberapay.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer" class="om-footer-link">
                    <i class="fa-solid fa-circle-dollar-to-slot me-1"></i>Donate
                </a>
                <button class="om-footer-prefs-btn" @click="resetConsent">
                    <i class="fa-solid fa-cookie-bite me-1"></i>Cookies
                </button>
            </div>
        </div>
    </footer>
</template>

<style scoped>
.om-footer {
    min-width: 100%;
    height: 46px;
    background: linear-gradient(180deg,
        rgba(var(--bs-dark-rgb), 0.82) 0%,
        rgba(var(--bs-dark-rgb), 0.95) 100%);
    border-top: 1px solid rgba(var(--bs-primary-rgb), 0.25);
    box-shadow: 0 -3px 12px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}

.om-footer-bar {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    gap: 1rem;
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
    background: linear-gradient(135deg, var(--bs-primary) 0%, color-mix(in srgb, var(--bs-primary) 70%, white 30%) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.om-footer-sep {
    color: rgba(255, 255, 255, 0.2);
    font-size: 0.75rem;
}

.om-footer-copy {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.28);
}

.om-footer-links {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    flex-wrap: nowrap;
}

.om-footer-link {
    font-size: 0.74rem;
    color: rgba(255, 255, 255, 0.4);
    text-decoration: none;
    padding: 0.2rem 0.55rem;
    border-radius: 5px;
    transition: color 0.15s, background 0.15s;
    white-space: nowrap;
}
.om-footer-link:hover {
    color: var(--bs-primary);
    background: rgba(var(--bs-primary-rgb), 0.07);
    text-decoration: none;
}

.om-footer-prefs-btn {
    font-size: 0.74rem;
    color: rgba(255, 255, 255, 0.35);
    background: transparent;
    border: 1px solid rgba(var(--bs-primary-rgb), 0.2);
    border-radius: 5px;
    padding: 0.2rem 0.55rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    white-space: nowrap;
}
.om-footer-prefs-btn:hover {
    color: var(--bs-primary);
    border-color: rgba(var(--bs-primary-rgb), 0.5);
    background: rgba(var(--bs-primary-rgb), 0.07);
}
</style>
