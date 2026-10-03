/**
 * Bug reports carry a way to answer the reporter: the account email when
 * logged in, else the optional address typed in the form. Before this every
 * report was stored as "Anonymous", so fixed bugs could not be answered.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

async function openReporter(page) {
  const posted = [];
  await page.route('**/report_bug', async (route) => {
    posted.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"reported","bug_report_id":1}' });
  });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('[data-cy="Header-report-bug-modal-button"]').click();
  await expect(page.locator('[data-cy="BugReporter-title"]')).toBeVisible({ timeout: 5000 });
  await page.locator('[data-cy="BugReporter-user-information-input"]').fill('the coil plot is empty');
  return posted;
}

test('BUGREP-1: an anonymous reporter without email is sent as Anonymous', async ({ page }) => {
  const posted = await openReporter(page);
  await page.locator('[data-cy="BugReporter-report-bug-button"]').click();
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0].username).toBe('Anonymous');
  expect(posted[0].userInformation).toBe('the coil plot is empty');
});

test('BUGREP-2: the optional email an anonymous reporter types is sent', async ({ page }) => {
  const posted = await openReporter(page);
  await page.locator('[data-cy="BugReporter-contact-email-input"]').fill('  someone@example.org ');
  await page.locator('[data-cy="BugReporter-report-bug-button"]').click();
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0].username).toBe('someone@example.org');
});

test('BUGREP-3: a typed address that is not an email blocks the report and says why', async ({ page }) => {
  const posted = await openReporter(page);
  await page.locator('[data-cy="BugReporter-contact-email-input"]').fill('someone at example');
  await page.locator('[data-cy="BugReporter-report-bug-button"]').click();
  await expect(page.locator('[data-cy="BugReporter-error-message"]')).toContainText('is not an email address');
  expect(posted.length).toBe(0);
});

test('BUGREP-4: a logged-in reporter is sent with the account email, no email field shown', async ({ page }) => {
  const posted = await openReporter(page);
  await page.evaluate(() => {
    const auth = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('auth');
    auth.user = { id: 7, email: 'account@example.org', display_name: 'A', email_verified: true, created_at: '2026-10-03' };
  });
  await expect(page.locator('[data-cy="BugReporter-reply-to"]')).toContainText('account@example.org');
  await expect(page.locator('[data-cy="BugReporter-contact-email-input"]')).toHaveCount(0);
  await page.locator('[data-cy="BugReporter-report-bug-button"]').click();
  await expect.poll(() => posted.length).toBe(1);
  expect(posted[0].username).toBe('account@example.org');
});
