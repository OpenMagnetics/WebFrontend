/**
 * ABT #2304 (a user, 2026-11-07): "I needed to go back to change the operating point input voltage range,
 * but it does not flow through to the magnetic builder even though it recalculates." A wizard run is a
 * preview (ABT #2209), "Continue design" went back with the old operating points, and "Design Magnetic"
 * replaces the whole design, core and wires included.
 *
 * Alf, 2026-11-07: an explicit update. When a wizard's latest run is not in the design it handed off, the
 * wizard offers "Update the design's operating points (keeps the core and wires)", and "Continue design"
 * shows that the wizard has newer results. Nothing changes until the user clicks.
 */
import { test, expect } from './_coverage.js';
import { openWizard, runAnalytical, clickDesignMagnetic } from './utils/index.js';
import { installActivityProbe, activityMark, waitForIdle } from './utils/activity.js';

const masState = (page) => page.evaluate(() => {
  const stores = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s;
  const mas = stores.get('mas').mas;
  return {
    operatingPoints: mas.inputs.operatingPoints.map((point) => point.name),
    turns: mas.magnetic.coil.functionalDescription.map((winding) => winding.numberTurns),
  };
});

// In the app, as the user does: New Magnetic -> the wizard (a page load would hide nothing here, but it is
// not what the user does).
async function backToWizard(page, linkCy) {
  await page.evaluate((cy) => {
    const toggle = document.querySelector('[data-cy="Header-new-magnetic-toggle"]');
    toggle.click();
    const menu = (toggle.closest('.dropdown') || toggle.parentElement).querySelector('.dropdown-menu');
    if (menu) menu.classList.add('show');
    const link = document.querySelector(`[data-cy="${cy}"]`);
    const group = link.closest('.dropdown-submenu');
    if (group) {
      group.querySelector('.dropdown-submenu-toggle')?.click();
      group.querySelector('.submenu-panel')?.classList.add('submenu-open');
    }
    link.click();
  }, linkCy);
  await page.waitForURL('**/wizards', { timeout: 120000 });
}

async function setInputVoltage(page, minimum, maximum) {
  for (const [end, value] of [['minimum', minimum], ['maximum', maximum]]) {
    const input = page.locator(`[data-cy$="-InputVoltage-${end}-number-input"] input`).first();
    await input.click();
    await input.press('Control+a');
    await input.type(String(value), { delay: 30 });
    await input.press('Tab');
  }
}

for (const [linkCy, name] of [['SingleSwitchForward-link', 'Single-switch forward'], ['Flyback-link', 'Flyback']]) {
  test(`WIZ-UPDATE-1 ${name}: a changed input voltage reaches the design only through the update button, keeping the magnetic`, async ({ page }) => {
    test.setTimeout(600000);
    await installActivityProbe(page);
    await openWizard(page, linkCy);
    await runAnalytical(page, 120000);
    const mark = await activityMark(page);
    await clickDesignMagnetic(page);
    await waitForIdle(page, { since: mark, quietMs: 3000, timeout: 240000, label: 'the handed-off design' });

    // The magnetic the user built, marked so it can be told from a reset one.
    await page.evaluate(() => {
      document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.coil.functionalDescription[0].numberTurns = 7;
    });
    const handedOff = await masState(page);

    await backToWizard(page, linkCy);
    await setInputVoltage(page, 200, 300);
    await runAnalytical(page, 120000);

    const button = page.locator('[data-cy="wizard-update-design-button"]');
    await expect(button, 'the wizard offers to update the design').toBeVisible({ timeout: 60000 });
    expect(await masState(page), 'a run alone does not touch the design').toEqual(handedOff);
    await expect(page.locator('[data-cy="Header-continue-design-unapplied-runs"]'), '"Continue design" says the wizard has newer results').toBeVisible();

    const wizardPoints = await page.evaluate(() => {
      const base = [...document.querySelectorAll('*')].map((element) => element.__vueParentComponent).find((component) => component?.type?.name === 'ConverterWizardBase');
      return base?.proxy?._resultsWizard?.simulatedOperatingPoints?.map((point) => point.name) ?? null;
    });
    await button.click();
    await expect(page.locator('[data-cy="wizard-update-design-done"]')).toBeVisible({ timeout: 60000 });

    const updated = await masState(page);
    expect(updated.turns, 'the magnetic is kept').toEqual(handedOff.turns);
    expect(updated.operatingPoints.some((point) => point.includes('200 V')), `the new operating points are in the design: ${JSON.stringify(updated.operatingPoints)}`).toBe(true);
    if (wizardPoints != null) {
      expect(updated.operatingPoints).toEqual(wizardPoints);
    }
    await expect(button).toHaveCount(0);
    await expect(page.locator('[data-cy="Header-continue-design-unapplied-runs"]')).toHaveCount(0);
  });
}
