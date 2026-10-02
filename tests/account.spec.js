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
        // POST: create (unique id per created design)
        const body = route.request().postDataJSON();
        state.posts = [...(state.posts || []), body];
        const created = designRow({ id: `created-${(state.posts.length)}`, name: body.name });
        state.mas = { ...(state.mas || {}), [created.id]: body.mas };
        state.designs = [created, ...state.designs];
        return route.fulfill({ json: { ...created, schema_errors: [] } });
    });
    // Single design: GET returns the full MAS, PUT records the update.
    await page.route('**/designs/*', (route) => {
        if (route.request().resourceType() === 'document') {
            return route.fallback();
        }
        const id = new URL(route.request().url()).pathname.split('/').pop();
        const design = state.designs.find((row) => row.id === id);
        if (design == null) {
            return route.fulfill({ status: 404, json: { detail: 'Design not found' } });
        }
        if (route.request().method() === 'GET') {
            state.gets = [...(state.gets || []), id];
            return route.fulfill({ json: { ...design, mas: (state.mas || {})[id] } });
        }
        if (route.request().method() === 'PUT') {
            state.puts = [...(state.puts || []), id];
            design.version += 1;
            return route.fulfill({ json: { ...design, schema_errors: [] } });
        }
        return route.fallback();
    });
}

const ORIGINAL = designRow({ id: 'orig', name: 'Original' });
const ORIGINAL_MAS = { inputs: { designRequirements: { name: 'original-mas-marker' } } };

// Start logged in on My Designs with the working design linked to ORIGINAL.
async function openMyDesignsLinkedToOriginal(page, state) {
    await mockAccountsApi(page, state);
    await page.addInitScript(() => {
        localStorage.setItem('om_has_session', '1');
        localStorage.setItem('cloudDesign', JSON.stringify({ designId: 'orig', version: 1, name: 'Original' }));
    });
    await page.goto(`${BASE_URL}/designs`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-cy="MyDesigns-row-Original"]')).toBeVisible({ timeout: 15000 });
}

function linkedDesignId(page) {
    return page.evaluate(() => JSON.parse(localStorage.getItem('cloudDesign')).designId);
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

    test('header quick-save (unlinked) lands on My Designs with the save dialog OPEN (ABT #344)', async ({ page }) => {
        const state = { loggedIn: true, emailExists: true, designs: [] };
        await mockAccountsApi(page, state);
        // fetchMe() only asks the backend when the has-session hint is set.
        await page.addInitScript(() => localStorage.setItem('om_has_session', '1'));

        // /designs?save=1 is what the header's "Save design to account"
        // pushes for a not-yet-linked design: the name input must already be
        // open — a bare empty list looked like the save did nothing.
        await page.goto(`${BASE_URL}/designs?save=1`, { waitUntil: 'domcontentloaded' });
        const nameInput = page.locator('[data-cy="MyDesigns-save-name-input"]');
        await expect(nameInput).toBeVisible({ timeout: 15000 });

        // And saving from here works end-to-end against the mocked API.
        await nameInput.fill('Quick-saved design');
        await page.click('[data-cy="MyDesigns-save-confirm-button"]');
        await expect(page.locator('[data-cy="MyDesigns-row-Quick-saved design"]')).toBeVisible({ timeout: 15000 });
    });

    test('My Designs: Duplicate copies the full MAS as "(copy)", "(copy 2)" and leaves the link alone', async ({ page }) => {
        const state = { loggedIn: true, emailExists: true, designs: [{ ...ORIGINAL }], mas: { orig: ORIGINAL_MAS } };
        await openMyDesignsLinkedToOriginal(page, state);

        await page.click('[data-cy="MyDesigns-duplicate-Original"]');
        await expect(page.locator('[data-cy="MyDesigns-row-Original (copy)"]')).toBeVisible({ timeout: 15000 });
        await page.click('[data-cy="MyDesigns-duplicate-Original"]');
        await expect(page.locator('[data-cy="MyDesigns-row-Original (copy 2)"]')).toBeVisible({ timeout: 15000 });

        // The copy carries the full MAS fetched from the server, not a summary.
        expect(state.gets).toEqual(['orig', 'orig']);
        expect(state.posts.map((body) => body.name)).toEqual(['Original (copy)', 'Original (copy 2)']);
        expect(state.posts[0].mas).toEqual(ORIGINAL_MAS);
        // Original untouched, working design still linked to it.
        expect(state.puts || []).toEqual([]);
        expect(await linkedDesignId(page)).toBe('orig');
        await expect(page.locator('[data-cy="MyDesigns-row-Original"] .pi-link')).toHaveCount(1);
        await expect(page.locator('[data-cy="MyDesigns-row-Original (copy)"] .pi-link')).toHaveCount(0);
        await expect(page.locator('[data-cy="MyDesigns-error"]')).toHaveCount(0);
    });

    test('My Designs: Save as… creates a new design, relinks, and the next save updates the copy', async ({ page }) => {
        const state = { loggedIn: true, emailExists: true, designs: [{ ...ORIGINAL }], mas: { orig: ORIGINAL_MAS } };
        await openMyDesignsLinkedToOriginal(page, state);

        await page.click('[data-cy="MyDesigns-save-as-button"]');
        const nameInput = page.locator('[data-cy="MyDesigns-save-name-input"]');
        await expect(nameInput).toHaveValue('Original (copy)');
        await nameInput.fill('Variant B');
        await page.click('[data-cy="MyDesigns-save-confirm-button"]');
        await expect(page.locator('[data-cy="MyDesigns-row-Variant B"] .pi-link')).toHaveCount(1, { timeout: 15000 });
        await expect(page.locator('[data-cy="MyDesigns-row-Original"] .pi-link')).toHaveCount(0);
        expect(state.posts.map((body) => body.name)).toEqual(['Variant B']);
        expect(await linkedDesignId(page)).toBe('created-1');

        // A following plain save goes to the copy, never the original.
        await page.click('[data-cy="MyDesigns-save-current-button"]');
        await expect.poll(() => (state.puts || []).length, { timeout: 15000 }).toBe(1);
        expect(state.puts).toEqual(['created-1']);
        await expect(page.locator('[data-cy="MyDesigns-error"]')).toHaveCount(0);
    });

    test('header "Save design as…" opens My Designs with the save-as name input', async ({ page }) => {
        const state = { loggedIn: true, emailExists: true, designs: [{ ...ORIGINAL }], mas: { orig: ORIGINAL_MAS } };
        await mockAccountsApi(page, state);
        await page.addInitScript(() => {
            localStorage.setItem('om_has_session', '1');
            localStorage.setItem('cloudDesign', JSON.stringify({ designId: 'orig', version: 1, name: 'Original' }));
        });
        await page.goto(`${BASE_URL}/designs?saveAs=1`, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('[data-cy="MyDesigns-save-name-input"]')).toHaveValue('Original (copy)', { timeout: 15000 });
        await expect(page.locator('[data-cy="MyDesigns-save-confirm-button"]')).toHaveText('Save as new design');
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
