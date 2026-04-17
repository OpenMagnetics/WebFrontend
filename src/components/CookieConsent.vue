<script>
const CONSENT_KEY = 'om_cookie_consent';

function loadGTM() {
    (function(w,d,s,l,i){
        w[l]=w[l]||[];
        w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0], j=d.createElement(s), dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;
        j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
        f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-MVGMH67');
}

function loadHotjar() {
    (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:3142861,hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script'); r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
}

export default {
    data() {
        return { showBanner: false };
    },
    mounted() {
        const stored = localStorage.getItem(CONSENT_KEY);
        if (stored === 'accepted') {
            this.activateAnalytics();
        } else if (stored === null) {
            this.showBanner = true;
        }
        window.addEventListener('om-reset-consent', this.onReset);
    },
    beforeUnmount() {
        window.removeEventListener('om-reset-consent', this.onReset);
    },
    methods: {
        accept() {
            localStorage.setItem(CONSENT_KEY, 'accepted');
            this.activateAnalytics();
            this.showBanner = false;
        },
        decline() {
            localStorage.setItem(CONSENT_KEY, 'declined');
            this.showBanner = false;
        },
        onReset() {
            this.showBanner = true;
        },
        activateAnalytics() {
            if (window.location.hostname === 'localhost') return;
            loadGTM();
            loadHotjar();
        },
    },
};
</script>

<template>
    <Transition name="consent">
        <div v-if="showBanner" class="om-consent-banner" role="dialog" aria-label="Cookie consent">
            <div class="om-consent-inner">

                <div class="om-consent-icon-wrap">
                    <i class="fa-solid fa-cookie-bite"></i>
                </div>

                <div class="om-consent-text">
                    <div class="om-consent-header">
                        <strong class="om-consent-title">Obligatory cookie notice <span class="om-consent-subtitle">(yes, really — we checked with a lawyer)</span></strong>
                    </div>
                    <p class="om-consent-body">
                        We use <strong>Google Analytics</strong> and <strong>Hotjar</strong> to measure which parts of the tool actually get used
                        — fully anonymized, no personal data, and your magnetic designs never cross the airgap into our analytics stack.
                        We promise not to use it to train a competing product.
                        <a href="/cookie_policy" class="om-consent-link">Cookie Policy</a>
                        ·
                        <a href="/legal_notice" class="om-consent-link">Privacy Policy</a>
                    </p>
                </div>

                <div class="om-consent-actions">
                    <button class="om-consent-btn om-consent-decline" @click="decline">
                        <i class="fa-solid fa-shield-halved me-1"></i>Essential only
                    </button>
                    <button class="om-consent-btn om-consent-accept" @click="accept">
                        Accept &amp; close the loop <i class="fa-solid fa-bolt ms-1"></i>
                    </button>
                </div>

            </div>
        </div>
    </Transition>
</template>

<style scoped>
.om-consent-banner {
    position: fixed;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    width: min(900px, calc(100vw - 2rem));
    z-index: 9999;
    background:
        linear-gradient(135deg,
            rgba(var(--bs-primary-rgb), 0.06) 0%,
            rgba(var(--bs-primary-rgb), 0.02) 100%),
        rgba(var(--bs-dark-rgb), 0.97);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.3);
    border-left: 3px solid rgba(var(--bs-primary-rgb), 0.75);
    border-radius: 14px;
    box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(var(--bs-primary-rgb), 0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 1.1rem 1.25rem;
}

.om-consent-inner {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

/* Cookie icon badge */
.om-consent-icon-wrap {
    width: 2.8rem;
    height: 2.8rem;
    border-radius: 50%;
    background: rgba(var(--bs-primary-rgb), 0.12);
    border: 1px solid rgba(var(--bs-primary-rgb), 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 1.2rem;
    color: var(--bs-primary);
    filter: drop-shadow(0 0 6px rgba(var(--bs-primary-rgb), 0.35));
}

/* Text block */
.om-consent-text {
    flex: 1 1 280px;
}

.om-consent-header {
    margin-bottom: 0.3rem;
}

.om-consent-title {
    color: var(--bs-primary);
    font-size: 0.88rem;
}

.om-consent-subtitle {
    color: rgba(255, 255, 255, 0.35);
    font-size: 0.75rem;
    font-weight: 400;
    font-style: italic;
    margin-left: 0.3rem;
}

.om-consent-body {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.78rem;
    margin: 0;
    line-height: 1.55;
}

.om-consent-body strong {
    color: rgba(255, 255, 255, 0.85);
    font-weight: 600;
}

.om-consent-link {
    color: rgba(var(--bs-primary-rgb), 0.8);
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.15s;
}
.om-consent-link:hover {
    color: var(--bs-primary);
}

/* Buttons */
.om-consent-actions {
    display: flex;
    gap: 0.6rem;
    flex-shrink: 0;
    align-items: center;
    flex-wrap: wrap;
}

.om-consent-btn {
    border-radius: 9px;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.45rem 1rem;
    cursor: pointer;
    transition: filter 0.15s, transform 0.1s, box-shadow 0.15s, background 0.15s, border-color 0.15s;
    white-space: nowrap;
}
.om-consent-btn:hover {
    transform: translateY(-1px);
}

.om-consent-decline {
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.18);
}
.om-consent-decline:hover {
    color: rgba(255, 255, 255, 0.85);
    border-color: rgba(255, 255, 255, 0.38);
    background: rgba(255, 255, 255, 0.05);
}

.om-consent-accept {
    background: var(--bs-primary);
    color: var(--bs-dark);
    border: 1px solid var(--bs-primary);
    box-shadow: 0 2px 10px rgba(var(--bs-primary-rgb), 0.35);
}
.om-consent-accept:hover {
    filter: brightness(1.1);
    box-shadow: 0 4px 16px rgba(var(--bs-primary-rgb), 0.45);
}

/* Slide-up enter/leave */
.consent-enter-active,
.consent-leave-active {
    transition: opacity 0.28s ease, transform 0.28s ease;
}
.consent-enter-from,
.consent-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(2rem);
}
</style>
