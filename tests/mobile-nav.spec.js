/**
 * ABT #193: on a narrow viewport the navbar toggler opened the collapsed menu
 * and the document-level click handler (closeDropdowns) closed it again in the
 * same click, so the menu never showed.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

test.use({ viewport: { width: 390, height: 844 } });

test('NAV-1: the hamburger opens the menu on a phone-width viewport', async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  const toggler = page.locator('.navbar-toggler');
  await expect(toggler).toBeVisible({ timeout: 20000 });
  await toggler.click();
  await expect(page.locator('#navbarNavDropdown')).toHaveClass(/\bshow\b/);
  await expect(page.locator('[data-cy="Header-Load-MAS-file-button"], #navbarNavDropdown .nav-link').first()).toBeVisible();
  await toggler.click();
  await expect(page.locator('#navbarNavDropdown')).not.toHaveClass(/\bshow\b/);
});
