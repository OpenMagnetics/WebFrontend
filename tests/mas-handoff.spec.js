/**
 * tests/mas-handoff.spec.js
 *
 * "Open in OpenMagnetics" from another page (Henry's run page, 2026-11-26): the page opens
 * /?handoff=mas with window.open, waits for {source:'openmagnetics', type:'ready'}, and posts
 * {source:'henry', type:'mas', mas} to the window it opened (src/composables/masHandoff.js).
 *
 * The opener here is an about:blank page of the same browser context: like the Henry page opened from
 * file://, its origin cannot be checked, so the app must trust only window.opener, and only when the
 * URL asks for the handoff.
 */
import fs from 'node:fs';
import { test, expect, installRouteFixtures } from './_coverage.js';
import { BASE_URL } from './utils/env.js';

const fixture = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url).pathname, 'utf8'));
const shapeName = (mas) => {
  const shape = mas.magnetic.core.functionalDescription.shape;
  return typeof shape === 'string' ? shape : shape.name;
};

// The opener page: records every message it gets, and opens the app as the Henry page does.
async function openFromOpener(page, url) {
  await page.goto('about:blank');
  await page.evaluate(() => {
    window.__received = [];
    window.addEventListener('message', (ev) => window.__received.push(ev.data));
  });
  const [popup] = await Promise.all([
    page.context().waitForEvent('page'),
    page.evaluate((u) => { window.__om = window.open(u, '_blank'); }, url),
  ]);
  return popup;
}

const received = (page) => page.evaluate(() => window.__received.filter((m) => m?.source === 'openmagnetics'));
const waitForReceived = (page, type, timeout = 60000) =>
  page.waitForFunction((t) => window.__received.some((m) => m?.source === 'openmagnetics' && m.type === t), type, { timeout });
const postFromOpener = (page, message) => page.evaluate((m) => window.__om.postMessage(m, '*'), message);
const loadedShape = (popup) => popup.evaluate(() => {
  const shape = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas').mas.magnetic.core.functionalDescription.shape;
  return typeof shape === 'string' ? shape : shape.name;
});

test.beforeEach(async ({ context }) => {
  // The app opens in a popup: the shared route fixtures must cover every page of the context.
  await installRouteFixtures(context);
});

test('MASHANDOFF-1: the MAS posted by the opener opens in the builder; one posted by anyone else is ignored', async ({ page }) => {
  test.setTimeout(180000);
  const mas = fixture('04_forward_xfmr_e3216_n87.json');
  const other = fixture('default_two_winding_pq2715.json');
  expect(shapeName(other)).not.toBe(shapeName(mas));

  const popup = await openFromOpener(page, `${BASE_URL}/?handoff=mas`);
  await waitForReceived(page, 'ready');
  await expect(popup.locator('[data-cy="MasHandoff-waiting"]')).toBeVisible();

  // A message from the app's own window (not its opener) carrying a valid design must not be taken.
  await popup.evaluate((m) => window.postMessage({ source: 'henry', type: 'mas', mas: m }, '*'), other);
  await postFromOpener(page, { source: 'henry', type: 'mas', mas });

  await waitForReceived(page, 'mas-loaded', 150000);
  await popup.waitForURL('**/magnetic_tool**', { timeout: 120000 });
  expect(await loadedShape(popup), 'the opener\'s design, not the one posted from elsewhere').toBe(shapeName(mas));
  expect((await received(page)).filter((m) => m.type === 'mas-error')).toEqual([]);
  await expect(popup.locator('[data-cy="MasHandoff-notice"]')).toHaveCount(0);
});

test('MASHANDOFF-2: without ?handoff=mas the app does not announce itself and ignores a posted MAS', async ({ page }) => {
  test.setTimeout(120000);
  const mas = fixture('04_forward_xfmr_e3216_n87.json');
  const popup = await openFromOpener(page, `${BASE_URL}/`);
  await popup.waitForFunction(() => document.querySelector('#app')?.__vue_app__ != null, null, { timeout: 60000 });
  const before = await popup.evaluate(() => JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas')?.mas ?? null));
  // A marker posted after the MAS: once the app's window has dispatched it, it has dispatched the MAS.
  await popup.evaluate(() => {
    window.__markerSeen = false;
    window.addEventListener('message', (ev) => { if (ev.data?.marker === 'after-mas') window.__markerSeen = true; });
  });
  await postFromOpener(page, { source: 'henry', type: 'mas', mas });
  await postFromOpener(page, { marker: 'after-mas' });
  await popup.waitForFunction(() => window.__markerSeen === true);
  await popup.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  expect(await received(page), 'no "ready": the app does not offer itself to its opener').toEqual([]);
  await expect(popup.locator('[data-cy="MasHandoff-notice"]')).toHaveCount(0);
  expect(new URL(popup.url()).pathname).not.toContain('magnetic_tool');
  const after = await popup.evaluate(() => JSON.stringify(document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('mas')?.mas ?? null));
  expect(after, 'the mas store is untouched').toBe(before);
});

test('MASHANDOFF-3: a schema-invalid MAS is refused, visibly in the app and back to the opener', async ({ page }) => {
  test.setTimeout(180000);
  const mas = fixture('04_forward_xfmr_e3216_n87.json');
  mas.magnetic.core.functionalDescription.gapping[0].length = 0;   // the schema wants every gap longer than 0

  const popup = await openFromOpener(page, `${BASE_URL}/?handoff=mas`);
  await waitForReceived(page, 'ready');
  await postFromOpener(page, { source: 'henry', type: 'mas', mas });
  await waitForReceived(page, 'mas-error', 150000);

  const error = popup.locator('[data-cy="MasHandoff-error"]');
  await expect(error).toBeVisible();
  await expect(error).toContainText('Could not open the design from Henry');
  await expect(error).toContainText('it does not follow the MAS format');
  await expect(popup.locator('[data-cy="MasHandoff-notice"]')).toHaveAttribute('role', 'alert');
  const replies = await received(page);
  expect(replies.filter((m) => m.type === 'mas-loaded')).toEqual([]);
  expect(replies.find((m) => m.type === 'mas-error').message).toContain('it does not follow the MAS format');
  expect(new URL(popup.url()).pathname, 'nothing is opened').not.toContain('magnetic_tool');
});

test('MASHANDOFF-4: a message with no MAS document is refused, not replaced by a default design', async ({ page }) => {
  test.setTimeout(120000);
  const popup = await openFromOpener(page, `${BASE_URL}/?handoff=mas`);
  await waitForReceived(page, 'ready');
  await postFromOpener(page, { source: 'henry', type: 'mas' });
  await waitForReceived(page, 'mas-error');
  await expect(popup.locator('[data-cy="MasHandoff-error"]')).toContainText('Henry sent no MAS document');
  expect(new URL(popup.url()).pathname).not.toContain('magnetic_tool');
});
