/**
 * ABT #2302 (Alf, 2026-11-07): one problem, one line in the Engine log. MKF warns that a winding layout
 * kept as stated does not fit its window (ABT #1496: every MKF user is told). In the web the Simulation
 * findings say the same thing per winding ("N turns outside its winding window"), so the Winding layout
 * record is not shown next to them, whichever of the two arrives first. Without such a finding it stays.
 */
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils/env.js';
import { engineLogRecords } from './utils/index.js';

const LAYOUT = "The stated winding layout is kept as stated, but it does not fit its window: turn 'Primary parallel 0 turn 0' at (3.443, -3.989) mm lies outside every winding window";
const FINDING = "Winding 'Primary' has 10 turns outside its winding window; the worst, turn 1 of winding 'Primary', reaches 4.39 mm radially inward, past the inner side of the window.";

// What a drain of MKF's collector adds (engineDiagnostics.drain), without needing a design that does it.
const engineRecord = (page, message) => page.evaluate((text) => {
  const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('engineDiagnostics');
  store.records.push({ id: store.nextRecordId++, timestamp: new Date().toISOString(), level: 'WARNING', module: 'Winding layout',
    message: text, code: null, detail: null, latestDetail: '', count: 1, fromEngine: true });
  store.dropLayoutWarningsTheFindingsRepeat();
}, message);
const finding = (page, message) => page.evaluate((text) => {
  document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('engineDiagnostics').addRecord('WARNING', 'Simulation findings', text);
}, message);
const layoutRecords = async (page) => (await engineLogRecords(page, { source: 'Winding layout' })).map((r) => r.message);

test.beforeEach(async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('engineDiagnostics') != null
    || document.querySelector('#app')?.__vue_app__ != null);
  await page.evaluate(async () => {
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const { useEngineDiagnosticsStore } = await import('/src/stores/engineDiagnostics.js');
    useEngineDiagnosticsStore(pinia).records = [];
  });
});

test('ENGINE-LOG-LAYOUT-1: the layout warning goes once the finding says it, in either order', async ({ page }) => {
  await engineRecord(page, LAYOUT);
  expect(await layoutRecords(page), 'alone, the layout warning is shown').toEqual([LAYOUT]);
  await finding(page, FINDING);
  expect(await layoutRecords(page), 'the finding came after it: the layout warning goes').toEqual([]);
  await engineRecord(page, LAYOUT);
  expect(await layoutRecords(page), 'the finding came first: the layout warning is not added').toEqual([]);
  expect((await engineLogRecords(page, { source: 'Simulation findings' })).map((r) => r.message)).toEqual([FINDING]);
});
