import { test, expect } from './_coverage.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

async function openDabWizard(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(1000);
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
  await page.waitForURL('**/wizards', { timeout: 15000 }).catch(() => {});
  await page.waitForSelector('.sim-btn.analytical', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(300);
}

test('sanity', async ({ page }) => {
  await openDabWizard(page);
  const simBtn = await page.locator('.sim-btn').filter({ hasText: 'Simulated' }).count();
  expect(simBtn).toBeGreaterThan(0);
});
