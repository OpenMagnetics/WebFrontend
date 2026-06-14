import { test, expect } from './_coverage.js';

import { tryWaitForURL, pause, tryWaitForSelector } from './utils/wait.js';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function openDabWizard(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await pause(page, 1000, 'mechanical: settle');
  const clicked = await page.evaluate(() => {
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wizardsToggle = toggles.find(el => el.textContent.includes('Wizards'));
    if (wizardsToggle) {
      wizardsToggle.click();
      const dropdown = wizardsToggle.closest('.dropdown') || wizardsToggle.parentElement;
      const menu = dropdown?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }
    const dabLink = document.querySelector('[data-cy="Dab-link"]');
    if (dabLink) { dabLink.click(); return true; }
    return false;
  });
  // Cold contexts route through /engine_loader (WASM init takes 30-90s);
  // match openWizard's 120s budget instead of soft-timing-out at 15s.
  await tryWaitForURL(page, '**/wizards', 120000);
  await tryWaitForSelector(page,'.sim-btn.analytical', { timeout: 30000 });
  await pause(page, 300, 'mechanical: settle');
}

test('sanity', async ({ page }) => {
  await openDabWizard(page);
  const simBtn = await page.locator('.sim-btn').filter({ hasText: 'Simulated' }).count();
  expect(simBtn).toBeGreaterThan(0);
});
