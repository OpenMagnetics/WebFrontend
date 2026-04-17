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
        <div class="om-footer-inner container-fluid">
            <div class="om-footer-brand">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <img src="/images/newLogo.png" width="36" height="24" alt="OpenMagnetics Logo">
                    <span class="om-footer-name">OpenMagnetics</span>
                </div>
                <p class="om-footer-tagline">The free, open-source platform for magnetics design &amp; simulation.</p>
            </div>

            <div class="om-footer-col">
                <span class="om-footer-section-label"><i class="fa-solid fa-scale-balanced me-1"></i>Legal</span>
                <a data-cy="Footer-cookie-policy-link" href="/cookie_policy" class="om-footer-link">Cookie Policy</a>
                <a data-cy="Footer-legal-link" href="/legal_notice" class="om-footer-link">Privacy Policy</a>
            </div>

            <div class="om-footer-col">
                <span class="om-footer-section-label"><i class="fa-solid fa-users me-1"></i>Community</span>
                <a href="https://github.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer" class="om-footer-link">
                    <i class="fa-brands fa-github me-1"></i>GitHub
                </a>
                <a href="https://www.linkedin.com/newsletters/7026708624966135808/" target="_blank" rel="noopener noreferrer" class="om-footer-link">
                    <i class="fa-brands fa-linkedin me-1"></i>Alf's Musings
                </a>
                <a href="https://en.liberapay.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer" class="om-footer-link">
                    <i class="fa-solid fa-circle-dollar-to-slot me-1"></i>Donate
                </a>
            </div>
        </div>

        <div class="om-footer-bottom">
            <span>© 2022–{{ new Date().getFullYear() }} OpenMagnetics</span>
            <button class="om-footer-prefs-btn" @click="resetConsent">
                <i class="fa-solid fa-cookie-bite me-1"></i>Cookie preferences
            </button>
        </div>
    </footer>
</template>

<style scoped>
.om-footer {
    min-width: 100%;
    background: linear-gradient(180deg,
        rgba(var(--bs-dark-rgb), 0.82) 0%,
        rgba(var(--bs-dark-rgb), 0.95) 100%);
    border-top: 1px solid rgba(var(--bs-primary-rgb), 0.3);
    box-shadow: 0 -4px 18px rgba(0, 0, 0, 0.35);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    padding: 1.5rem 0 0 0;
}

.om-footer-inner {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    padding: 0 2rem 1.25rem 2rem;
    border-bottom: 1px solid rgba(var(--bs-primary-rgb), 0.12);
}

/* Brand column */
.om-footer-brand {
    flex: 1 1 200px;
}

.om-footer-name {
    font-weight: 700;
    font-size: 1rem;
    background: linear-gradient(135deg,
        var(--bs-primary) 0%,
        color-mix(in srgb, var(--bs-primary) 70%, var(--bs-white) 30%) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

.om-footer-tagline {
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
    max-width: 220px;
    line-height: 1.4;
}

/* Link columns */
.om-footer-col {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 0 0 auto;
    min-width: 130px;
}

.om-footer-section-label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(var(--bs-primary-rgb), 0.7);
    margin-bottom: 0.25rem;
}

.om-footer-link {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.55);
    text-decoration: none;
    transition: color 0.15s;
}
.om-footer-link:hover {
    color: var(--bs-primary);
    text-decoration: none;
}

/* Bottom bar */
.om-footer-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 2rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.3);
    flex-wrap: wrap;
    gap: 0.5rem;
}

.om-footer-prefs-btn {
    background: transparent;
    border: 1px solid rgba(var(--bs-primary-rgb), 0.25);
    border-radius: 6px;
    color: rgba(var(--bs-primary-rgb), 0.6);
    font-size: 0.72rem;
    padding: 0.2rem 0.65rem;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.om-footer-prefs-btn:hover {
    color: var(--bs-primary);
    border-color: rgba(var(--bs-primary-rgb), 0.55);
    background: rgba(var(--bs-primary-rgb), 0.06);
}
</style>
