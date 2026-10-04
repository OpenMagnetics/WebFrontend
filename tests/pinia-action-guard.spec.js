/**
 * ABT #1683: Pinia runs $onAction subscribers inline with the action, so a
 * subscriber (or its after()/onError() callback) that throws used to fail the
 * observed action for every caller. The piniaActionGuard plugin keeps the
 * failure the subscriber's own: reported with console.error, action intact.
 */

import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

async function openApp(page) {
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia._s.get('taskQueue') != null, null, { timeout: 20000 });
  return consoleErrors;
}

test('PINIAGUARD-1: a throwing subscriber and a throwing after() leave an async action\'s result intact and are reported', async ({ page }) => {
  const consoleErrors = await openApp(page);
  const outcome = await page.evaluate(async () => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const taskQueue = pinia._s.get('taskQueue');
    const unsubscribers = [
      taskQueue.$onAction(({ name }) => {
        if (name === 'getSettings') throw new Error('subscriber read transient state');
      }),
      taskQueue.$onAction(({ name, after }) => {
        if (name === 'getSettings') after(() => { throw new Error('after callback read transient state'); });
      }),
    ];
    try {
      const settings = await taskQueue.getSettings();
      return { resolved: true, hasSettings: settings != null && typeof settings === 'object' };
    }
    catch (error) {
      return { resolved: false, error: String(error) };
    }
    finally {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    }
  });
  expect(outcome).toEqual({ resolved: true, hasSettings: true });
  expect(consoleErrors.some((text) => text.includes('[taskQueue] $onAction subscriber for "getSettings" threw'))).toBe(true);
  expect(consoleErrors.some((text) => text.includes('[taskQueue] $onAction after() callback for "getSettings" threw'))).toBe(true);
});

test('PINIAGUARD-2: an onError() callback that throws does not replace the action\'s own error', async ({ page }) => {
  const consoleErrors = await openApp(page);
  const outcome = await page.evaluate(async () => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const taskQueue = pinia._s.get('taskQueue');
    const unsubscribe = taskQueue.$onAction(({ name, onError }) => {
      if (name === 'updateSettings') onError(() => { throw new Error('onError callback failed'); });
    });
    try {
      await taskQueue.updateSettings(() => { throw new Error('the action\'s own error'); });
      return { rejected: false };
    }
    catch (error) {
      return { rejected: true, error: String(error) };
    }
    finally {
      unsubscribe();
    }
  });
  expect(outcome.rejected).toBe(true);
  expect(outcome.error).toContain('the action\'s own error');
  expect(outcome.error).not.toContain('onError callback failed');
  expect(consoleErrors.some((text) => text.includes('[taskQueue] $onAction onError() callback for "updateSettings" threw'))).toBe(true);
});
