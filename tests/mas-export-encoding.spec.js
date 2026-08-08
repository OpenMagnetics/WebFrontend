/**
 * Regression coverage for ABT #603: the vendored download() helper in
 * WebSharedComponents/assets/js/utils.js had a branch that caught any
 * character in U+0080-U+00FF and rebuilt the payload with
 * `tempUiArr[i] = payload.charCodeAt(i)` — truncating each UTF-16 code unit
 * to one byte, i.e. writing Latin-1 instead of UTF-8. Every exported MAS
 * containing a planar wire ("Planar 173.99 µm", U+00B5) came out with a bare
 * 0xB5 instead of UTF-8's 0xC2 0xB5, so the file was not valid UTF-8 and
 * strict JSON parsers (Python's json.load, etc.) rejected it outright.
 *
 * The fix deleted the branch: the very next statement,
 * `new myBlob([payload], {type: mimeType})`, already encodes JS strings as
 * UTF-8 on its own — the special-casing was not only wrong, it was undoing
 * correct behaviour.
 *
 * This drives the REAL export path (ControlPanel.vue's exportMASFile(),
 * which calls download() exactly the way production does) rather than unit
 * testing download() in isolation, since download() touches document/Blob
 * APIs that only behave identically to production inside a real browser.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL, pause } from './utils.js';

const MAS_FIXTURE = new URL('./fixtures/04_forward_xfmr_e3216_n87.json', import.meta.url).pathname;
// The micro sign, U+00B5 — the exact character the reported files broke on
// ("Planar 34.80 µm" etc). Any char in U+0080-U+00FF reproduces the bug;
// this is the one actually seen in the wild.
const INJECTED_NAME = 'ABT#603 test µ design';

test.describe('MAS export — UTF-8 encoding', () => {
  test.describe.configure({ timeout: 90000 });

  test('exported MAS JSON is valid UTF-8 and round-trips non-ASCII characters', async ({ page }) => {
    if (!fs.existsSync(MAS_FIXTURE)) {
      throw new Error(`MAS fixture missing: ${MAS_FIXTURE}`);
    }

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(MAS_FIXTURE);
    await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
    await pause(page, 3000, 'mechanical: settle');

    // Inject a non-ASCII, Latin-1-range character into the loaded design —
    // this is what the exported JSON must carry through as UTF-8.
    await page.evaluate((injectedName) => {
      const masStore = document.querySelector('#app').__vue_app__
        .config.globalProperties.$pinia.state.value.mas;
      masStore.mas.inputs.designRequirements.name = injectedName;
    }, INJECTED_NAME);

    const exportButton = page.locator('button[title="Export MAS"]');
    await expect(exportButton).toBeVisible({ timeout: 20000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      exportButton.click(),
    ]);

    const downloadPath = await download.path();
    expect(downloadPath, 'download must have saved to disk').toBeTruthy();
    const raw = fs.readFileSync(downloadPath);

    // The core assertion: strict UTF-8 decode must not throw. Node's
    // TextDecoder in fatal mode rejects any byte sequence that isn't valid
    // UTF-8 — a bare 0xB5 (the pre-fix bug) fails this exactly the way
    // Python's json.load(strict) did on the user's reported files.
    let decoded;
    expect(() => {
      decoded = new TextDecoder('utf-8', { fatal: true }).decode(raw);
    }, 'exported file must be valid UTF-8 (ABT #603 regression)').not.toThrow();

    // Round-trip: the injected character must survive, not just "not throw".
    expect(decoded).toContain(INJECTED_NAME);
    const parsed = JSON.parse(decoded);
    expect(parsed.inputs.designRequirements.name).toBe(INJECTED_NAME);
  });
});
