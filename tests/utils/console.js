/**
 * tests/utils/console.js
 *
 * Console-noise classifier. Lets tests assert "no unexpected console errors"
 * without drowning in known infrastructure noise.
 *
 * Design choice (Phase 8 will revisit):
 *   • This is intentionally a NARROW allowlist of known-noise patterns,
 *     NOT a broad regex blocklist. A pattern is allowed only if:
 *       (a) it originates outside our code (dev server, browser quirks), OR
 *       (b) it's a known WASM stderr line we plan to demote to console.warn
 *           on the MKF side (tracked in OpenMagnetics/MKF issue TBD).
 *
 * If a new pattern shows up, prefer fixing the source over adding it here.
 */

export const KNOWN_NOISE = [
  // Browser / dev-server infrastructure, not our code:
  /ResizeObserver loop/i,
  /favicon/i,
  /vite.*client/i,

  // Backend unreachable in offline / WASM-only tests. Tests that DO require a
  // backend assert success separately, so suppressing the connection-failure
  // noise here is safe.
  /Failed to fetch|net::ERR_CONNECTION_REFUSED/i,
  /ERR_EMPTY_RESPONSE|ERR_CONNECTION_RESET|ERR_SOCKET_NOT_CONNECTED/i,
  /ERR_NAME_NOT_RESOLVED|ERR_ABORTED/i,
  /AxiosError|Network Error|Request failed with status code/i,
  /Failed to load resource/i,

  // ECharts dispose warning on unmount — Vue lifecycle quirk in tests.
  /ECharts.*dispose/i,

  // Known WASM stderr noise. Future cleanup: demote these to console.warn
  // on the C++ side and remove from this allowlist.
  /DEBUG \[[a-z_]+\]:/i,
  /\[DEBUG [a-z_]+\]/i,
  /(Impedance|Saturation|Temperature|Loss|Winding|Fit) filter:/i,
  /multi-output configuration detected/i,
];

/** True iff `text` matches a known-noise pattern (i.e. safe to ignore). */
export function isKnownNoise(text) {
  return KNOWN_NOISE.some((p) => p.test(text));
}

/**
 * Attach a console-error collector to `page`. Returns a function returning
 * the array of NON-noise errors observed since attach.
 *
 *   const getErrors = collectConsoleErrors(page);
 *   ... run test ...
 *   expect(getErrors()).toEqual([]);
 */
export function collectConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (isKnownNoise(text)) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => {
    const text = err?.message || String(err);
    if (isKnownNoise(text)) return;
    errors.push(text);
  });
  return () => errors.slice();
}
