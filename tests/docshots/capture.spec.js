/**
 * tests/docshots/capture.spec.js — user-guide screenshot capture (ABT #141).
 *
 * NOT part of the test suite: runs only via `playwright.docs.config.js`
 * (`npx playwright test --config playwright.docs.config.js`). Interprets the
 * declarative shotlist in ../../../docs/pipeline/shots/shotlist.mjs and writes
 * annotated PNGs + callout sidecar JSON to docs/pipeline/images/.
 *
 * Headless only, like everything else (see CLAUDE.md).
 */
// _coverage.js (not @playwright/test): brings the shared route fixtures —
// real NDJSON catalog data served from MKF/MAS checkouts, /process_latex and
// telemetry mocks — so shots don't need the Python backend running.
import { test, expect } from '../_coverage.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BASE_URL } from '../utils/env.js';
import { settleAnimations } from '../utils/wait.js';
import {
  openWizard,
  runAnalytical,
  goToMagneticAdviser,
  goToMagneticBuilder,
} from '../utils/nav.js';
import {
  runMagneticAdviser,
  runCoreAdviser,
  selectAdvisedResult,
  openExportsModal,
} from '../utils/steps.js';

import { SHOTS } from '../../../docs/pipeline/shots/shotlist.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = resolve(HERE, '../../../docs/pipeline/images');
mkdirSync(IMAGES_DIR, { recursive: true });

/** Named flows a shot can invoke. Signature: (page, ...args). */
const FLOWS = {
  openWizard,
  runAnalytical,
  goToMagneticAdviser,
  goToMagneticBuilder,
  runMagneticAdviser: (page) => runMagneticAdviser(page),
  runCoreAdviser: (page) => runCoreAdviser(page),
  selectAdvisedResult: (page, index) => selectAdvisedResult(page, index),
  openExportsModal: (page, kind) => openExportsModal(page, kind),
};

async function runStep(page, step) {
  if (step.flow) {
    const fn = FLOWS[step.flow];
    if (!fn) throw new Error(`docshots: unknown flow '${step.flow}'`);
    return fn(page, ...(step.args ?? []));
  }
  if (step.click) return page.locator(step.click).first().click();
  if (step.fill) return page.locator(step.fill.sel).first().fill(String(step.fill.value));
  if (step.waitVisible) {
    return page.locator(step.waitVisible).first()
      .waitFor({ state: 'visible', timeout: step.timeout ?? 30_000 });
  }
  if (step.waitHidden) {
    return page.locator(step.waitHidden).first()
      .waitFor({ state: 'hidden', timeout: step.timeout ?? 30_000 });
  }
  if (step.scrollIntoView) return page.locator(step.scrollIntoView).first().scrollIntoViewIfNeeded();
  if (step.settle) return settleAnimations(page, step.settle);
  throw new Error(`docshots: unrecognized step ${JSON.stringify(step)}`);
}

/**
 * Inject numbered callout badges (orange ring + circled number) at each
 * callout target. Returns bounding boxes for the sidecar JSON. Runs in-page,
 * so the annotation is part of the screenshot — no image post-processing.
 */
async function injectCallouts(page, callouts) {
  return page.evaluate((cs) => {
    document.querySelectorAll('.om-doc-callout').forEach((e) => e.remove());
    const boxes = [];
    cs.forEach((c, i) => {
      let el = null;
      if (c.sel) {
        el = document.querySelector(c.sel);
      } else if (c.text) {
        // First element of the given tag whose trimmed text equals c.text
        // (for buttons/labels without a data-cy).
        el = Array.from(document.querySelectorAll(c.tag ?? 'button'))
          .find((e) => e.textContent.trim() === c.text) ?? null;
      }
      if (!el) {
        boxes.push({ index: i + 1, sel: c.sel ?? `${c.tag ?? 'button'}="${c.text}"`, found: false });
        return;
      }
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      const ring = document.createElement('div');
      ring.className = 'om-doc-callout';
      Object.assign(ring.style, {
        position: 'fixed',
        left: `${r.left - 4}px`,
        top: `${r.top - 4}px`,
        width: `${r.width + 8}px`,
        height: `${r.height + 8}px`,
        border: '3px solid #ff7a1a',
        borderRadius: '8px',
        zIndex: 2147483646,
        pointerEvents: 'none',
        boxSizing: 'border-box',
      });
      document.body.appendChild(ring);
      const badge = document.createElement('div');
      badge.className = 'om-doc-callout';
      badge.textContent = String(i + 1);
      Object.assign(badge.style, {
        position: 'fixed',
        left: `${Math.max(0, r.left - 14)}px`,
        top: `${Math.max(0, r.top - 14)}px`,
        width: '28px',
        height: '28px',
        background: '#ff7a1a',
        color: '#fff',
        font: 'bold 16px/28px sans-serif',
        textAlign: 'center',
        borderRadius: '50%',
        zIndex: 2147483647,
        pointerEvents: 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,.6)',
      });
      document.body.appendChild(badge);
      boxes.push({
        index: i + 1,
        sel: c.sel ?? `${c.tag ?? 'button'}="${c.text}"`,
        note: c.note ?? null,
        found: true,
        box: { x: r.x, y: r.y, w: r.width, h: r.height },
      });
    });
    return boxes;
  }, callouts);
}

for (const shot of SHOTS) {
  test(`docshot: ${shot.id}`, async ({ page }) => {
    test.setTimeout(shot.timeout ?? 300_000); // deep flows (adviser, builder) are WASM-heavy

    if (shot.route) {
      await page.goto(`${BASE_URL}${shot.route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      // Data routes bounce through /engine_loader while WASM warms up; wait
      // until we are back on the requested route.
      await page.waitForURL(`**${shot.route}`, { timeout: 180_000 });
    }
    for (const step of shot.steps ?? []) {
      await runStep(page, step);
    }

    // Park the mouse in the top-left corner so no hover tooltip/highlight
    // from the last flow step contaminates the screenshot.
    await page.mouse.move(0, 0);
    await settleAnimations(page, 300);

    let boxes = [];
    if (shot.callouts?.length) {
      boxes = await injectCallouts(page, shot.callouts);
      const missing = boxes.filter((b) => !b.found);
      // A missing callout target means the shotlist is stale — fail loudly.
      expect(missing, `callout targets not found: ${missing.map((b) => b.sel).join(', ')}`).toEqual([]);
    }

    await page.screenshot({
      path: join(IMAGES_DIR, `${shot.id}.png`),
      fullPage: Boolean(shot.fullPage),
      ...(shot.clip ? { clip: shot.clip } : {}),
    });

    writeFileSync(
      join(IMAGES_DIR, `${shot.id}.callouts.json`),
      JSON.stringify(
        { id: shot.id, chapter: shot.chapter, title: shot.title, caption: shot.caption, callouts: boxes },
        null,
        2,
      ),
    );
  });
}
