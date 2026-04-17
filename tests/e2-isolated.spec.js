import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = 'http://localhost:5174';
const SS_DIR = '/home/alf/OpenMagnetics/MKF/build';

async function screenshot(page, name) {
  const filePath = path.join(SS_DIR, `dab-battery-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, timeout: 10000 }).catch(() => {});
  console.log(`[ss] ${filePath}`);
}

async function openDabWizard(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wizardsToggle = toggles.find(el => el.textContent.includes('Wizards'));
    if (wizardsToggle) {
      wizardsToggle.click();
      const dropdown = wizardsToggle.closest('.dropdown') || wizardsToggle.parentElement;
      const menu = dropdown?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }
    const dabLink = document.querySelector('[data-cy="Dab-link"]');
    if (dabLink) dabLink.click();
  });
  await page.waitForURL('**/wizards', { timeout: 15000 }).catch(() => {});
  await page.waitForSelector('.sim-btn.analytical', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function switchToIKnowMode(page) {
  const label = page.locator('.design-mode-label').filter({ hasText: 'I know' }).first();
  if (await label.isVisible().catch(() => false)) {
    await label.click();
    await page.waitForTimeout(300);
  }
}

async function findModeSelect(page) {
  const conditionsCard = page.locator('.compact-card').filter({ hasText: 'Conditions' });
  const selects = await conditionsCard.locator('select').all();
  for (const sel of selects) {
    const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
    if (opts.some(o => ['SPS','EPS','TPS'].includes(o))) return sel;
  }
  throw new Error('Mode select not found');
}

test('E2 isolated', async ({ page }) => {
  page.on('console', msg => console.log(`[BROWSER-LOG] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[BROWSER-ERROR] ${err.message}`));

  console.log('[E2] Opening DAB wizard...');
  await openDabWizard(page);
  console.log('[E2] Setting up N2...');
  await switchToIKnowMode(page);
  const leakage = page.locator('#useLeakageInductance');
  if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
  await page.waitForTimeout(300);

  console.log('[E2] Selecting EPS mode...');
  const modeSelect = await findModeSelect(page);
  await modeSelect.selectOption('EPS');
  await page.waitForTimeout(300);

  const cCard = page.locator('.compact-card').filter({ hasText: 'Conditions' });
  const d1Row = cCard.locator('text=Primary D1').locator('../..');
  const d1Input = d1Row.locator('input[type="number"]').first();
  if (await d1Input.isVisible().catch(() => false)) {
    await d1Input.click({ clickCount: 3 });
    await d1Input.fill('15');
    await d1Input.press('Tab');
  }

  console.log('[E2] Clicking Simulated button...');
  const simBtn = page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first();
  await simBtn.click();

  console.log('[E2] Waiting for spinner to appear...');
  try {
    await page.waitForSelector('.sim-btn .fa-spinner', { timeout: 5000 });
    console.log('[E2] Spinner appeared, waiting for it to disappear...');
  } catch {
    console.log('[E2] Spinner did not appear within 5s');
  }

  console.log('[E2] Waiting for spinner to disappear (15s max)...');
  await page.waitForFunction(() => !document.querySelector('.sim-btn .fa-spinner'), { timeout: 15000 }).catch(() => {
    console.log('[E2] Spinner still present after 15s — timeout');
  });

  if (page.isClosed()) { console.log('[E2] Page closed during simulation — SKIP'); return; }
  await page.waitForTimeout(1000).catch(() => {});
  if (page.isClosed()) return;

  const errText = await page.locator('.error-text').first().innerText().catch(() => '');
  console.log(`[E2] EPS Simulated error: "${errText}"`);
  await screenshot(page, 'E2-eps-simulated');
});
