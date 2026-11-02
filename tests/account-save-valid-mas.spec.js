/**
 * tests/account-save-valid-mas.spec.js
 *
 * Regression guard for ABT #2222 (found 2026-11-02): every wizard design saved to an account was
 * stored with the orange "schema" badge. The engine leaves unset optionals as explicit nulls
 * (designRequirements.market, .application, magnetizingInductance.unit, ...); the MAS schema
 * requires those keys to be ABSENT, so the backend quarantined each saved design as invalid.
 * "Export MAS" already dropped the nulls; the account save sent the mas store as it was.
 *
 * Locks down: the document "Save design to account" sends has no null keys, and its inputs
 * validate against the real MAS schema. The accounts API is mocked; no backend is touched.
 */
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { openWizard, runAnalytical, clickDesignMagnetic, withPinia } from './utils/index.js';

const USER = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'engineer@example.com',
    display_name: 'engineer',
    email_verified: false,
    created_at: '2026-07-12T00:00:00+00:00',
};

function inputsValidator() {
    const bundle = JSON.parse(readFileSync(
        new URL('../WebSharedComponents/assets/js/masSchemas.json', import.meta.url), 'utf8'));
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    for (const schema of bundle.schemas) ajv.addSchema(schema);
    const validate = ajv.getSchema('https://psma.com/mas/inputs.json');
    if (!validate) throw new Error('masSchemas.json has no MAS inputs schema');
    return validate;
}

/** Paths of every object key whose value is null. */
function nullPaths(value, path = '') {
    if (Array.isArray(value)) return value.flatMap((item, i) => nullPaths(item, `${path}/${i}`));
    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([key, item]) =>
            item === null ? [`${path}/${key}`] : nullPaths(item, `${path}/${key}`));
    }
    return [];
}

async function mockAccountsApi(page, posts) {
    await page.route('**/auth/me', (route) => route.fulfill({ json: USER }));
    await page.route('**/me/settings', (route) => route.fulfill(
        { json: route.request().method() === 'GET' ? { settings: null, updated_at: null } : { settings: {}, updated_at: null } }));
    await page.route('**/me/settings/sections/*', (route) => route.fulfill(
        { json: { section: { values: route.request().postDataJSON().values, updatedAt: '2026-11-02T10:00:00+00:00' } } }));
    await page.route('**/designs', (route) => {
        // '/designs' is also the SPA page route: only intercept the API calls.
        if (route.request().resourceType() === 'document') return route.fallback();
        if (route.request().method() === 'GET') return route.fulfill({ json: { designs: [] } });
        const body = route.request().postDataJSON();
        posts.push(body);
        return route.fulfill({ json: {
            id: 'created-1', name: body.name, version: 1, revisions: 1, schema_valid: true,
            created_at: '2026-11-02T10:00:00+00:00', updated_at: '2026-11-02T10:00:00+00:00', schema_errors: [],
        } });
    });
}

test.describe('account save sends a schema-valid MAS', () => {
    test.beforeEach(() => test.setTimeout(300_000));

    test('a wizard design saved to the account has no nulls and valid inputs', async ({ page }) => {
        const posts = [];
        await mockAccountsApi(page, posts);
        await page.addInitScript(() => localStorage.setItem('om_has_session', '1'));

        await openWizard(page, 'Flyback-link');
        await runAnalytical(page);
        await clickDesignMagnetic(page);

        // The premise: the working design really holds the engine's nulls (otherwise this test
        // would pass without the fix).
        const storeNulls = await withPinia(page, (pinia) => {
            const found = [];
            const walk = (v, p) => {
                if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}/${i}`));
                else if (v && typeof v === 'object') {
                    for (const [k, x] of Object.entries(v)) x === null ? found.push(`${p}/${k}`) : walk(x, `${p}/${k}`);
                }
            };
            walk(JSON.parse(JSON.stringify(pinia._s.get('mas').mas.inputs)), '/inputs');
            return found;
        });
        expect(storeNulls.length).toBeGreaterThan(0);

        await page.goto(`${BASE_URL}/designs?save=1`, { waitUntil: 'domcontentloaded' });
        const nameInput = page.locator('[data-cy="MyDesigns-save-name-input"]');
        await expect(nameInput).toBeVisible({ timeout: 15000 });
        await nameInput.fill('Flyback 2222');
        await page.click('[data-cy="MyDesigns-save-confirm-button"]');
        await expect.poll(() => posts.length, { timeout: 15000 }).toBe(1);

        const saved = posts[0].mas;
        expect(nullPaths(saved)).toEqual([]);
        const validate = inputsValidator();
        const valid = validate(saved.inputs);
        expect(valid ? [] : validate.errors.map((e) => `${e.instancePath} ${e.message}`)).toEqual([]);
    });
});
