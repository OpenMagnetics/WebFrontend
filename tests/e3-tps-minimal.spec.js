import { test, expect } from '@playwright/test';

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

test('TPS Simulated waveforms appear', async ({ page }) => {
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WASM-TIMING') || text.includes('NGSPICE-TIMING') || text.includes('🔍')) console.log(text);
  });

  await openDabWizard(page);
  await page.evaluate(() => {
    const leakage = document.querySelector('#useLeakageInductance');
    if (leakage && leakage.checked) leakage.click();
  });
  await page.waitForTimeout(300);

  const conditionsCard = page.locator('.compact-card').filter({ hasText: 'Conditions' });
  const selects = await conditionsCard.locator('select').all();
  let modeSelect = null;
  for (const sel of selects) {
    const opts = await sel.evaluate(el => Array.from(el.options).map(o => o.value));
    if (opts.some(o => ['SPS','EPS','TPS'].includes(o))) { modeSelect = sel; break; }
  }
  await modeSelect.selectOption('TPS');
  await page.waitForTimeout(300);

  const d1Row = conditionsCard.locator('text=Primary D1').locator('../..');
  const d1Input = d1Row.locator('input[type="number"]').first();
  if (await d1Input.isVisible().catch(() => false)) {
    await d1Input.click({ clickCount: 3 });
    await d1Input.fill('15');
    await d1Input.press('Tab');
  }
  const d2Row = conditionsCard.locator('text=Secondary D2').locator('../..');
  const d2Input = d2Row.locator('input[type="number"]').first();
  if (await d2Input.isVisible().catch(() => false)) {
    await d2Input.click({ clickCount: 3 });
    await d2Input.fill('20');
    await d2Input.press('Tab');
  }

  await page.locator('.sim-btn').filter({ hasText: 'Simulated' }).first().click();
  await page.waitForFunction(() => !document.querySelector('.sim-btn .fa-spinner'), { timeout: 20000 });

  const canvasCount = await page.locator('canvas').count();
  expect(canvasCount).toBeGreaterThan(0);
});
