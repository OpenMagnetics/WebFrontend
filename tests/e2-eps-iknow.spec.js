import { test, expect } from './_coverage.js';

const BASE_URL = 'http://localhost:5174';

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

test('EPS Simulated with I-know mode', async ({ page }) => {
  page.on('console', msg => console.log('[BROWSER]', msg.text()));
  page.on('pageerror', err => console.log('[PAGEERROR]', err.message));

  await openDabWizard(page);
  await switchToIKnowMode(page);

  const leakage = page.locator('#useLeakageInductance');
  if (await leakage.isChecked().catch(() => false)) await leakage.uncheck();
  await page.waitForTimeout(300);

  const conditionsCard = page.locator('.compact-card').filter({ hasText: 'Conditions' });
  const selects = await conditionsCard.locator('select').all();
  let modeSelect = null;
  for (const sel of selects) {
    const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
    if (opts.some(o => ['SPS','EPS'].includes(o))) { modeSelect = sel; break; }
  }
  await modeSelect.selectOption('EPS');
  await page.waitForTimeout(300);

  const d1Row = conditionsCard.locator('text=Primary D1').locator('../..');
  const d1Input = d1Row.locator('input[type="number"]').first();
  if (await d1Input.isVisible().catch(() => false)) {
    await d1Input.click({ clickCount: 3 });
    await d1Input.fill('15');
    await d1Input.press('Tab');
  }

  console.log('Clicking Simulated...');
  await page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first().click();
  console.log('Waiting for spinner to disappear...');
  await page.waitForFunction(() => !document.querySelector('.sim-btn .fa-spinner'), { timeout: 20000 });
  console.log('Spinner gone.');

  const canvasCount = await page.locator('canvas').count();
  expect(canvasCount).toBeGreaterThan(0);
});
