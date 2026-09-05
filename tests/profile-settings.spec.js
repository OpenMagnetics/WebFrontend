/**
 * ABT #1099 — settings roam with the account profile, merged per section.
 *
 * Against a fully mocked accounts API (no backend touched), the frontend must:
 *   - stay silent while anonymous (no /me/settings traffic),
 *   - at login with an EMPTY profile, seed it from the local settings (one
 *     PATCH per registered section),
 *   - at login with a profile whose section is NEWER than this device's edit,
 *     apply the profile's values to the store,
 *   - push a later edit to its own section only, 2 s after the last change,
 *   - on a 409 (another device was newer), apply the server's section.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { pause } from './utils.js';

const USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'engineer@example.com',
  display_name: 'engineer',
  email_verified: true,
  created_at: '2026-07-12T00:00:00+00:00',
};

async function mockAccountsApi(page, state) {
  await page.route('**/auth/me', (route) => state.loggedIn
    ? route.fulfill({ json: USER })
    : route.fulfill({ status: 401, json: { detail: 'Not authenticated' } }));
  await page.route('**/auth/check_email', (route) => route.fulfill({ json: { exists: true } }));
  await page.route('**/auth/login', (route) => { state.loggedIn = true; return route.fulfill({ json: USER }); });
  await page.route('**/auth/logout', (route) => { state.loggedIn = false; return route.fulfill({ json: { ok: true } }); });
  await page.route('**/me/settings', (route) => {
    state.calls.push({ method: route.request().method(), url: route.request().url() });
    return route.fulfill({ json: { settings: state.document, updated_at: null } });
  });
  await page.route('**/me/settings/sections/*', (route) => {
    const name = route.request().url().split('/').pop();
    const body = route.request().postDataJSON();
    state.calls.push({ method: 'PATCH', section: name, body });
    const stored = state.document?.sections?.[name];
    if (stored && stored.updatedAt > body.updatedAt) {
      return route.fulfill({ status: 409, json: { detail: { section: stored } } });
    }
    state.document = state.document ?? { version: 2, sections: {} };
    state.document.sections[name] = { values: body.values, updatedAt: body.updatedAt };
    return route.fulfill({ json: { section: state.document.sections[name], updated_at: body.updatedAt } });
  });
}

async function storeValue(page, storeId, path) {
  return page.evaluate(([id, p]) => {
    const app = document.querySelector('#app').__vue_app__;
    const store = app.config.globalProperties.$pinia._s.get(id);
    return p.split('.').reduce((o, k) => o?.[k], store);
  }, [storeId, path]);
}

async function setStoreValue(page, storeId, path, value) {
  return page.evaluate(([id, p, v]) => {
    const app = document.querySelector('#app').__vue_app__;
    const store = app.config.globalProperties.$pinia._s.get(id);
    const keys = p.split('.');
    const target = keys.slice(0, -1).reduce((o, k) => o[k], store);
    target[keys[keys.length - 1]] = v;
  }, [storeId, path, value]);
}

async function login(page) {
  await page.click('[data-cy="Header-sign-in-button"]');
  await page.fill('[data-cy="AccountModal-email-input"]', USER.email);
  await page.click('[data-cy="AccountModal-continue-button"]');
  const submit = page.locator('[data-cy="AccountModal-submit-button"]');
  await expect(submit).toHaveText(/Log in/, { timeout: 10000 });
  await page.fill('[data-cy="AccountModal-password-input"]', 'a-strong-password');
  await submit.click();
  await expect(page.locator('[data-cy="Header-account-menu-button"]')).toBeVisible({ timeout: 15000 });
}

test.describe('Profile settings sync (ABT #1099)', () => {
  test.describe.configure({ timeout: 120000 });

  test('anonymous: no settings traffic; first login seeds the profile from local settings', async ({ page }) => {
    const state = { loggedIn: false, document: null, calls: [] };
    await mockAccountsApi(page, state);
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');

    // A local edit while anonymous is stamped, never pushed.
    await setStoreValue(page, 'settings', 'adviserSettings.maximumTemperature', 111);
    await pause(page, 2500, 'debounce window');
    expect(state.calls.filter(c => c.method !== 'GET'), 'no push while anonymous').toHaveLength(0);

    await login(page);
    await pause(page, 2500, 'pull + seed pushes');
    const gets = state.calls.filter(c => c.method === 'GET');
    expect(gets.length, 'the profile is pulled once at login').toBe(1);
    const patched = state.calls.filter(c => c.method === 'PATCH').map(c => c.section).sort();
    expect(patched, 'every section is seeded into the empty profile').toEqual(['magneticBuilder', 'models', 'settings', 'simulationModels']);
    expect(state.document.sections.settings.values.adviserSettings.maximumTemperature, 'the local edit reached the profile').toBe(111);
    expect(state.document.sections.settings.values.userPreferences, 'preferences roam').toEqual({ unitSystem: 'si', preferredCoreManufacturer: null });
    expect(Object.keys(state.document.sections.settings.values), 'only whitelisted keys roam').not.toContain('loadingGif');
  });

  test('login with a newer profile applies it; a later edit pushes only its section; 409 applies the server copy', async ({ page }) => {
    // Older than any edit made during the test, newer than nothing on a fresh device.
    const profileStamp = '2026-01-01T00:00:00.000Z';
    const state = {
      loggedIn: false,
      calls: [],
      document: { version: 2, sections: {
        settings: { values: { adviserSettings: { useOnlyCoresInStock: true, allowDistributedGaps: false, allowStacks: true, allowToroidalCores: true, coreAdviseMode: 'standard cores', enableTemperatureFilter: true, maximumTemperature: 77 } }, updatedAt: profileStamp },
        models: { values: { selectedModels: { gapReluctance: 'Zhang', coreLosses: 'Steinmetz', coreTemperature: 'Maniktala' }, simulationUseCurrentAsInput: 1 }, updatedAt: profileStamp },
      } },
    };
    await mockAccountsApi(page, state);
    await page.goto(BASE_URL + '/');
    await page.waitForLoadState('networkidle');
    await login(page);
    await pause(page, 2500, 'pull + apply');

    expect(await storeValue(page, 'settings', 'adviserSettings.maximumTemperature'), 'the newer profile section wins').toBe(77);
    expect(await storeValue(page, 'settings', 'adviserSettings.allowDistributedGaps')).toBe(false);
    expect(await storeValue(page, 'user', 'selectedModels.coreLosses')).toBe('Steinmetz');
    expect(state.calls.filter(c => c.method === 'PATCH' && c.section === 'settings'), 'an applied section is not pushed back').toHaveLength(0);

    // A later local edit: only the edited section is pushed, with the new value.
    state.calls.length = 0;
    await setStoreValue(page, 'settings', 'adviserSettings.maximumTemperature', 88);
    await pause(page, 3000, 'debounce + push');
    const pushes = state.calls.filter(c => c.method === 'PATCH');
    expect(pushes.map(c => c.section), 'only the edited section is pushed').toEqual(['settings']);
    expect(pushes[0].body.values.adviserSettings.maximumTemperature).toBe(88);
    expect(pushes[0].body.updatedAt > profileStamp, 'the push carries the edit time (newer than the applied section)').toBe(true);

    // Another device wins: the server's newer copy is applied locally.
    const farther = '2999-06-01T00:00:00.000Z';
    state.document.sections.models = { values: { selectedModels: { gapReluctance: 'Classic', coreLosses: 'IGSE', coreTemperature: 'Maniktala' }, simulationUseCurrentAsInput: 1 }, updatedAt: farther };
    state.calls.length = 0;
    await setStoreValue(page, 'user', 'selectedModels.coreLosses', 'Roshen');
    await pause(page, 3000, 'debounce + 409 + apply');
    expect(state.calls.filter(c => c.method === 'PATCH').map(c => c.section)).toEqual(['models']);
    expect(await storeValue(page, 'user', 'selectedModels.coreLosses'), 'the server copy replaces the rejected local edit').toBe('IGSE');
    expect(await storeValue(page, 'user', 'selectedModels.gapReluctance')).toBe('Classic');
  });
});
