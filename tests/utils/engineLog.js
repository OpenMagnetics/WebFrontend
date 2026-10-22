/**
 * tests/utils/engineLog.js
 *
 * The builder's and the visualizers' warnings and errors (a calculation that failed, MKF's
 * simulation findings, what a load corrected) are records in the Engine log, not text over or
 * inside the cards (WebSharedComponents/assets/js/notices.js, Alf 2026-10-22).
 */

/**
 * The Engine log's records, optionally only those of one source ('Builder', 'Simulation findings',
 * 'Load', 'Core', 'Magnetic drawing', ...) and/or level ('WARNING', 'ERROR').
 * @returns {Promise<Array<{level: string, module: string, message: string, count: number}>>}
 */
export async function engineLogRecords(page, { source = null, level = null } = {}) {
  return page.evaluate(({ source, level }) => {
    const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
    const store = pinia?._s?.get('engineDiagnostics');
    if (store == null) throw new Error('engineDiagnostics store is not created');
    return store.records
      .filter((r) => (source == null || r.module === source) && (level == null || r.level === level))
      .map((r) => ({ level: r.level, module: r.module, message: r.message, count: r.count }));
  }, { source, level });
}

/** The messages of engineLogRecords, for `expect.poll(...)`. */
export async function engineLogMessages(page, filter = {}) {
  return (await engineLogRecords(page, filter)).map((r) => r.message);
}
