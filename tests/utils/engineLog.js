/**
 * tests/utils/engineLog.js
 *
 * The builder's and the visualizers' warnings and errors (a calculation that failed, MKF's
 * simulation findings, what a load corrected) are records in the Engine log, not text over or
 * inside the cards (WebSharedComponents/assets/js/notices.js, Alf 2026-10-22).
 */

/**
 * The sources of the builder's own calculations (not its charts, MKF's findings, what a load
 * corrected or why a step cannot continue): Coil info and Core info, and the part each other
 * builder calculation belongs to (MagneticBuilder.vue BUILDER_ACTION_SOURCES; 'Builder' for one
 * without a name there). Until 2026-10-28 all of these but Coil info and Core info were 'Builder'.
 */
export const BUILDER_SOURCES = ['Coil info', 'Core info', 'Winding', 'Core', 'Core adviser', 'Wire adviser', 'Wire',
  'Bobbin', 'Design completion', 'Inductance matrix', 'Leakage inductance', 'Coupling coefficients',
  'Resistance matrix', 'Stray capacitance', 'Engine settings', 'Builder'];

/**
 * The Engine log's records, optionally only those of one source ('Coil info', 'Simulation findings',
 * 'Load', 'Core', 'Magnetic drawing', ...) or of any of a list of them (BUILDER_SOURCES), and/or
 * level ('WARNING', 'ERROR'). One failure seen by several parts is one record naming them all
 * ('Coil info, Core info'): it is of each of those sources. A record's engine error code and its
 * detail (the full technical text, the panel's tooltip) are given when it has them, and, for a record
 * from MKF's log, latestDetail: what varies between the message's repeats, as of the latest one
 * ("asked at 1 MHz, above that span"; "" when the record has none).
 * @returns {Promise<Array<{level: string, module: string, message: string, count: number, code?: string, detail?: string, latestDetail?: string}>>}
 */
export async function engineLogRecords(page, { source = null, level = null } = {}) {
  return page.evaluate(({ source, level }) => {
    const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
    const store = pinia?._s?.get('engineDiagnostics');
    if (store == null) throw new Error('engineDiagnostics store is not created');
    const wanted = source == null ? null : [].concat(source);
    return store.records
      .filter((r) => (wanted == null || (r.sources ?? [r.module]).some((s) => wanted.includes(s))) && (level == null || r.level === level))
      .map((r) => ({
        level: r.level, module: r.module, message: r.message, count: r.count,
        ...(r.code != null ? { code: r.code } : {}),
        ...(r.detail != null ? { detail: r.detail } : {}),
        ...(r.latestDetail != null ? { latestDetail: r.latestDetail } : {}),
      }));
  }, { source, level });
}

/** The messages of engineLogRecords, for `expect.poll(...)`. */
export async function engineLogMessages(page, filter = {}) {
  return (await engineLogRecords(page, filter)).map((r) => r.message);
}
