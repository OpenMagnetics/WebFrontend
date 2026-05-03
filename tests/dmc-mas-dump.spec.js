/**
 * Capture the MAS object the DMC wizard produces, save it to disk, so we can
 * mirror it as a fixture in MKF's TestMagneticAdviser.
 */
import { test } from './_coverage.js';
import { BASE_URL } from './utils.js';
import { writeFileSync } from 'node:fs';

test('dmc-mas-dump', async ({ page }) => {
  test.setTimeout(120000);

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const toggles = Array.from(document.querySelectorAll('.dropdown-toggle'));
    const wt = toggles.find(el => el.textContent.includes('Wizards'));
    if (wt) {
      wt.click();
      const dd = wt.closest('.dropdown') || wt.parentElement;
      const menu = dd?.querySelector('.dropdown-menu');
      if (menu) menu.classList.add('show');
    }
    const link = document.querySelector('[data-cy="Wizard-DifferentialModeChoke-link"]');
    if (link) link.click();
  });
  await page.waitForSelector('[data-cy="DmcWizard-title"]', { timeout: 60000 });
  await page.waitForTimeout(500);

  // Click "Design Magnetic" to run the wizard's processWizardData and hand off.
  await page.locator('button').filter({ hasText: 'Design Magnetic' }).first().click();
  await page.waitForURL('**/magnetic_tool**', { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Read the full MAS JSON.
  const mas = await page.evaluate(() => {
    const app = document.querySelector('#app').__vue_app__;
    const pinia = app._context?.config?.globalProperties?.$pinia || app.config?.globalProperties?.$pinia;
    return JSON.parse(JSON.stringify(pinia?._s?.get('mas')?.mas));
  });
  writeFileSync('tests/fixtures/dmc-default-mas.json', JSON.stringify(mas, null, 2));
  console.log('[mas]', 'numWindings=' + (mas?.magnetic?.coil?.functionalDescription?.length || 0));
  console.log('[mas]', 'topology=' + mas?.inputs?.designRequirements?.topology);
  console.log('[mas]', 'opPoints=' + (mas?.inputs?.operatingPoints?.length || 0));
  console.log('[mas]', 'inductance=' + JSON.stringify(mas?.inputs?.designRequirements?.magnetizingInductance));
});
