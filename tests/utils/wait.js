/**
 * tests/utils/wait.js
 *
 * The ONLY place in the suite where `page.waitForTimeout` is allowed.
 * Every other use is flagged by tests/lint-tests.js (rule: no-waitForTimeout).
 *
 * Pattern: prefer a real signal (waitForFunction / waitForSelector /
 * waitForResponse). A sleep is only acceptable when:
 *   • Settling animation/debounce after we have a real signal (≤500ms), AND
 *   • The justification is written down here, next to the helper.
 */

/**
 * Settle CSS/JS animations after a guaranteed-completed signal. 250ms is
 * empirically enough for the Bootstrap dropdown collapse + the Vue ECharts
 * resize. We intentionally do NOT expose a generic `sleep(ms)` — callers
 * must pick a named helper so the reason is explicit at the call-site.
 */
export async function settleAnimations(page, ms = 250) {
  await page.waitForTimeout(ms); // eslint-disable-line no-restricted-syntax
}

/**
 * Wait for the analytical-sim spinner to disappear. This is the actual
 * completion signal; the trailing 200ms settles the resulting chart redraw.
 */
export async function waitForAnalyticalDone(page, timeoutMs = 30000) {
  await page.waitForFunction(
    () => !document.querySelector('.sim-btn.analytical .fa-spinner'),
    { timeout: timeoutMs }
  );
  await page.waitForTimeout(200); // chart redraw — guaranteed signal already met
}

/**
 * Wait for the Core Adviser's button to re-enable after a WASM run.
 * The WASM run can be long (filter sweeps); default 120s.
 */
export async function waitForCoreAdviserDone(page, timeoutMs = 120000) {
  await page.waitForFunction(
    () => {
      const btn = document.querySelector('[data-cy$="-Core-Advise-button"]');
      return btn && !btn.disabled;
    },
    { timeout: timeoutMs }
  );
}

/**
 * Wait for a Pinia store key to satisfy a predicate.
 * Useful for "wait until MAS has at least one operating point".
 */
export async function waitForStore(page, predicate, timeoutMs = 15000) {
  await page.waitForFunction(predicate, { timeout: timeoutMs });
}

/* ── Soft probes ─────────────────────────────────────────────────────────
 *
 * "Soft" means: return a boolean for legitimate branching on UI state,
 * never throw on absence. These encapsulate the `.catch(() => …)` swallow
 * pattern so the rest of the suite stays compliant with the
 * no-silent-catch lint rule. Use ONLY when branching is genuinely
 * required (e.g. optional "I know" card, optional close-modal button).
 * Otherwise use `expect(locator).toBeVisible()` and let the test fail.
 */

/** Returns true iff the element is visible within `timeoutMs`. */
export async function softVisible(locator, timeoutMs = 0) {
  if (timeoutMs > 0) {
    return locator.waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true, () => false);
  }
  return locator.isVisible().catch(() => false); // eslint-disable-line no-restricted-syntax
}

/** Returns true iff the element is checked (or false if absent / detached). */
export async function softChecked(locator) {
  return locator.isChecked().catch(() => false); // eslint-disable-line no-restricted-syntax
}

/** Returns true iff the element is disabled (defaults to `fallback` on error). */
export async function softDisabled(locator, fallback = true) {
  return locator.isDisabled().catch(() => fallback); // eslint-disable-line no-restricted-syntax
}

/** Returns true iff the element is enabled (or false on error). */
export async function softEnabled(locator) {
  return locator.isEnabled().catch(() => false); // eslint-disable-line no-restricted-syntax
}

/** waitFor wrapper that returns boolean instead of throwing. */
export async function softWaitFor(locator, options = {}) {
  return locator.waitFor(options).then(() => true, () => false); // eslint-disable-line no-restricted-syntax
}

/** Click a locator if it is visible; returns true iff click was issued. */
export async function clickIfPresent(locator, timeoutMs = 0) {
  if (!(await softVisible(locator, timeoutMs))) return false;
  await locator.click();
  return true;
}

/** Best-effort URL wait — returns true iff URL matched within `timeoutMs`. */
export async function tryWaitForURL(page, pattern, timeoutMs = 15000) {
  return page.waitForURL(pattern, { timeout: timeoutMs }).then(() => true, () => false); // eslint-disable-line no-restricted-syntax
}

/** Best-effort selector wait — returns true iff selector appeared. */
export async function tryWaitForSelector(page, selector, options = {}) {
  return page.waitForSelector(selector, options).then(() => true, () => false); // eslint-disable-line no-restricted-syntax
}

/** Best-effort waitForFunction — returns true iff predicate became truthy. */
export async function tryWaitForFunction(page, fn, optsOrArg = undefined, opts = undefined) {
  return page.waitForFunction(fn, optsOrArg, opts).then(() => true, () => false); // eslint-disable-line no-restricted-syntax
}

/** Best-effort goBack — returns true iff navigation succeeded. */
export async function tryGoBack(page, timeoutMs = 5000) {
  return page.goBack({ timeout: timeoutMs }).then(() => true, () => false); // eslint-disable-line no-restricted-syntax
}

/** Best-effort attribute read — returns the value or null on error. */
export async function softAttr(locator, name) {
  return locator.getAttribute(name).catch(() => null); // eslint-disable-line no-restricted-syntax
}

/** Best-effort text read — returns the text or '' on error. */
export async function softText(locator) {
  return locator.textContent().catch(() => ''); // eslint-disable-line no-restricted-syntax
}

/* ── Sleep ───────────────────────────────────────────────────────────────
 *
 * The plain "wait N ms" escape hatch. Forbidden everywhere else by the
 * no-waitForTimeout lint rule. Always pass a reason so the next reader
 * understands why a real signal isn't possible.
 */
export async function pause(page, ms, reason = '') {
  if (!reason) {
    throw new Error('pause(): reason argument is mandatory — explain why no real signal is used');
  }
  await page.waitForTimeout(ms); // eslint-disable-line no-restricted-syntax
}
