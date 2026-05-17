/**
 * PDF Datasheet Export Tests
 *
 * Exercises the "Download PDF report" button in MagneticSpecificationsSummary.
 *
 * Reach path: import a complete MAS JSON via Header, navigate to the
 * magnetic tool, then jump directly to the magneticSpecificationsSummary
 * subsection via the Pinia state store. The natural storyline traversal
 * requires the Python backend (core/wire advise + validation), which is
 * not assumed to be available — the direct-injection shortcut keeps this
 * test suite independent of localhost:8000.
 *
 * The PDF export itself POSTs to VITE_API_ENDPOINT/process_latex. If the
 * backend is offline, the download never fires but the button's
 * post-click `disabled` flip still happens (immediate client-side effect).
 * PDF3 captures a real download when the backend is up.
 */

import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL, screenshot, pause } from './utils.js';

const MAS_FIXTURE = '/home/alf/OpenMagnetics/WebFrontend/04_forward_xfmr_e3216_n87.json';
const PDF_BTN = '[data-cy$="-download-PDF-File-button"]';

const ss = (page, name) => screenshot(page, 'pdf-export', name);

async function goToRoute(page, routePath, { timeout = 45000 } = {}) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(
    () => !window.location.pathname.includes('engine_loader'),
    null,
    { timeout },
  );
  await pause(page, 800, 'mechanical: settle');
}

/**
 * Reach the MagneticSpecificationsSummary component with a hydrated MAS.
 * Returns true if the PDF button is visible afterwards.
 */
async function reachPdfButton(page) {
  if (!fs.existsSync(MAS_FIXTURE)) {
    throw new Error(`MAS fixture missing: ${MAS_FIXTURE}`);
  }
  await goToRoute(page, '/');
  await page.locator('[data-cy="Header-Load-MAS-file-button"]').setInputFiles(MAS_FIXTURE);
  await page.waitForURL('**/magnetic_tool**', { timeout: 30000 });
  await pause(page, 3500, 'mechanical: settle');
  if (!page.url().includes('magnetic_tool')) {
    throw new Error(`magnetic_tool route not reached after MAS load; url=${page.url()}`);
  }

  // Jump directly to the summary subsection — bypasses storyline validation
  // which would otherwise require a working backend for advise/canContinue.
  await page.evaluate(() => {
    const ss = document.querySelector('#app').__vue_app__
      .config.globalProperties.$stateStore;
    ss.setCurrentToolSubsection('magneticSpecificationsSummary');
  });
  await pause(page, 1500, 'mechanical: settle');

  await expect(page.locator(PDF_BTN), 'PDF button must be visible after summary subsection load').toBeVisible({ timeout: 5000 });
}

test.describe('PDF export — datasheet', () => {
  test.describe.configure({ timeout: 120000 });

  test('PDF1: Download PDF button renders on the Specifications Summary', async ({ page }) => {
    await reachPdfButton(page);
    const btn = page.locator(PDF_BTN);
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
    await ss(page, 'PDF1-button-ready');
  });

  test('PDF2: clicking the button flips disabled state (client-side)', async ({ page }) => {
    await reachPdfButton(page);
    const btn = page.locator(PDF_BTN);
    await expect(btn).toBeEnabled({ timeout: 5000 });

    // exportPDF() sets `pdfExported = true` before awaiting the axios POST,
    // so the button flips to disabled synchronously on click regardless of
    // backend status.
    await btn.click();
    await expect(btn).toBeDisabled({ timeout: 2000 });
    await ss(page, 'PDF2-click-disabled');
  });

  // PDF3 removed: required a live /process_latex backend. The mocked variant
  // belongs in a dedicated mocked-backend test (see _coverage.js mock).
});
