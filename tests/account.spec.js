/**
 * tests/account.spec.js
 *
 * Account flows (optional login, My Designs) against a fully mocked accounts
 * API — no real backend or database is touched. Also guards the anonymous
 * contract: with no session, the app renders exactly as before (Sign in
 * button present, nothing else moved behind the login wall).
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const USER = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'engineer@example.com',
    display_name: 'engineer',
    email_verified: false,
    created_at: '2026-07-12T00:00:00+00:00',
};

// Minimal envelope the frontend reads from design listings.
function designRow(overrides = {}) {
    return {
        id: '00000000-0000-0000-0000-0000000000d1',
        name: 'Saved transformer',
        version: 1,
        revisions: 1,
        schema_valid: true,
        created_at: '2026-07-12T10:00:00+00:00',
        updated_at: '2026-07-12T10:00:00+00:00',
        ...overrides,
    };
}

// Mock the accounts API. `state` mutates across calls so the login flow works
// end-to-end: before login /auth/me is 401, afterwards it returns the user.
async function mockAccountsApi(page, state) {
    await page.route('**/auth/me', (route) => {
        if (state.loggedIn) {
            return route.fulfill({ json: USER });
        }
        return route.fulfill({ status: 401, json: { detail: 'Not authenticated' } });
    });
    await page.route('**/auth/check_email', (route) => {
        return route.fulfill({ json: { exists: state.emailExists } });
    });
    await page.route('**/auth/register', (route) => {
        state.loggedIn = true;
        return route.fulfill({ json: USER });
    });
    await page.route('**/auth/login', (route) => {
        state.loggedIn = true;
        return route.fulfill({ json: USER });
    });
    await page.route('**/auth/logout', (route) => {
        state.loggedIn = false;
        return route.fulfill({ json: { status: 'logged_out' } });
    });
    await page.route('**/me/settings', (route) => {
        if (route.request().method() === 'GET') {
            return route.fulfill({ json: { settings: null, updated_at: null } });
        }
        return route.fulfill({ json: { settings: {}, updated_at: '2026-07-12T10:00:00+00:00' } });
    });
    await page.route('**/designs', (route) => {
        // '/designs' is ALSO the SPA page route — only intercept API (XHR)
        // calls, never the document navigation itself.
        if (route.request().resourceType() === 'document') {
            return route.fallback();
        }
        if (route.request().method() === 'GET') {
            return route.fulfill({ json: { designs: state.designs } });
        }
        // POST: create
        const body = route.request().postDataJSON();
        const created = designRow({ name: body.name });
        state.designs = [created, ...state.designs];
        return route.fulfill({ json: { ...created, schema_errors: [] } });
    });
}

test.describe('accounts', () => {
    test('anonymous contract: Sign in visible, no account menu, tools untouched', async ({ page }) => {
        const state = { loggedIn: false, emailExists: false, designs: [] };
        await mockAccountsApi(page, state);

        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-cy="Header-sign-in-button"]')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('[data-cy="Header-account-menu-button"]')).toHaveCount(0);
        // The anonymous feature set is untouched: Load MAS + wizards + tools remain.
        await expect(page.locator('[data-cy="Header-Load-MAS-file-button"]')).toHaveCount(1);
    });

    test('register flow: email → password → logged-in header menu', async ({ page }) => {
        const state = { loggedIn: false, emailExists: false, designs: [] };
        await mockAccountsApi(page, state);

        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.click('[data-cy="Header-sign-in-button"]');
        await expect(page.locator('[data-cy="AccountModal-title"]')).toBeVisible({ timeout: 10000 });

        await page.fill('[data-cy="AccountModal-email-input"]', USER.email);
        await page.click('[data-cy="AccountModal-continue-button"]');

        // Unknown email → the submit is "Create account".
        const submit = page.locator('[data-cy="AccountModal-submit-button"]');
        await expect(submit).toHaveText(/Create account/, { timeout: 10000 });
        await page.fill('[data-cy="AccountModal-password-input"]', 'a-strong-password');
        await submit.click();

        await expect(page.locator('[data-cy="Header-account-menu-button"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('[data-cy="Header-account-menu-button"]')).toContainText(USER.display_name);
        await expect(page.locator('[data-cy="Header-sign-in-button"]')).toHaveCount(0);
    });

    test('login flow for an existing email, then sign out restores anonymous UI', async ({ page }) => {
        const state = { loggedIn: false, emailExists: true, designs: [] };
        await mockAccountsApi(page, state);

        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.click('[data-cy="Header-sign-in-button"]');
        await page.fill('[data-cy="AccountModal-email-input"]', USER.email);
        await page.click('[data-cy="AccountModal-continue-button"]');

        const submit = page.locator('[data-cy="AccountModal-submit-button"]');
        await expect(submit).toHaveText(/Log in/, { timeout: 10000 });
        await page.fill('[data-cy="AccountModal-password-input"]', 'a-strong-password');
        await submit.click();

        const menu = page.locator('[data-cy="Header-account-menu-button"]');
        await expect(menu).toBeVisible({ timeout: 10000 });

        await menu.click();
        await page.click('[data-cy="Header-sign-out-button"]');
        await expect(page.locator('[data-cy="Header-sign-in-button"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('[data-cy="Header-account-menu-button"]')).toHaveCount(0);
    });

    test('My Designs: signed-out notice, then list after login', async ({ page }) => {
        const state = { loggedIn: false, emailExists: true, designs: [designRow()] };
        await mockAccountsApi(page, state);

        // Signed out: friendly notice, no table.
        await page.goto(`${BASE_URL}/designs`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-cy="MyDesigns-signed-out"]')).toBeVisible({ timeout: 15000 });

        // Log in (through the header modal), then the list renders.
        await page.click('[data-cy="Header-sign-in-button"]');
        await page.fill('[data-cy="AccountModal-email-input"]', USER.email);
        await page.click('[data-cy="AccountModal-continue-button"]');
        await page.fill('[data-cy="AccountModal-password-input"]', 'a-strong-password');
        await page.click('[data-cy="AccountModal-submit-button"]');
        await expect(page.locator('[data-cy="Header-account-menu-button"]')).toBeVisible({ timeout: 10000 });

        await page.goto(`${BASE_URL}/designs`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-cy="MyDesigns-table"]')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('[data-cy="MyDesigns-row-Saved transformer"]')).toBeVisible();
        await expect(page.locator('[data-cy="MyDesigns-open-Saved transformer"]')).toBeVisible();
    });
});
