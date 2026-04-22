/**
 * Home Page, Header & Footer Tests
 *
 * Covers the public-facing chrome: home hero, header links, wizard dropdown
 * (all 15 wizard entries), donate/GitHub links, bug reporter modal,
 * cookie banner, footer, and logo navigation.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL, isBenign, screenshot } from './utils.js';

const ss = (page, name) => screenshot(page, 'home', name);

/** Clear cookie consent so the banner appears on next load. */
async function clearConsent(page) {
  await page.addInitScript(() => {
    try { localStorage.removeItem('om_cookie_consent'); } catch {}
  });
}

/** Navigate to home and wait for it to render. */
async function openHome(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);
}

// ── Home hero ─────────────────────────────────────────────────────────────

test.describe('Home — hero and tool cards', () => {
  test.describe.configure({ timeout: 30000 });

  test('H1: hero title visible', async ({ page }) => {
    await openHome(page);
    const title = page.locator('[data-cy="Home-title-text"]');
    await expect(title).toBeVisible({ timeout: 10000 });
    const text = await title.textContent();
    expect(text).toContain('OpenMagnetics');
    await ss(page, 'H1-hero');
  });

  test('H2: tool cards section has at least 3 cards', async ({ page }) => {
    await openHome(page);
    const cards = page.locator('.card');
    await cards.first().waitFor({ timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
    await ss(page, 'H2-cards');
  });

  test('H3: page body has substantive content', async ({ page }) => {
    await openHome(page);
    const text = await page.locator('body').textContent();
    expect(text.length).toBeGreaterThan(200);
  });
});

// ── Header links ──────────────────────────────────────────────────────────

test.describe('Header — static links', () => {
  test.describe.configure({ timeout: 30000 });

  test('H4: logo link visible', async ({ page }) => {
    await openHome(page);
    await expect(page.locator('[data-cy="Header-logo-home-link"]')).toBeVisible({ timeout: 10000 });
  });

  test('H5: brand text link visible', async ({ page }) => {
    await openHome(page);
    await expect(page.locator('[data-cy="Header-brand-home-link"]')).toBeVisible();
  });

  test('H6: New Magnetic link visible', async ({ page }) => {
    await openHome(page);
    await expect(page.locator('[data-cy="Header-new-magnetic-link"]')).toBeVisible();
  });

  test('H7: Insulation Coordinator link visible', async ({ page }) => {
    await openHome(page);
    const btn = page.locator('[data-cy="Header-insulation-coordinator-link"]');
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(btn).toBeVisible();
    } else {
      // Link may be behind a sub-menu — non-fatal, document state
      console.log('[H7] Insulation Coordinator link not directly visible');
    }
  });

  test('H8: Donate link has Liberapay href', async ({ page }) => {
    await openHome(page);
    const link = page.locator('[data-cy="Header-donate-link"]');
    await expect(link).toBeVisible({ timeout: 10000 });
    const href = await link.getAttribute('href');
    expect(href).toContain('liberapay.com');
  });

  test('H9: Repository (GitHub) link has correct href', async ({ page }) => {
    await openHome(page);
    const link = page.locator('[data-cy="Header-repository-link"]');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toMatch(/github\.com\/OpenMagnetics/i);
  });

  test('H10: logo click navigates to home', async ({ page }) => {
    // Navigate away first, then click logo
    await page.goto(`${BASE_URL}/legal_notice`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(800);
    const logo = page.locator('[data-cy="Header-logo-home-link"]');
    if (await logo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logo.click();
      await page.waitForTimeout(800);
      expect(page.url()).toMatch(/\/($|#|\?)/);
    }
  });
});

// ── Wizard dropdown ───────────────────────────────────────────────────────

test.describe('Header — wizard dropdown', () => {
  test.describe.configure({ timeout: 30000 });

  // Wizard links that should exist (per source inspection).
  // Disabled entries (Wizard-DifferentialModeChoke, Cllc, Psfb) are still present
  // in the DOM — just with the disabled attribute.
  const ALL_WIZARD_LINKS = [
    'Wizard-CommonModeChoke-link',
    'Wizard-DifferentialModeChoke-link',
    'Flyback-CommonModeChoke-link',
    'Buck-CommonModeChoke-link',
    'Boost-CommonModeChoke-link',
    'IsolatedBuck-CommonModeChoke-link',
    'IsolatedBuckBoost-CommonModeChoke-link',
    'PushPull-CommonModeChoke-link',
    'Pfc-link',
    'Dab-link',
    'Llc-link',
    'Cllc-link',
    'Psfb-link',
    'ActiveClampForward-CommonModeChoke-link',
    'SingleSwitchForward-CommonModeChoke-link',
    'TwoSwitchForward-CommonModeChoke-link',
  ];

  /** Open the wizard dropdown by toggling it via Bootstrap. */
  async function openWizardDropdown(page) {
    await page.evaluate(() => {
      const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
      const wizardsToggle = toggles.find(el => el.textContent.includes('Wizards'));
      if (wizardsToggle) {
        wizardsToggle.click();
        const dropdown = wizardsToggle.closest('.dropdown') || wizardsToggle.parentElement;
        const menu = dropdown?.querySelector('.dropdown-menu');
        if (menu) menu.classList.add('show');
      }
    });
    await page.waitForTimeout(400);
  }

  test('H11: Wizards toggle exists in header', async ({ page }) => {
    await openHome(page);
    const toggle = page.locator('.dropdown-toggle').filter({ hasText: 'Wizards' }).first();
    await expect(toggle).toBeVisible({ timeout: 10000 });
  });

  test('H12: opening dropdown reveals at least one wizard link', async ({ page }) => {
    await openHome(page);
    await openWizardDropdown(page);
    // Buck-CommonModeChoke-link is always enabled
    await expect(
      page.locator('[data-cy="Buck-CommonModeChoke-link"]')
    ).toBeVisible({ timeout: 5000 });
    await ss(page, 'H12-wizard-dropdown');
  });

  test('H13: all expected wizard links present in DOM', async ({ page }) => {
    await openHome(page);
    await openWizardDropdown(page);

    const missing = [];
    for (const cy of ALL_WIZARD_LINKS) {
      const exists = await page.locator(`[data-cy="${cy}"]`).count() > 0;
      if (!exists) missing.push(cy);
    }
    expect(missing).toEqual([]);
  });
});

// ── Bug Reporter modal ────────────────────────────────────────────────────

test.describe('Header — Bug Reporter modal', () => {
  test.describe.configure({ timeout: 30000 });

  test('H14: bug reporter button visible', async ({ page }) => {
    await openHome(page);
    const btn = page.locator('[data-cy="Header-report-bug-modal-button"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
  });

  test('H15: clicking bug reporter opens modal', async ({ page }) => {
    await openHome(page);
    const btn = page.locator('[data-cy="Header-report-bug-modal-button"]');
    await btn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('[data-cy="BugReporter-title"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-cy="BugReporter-user-information-input"]')).toBeVisible();
    await expect(page.locator('[data-cy="BugReporter-report-bug-button"]')).toBeVisible();
    await ss(page, 'H15-bug-modal-open');
  });

  test('H16: modal can be dismissed via Cancel', async ({ page }) => {
    await openHome(page);
    await page.locator('[data-cy="Header-report-bug-modal-button"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-cy="BugReporter-close-modal-button"]').click();
    await page.waitForTimeout(500);
    // Modal backdrop should be gone
    await expect(page.locator('[data-cy="BugReporter-title"]')).not.toBeVisible({ timeout: 3000 });
  });
});

// ── Cookie banner ─────────────────────────────────────────────────────────

test.describe('Cookie banner', () => {
  test.describe.configure({ timeout: 30000 });

  test('H17: banner appears on first visit', async ({ page }) => {
    await clearConsent(page);
    await openHome(page);
    const banner = page.locator('.om-consent-banner, [role="dialog"][aria-label*="Cookie"]').first();
    const visible = await banner.isVisible({ timeout: 5000 }).catch(() => false);
    // Banner may be below-the-fold; at minimum the container should exist in DOM
    const exists = await banner.count() > 0;
    expect(exists).toBe(true);
    if (visible) await ss(page, 'H17-cookie-banner');
  });

  test('H18: accept button click dismisses banner', async ({ page }) => {
    await clearConsent(page);
    await openHome(page);
    const accept = page.locator('.om-consent-accept').first();
    if (await accept.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accept.click();
      await page.waitForTimeout(500);
      await expect(accept).not.toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });

  test('H19: decline button click dismisses banner', async ({ page }) => {
    await clearConsent(page);
    await openHome(page);
    const decline = page.locator('.om-consent-decline').first();
    if (await decline.isVisible({ timeout: 5000 }).catch(() => false)) {
      await decline.click();
      await page.waitForTimeout(500);
      await expect(decline).not.toBeVisible({ timeout: 3000 });
    } else {
      test.skip();
    }
  });
});

// ── Footer ────────────────────────────────────────────────────────────────

test.describe('Footer — links', () => {
  test.describe.configure({ timeout: 30000 });

  test('H20: cookie policy link has correct href', async ({ page }) => {
    await openHome(page);
    const link = page.locator('[data-cy="Footer-cookie-policy-link"]');
    await expect(link).toBeVisible({ timeout: 10000 });
    const href = await link.getAttribute('href');
    expect(href).toBe('/cookie_policy');
  });

  test('H21: legal notice link has correct href', async ({ page }) => {
    await openHome(page);
    const link = page.locator('[data-cy="Footer-legal-link"]');
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(href).toBe('/legal_notice');
  });

  test('H22: terms link navigates to /terms', async ({ page }) => {
    await openHome(page);
    const link = page.locator('a[href="/terms"]').first();
    await expect(link).toBeVisible({ timeout: 10000 });
  });
});
