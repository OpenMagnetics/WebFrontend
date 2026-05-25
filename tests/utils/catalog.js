/**
 * tests/utils/catalog.js
 *
 * The wizard catalog: a single source of truth for everything a generic
 * scenario / battery-template needs to drive any wizard. One entry per wizard.
 *
 * Goal: a new wizard is added to the suite by appending one entry here, not
 * by writing 400 LOC of copy-paste in a new `*-battery.spec.js`.
 *
 *   key            stable lowercase id; the spec file name uses this
 *   title          human-readable name; used in test descriptions
 *   linkCy         data-cy of the nav link that opens the wizard
 *   wizardPrefix   data-cy prefix for inputs (e.g. "BuckWizard")
 *   topology       'dc-dc' | 'isolated' | 'pfc' | 'filter' | 'resonant' | 'dab'
 *   tags           Playwright tags (without @): subset of
 *                  ['smoke','layout','scenario','numerical','heavy','nightly']
 *   capabilities   object of feature flags this wizard supports
 *     adviser        true  → Magnetic Adviser end-to-end works
 *     coreAdviser    true  → Core Adviser button reachable from builder
 *     simulated      true  → Simulated waveform button present (fallback to
 *                            Analytical when false)
 *     iKnowMode      true  → Has DesignLevel radio for "I know the design"
 *     spice          true  → Get SPICE Code button wired through to a WASM
 *                            generator (excludes PFC, Vienna, CurrentTransformer)
 *
 * Keep entries alphabetised by key. Do NOT add per-wizard quirks in spec
 * files — they belong here.
 */

/** @typedef {{
 *   key: string,
 *   title: string,
 *   linkCy: string,
 *   wizardPrefix: string,
 *   topology: 'dc-dc'|'isolated'|'pfc'|'filter'|'resonant'|'dab',
 *   tags: ReadonlyArray<string>,
 *   capabilities: {
 *     adviser: boolean,
 *     coreAdviser: boolean,
 *     simulated: boolean,
 *     iKnowMode: boolean,
 *     spice: boolean,
 *   },
 * }} WizardSpec */

/**
 * Helper to keep wizard rows short. All 24 wizards in the Header dropdown
 * share the same "supports everything by default" capability set; only
 * exceptions need overrides (see PFC.simulated).
 */
const FULL = Object.freeze({
  adviser: true, coreAdviser: true, simulated: true, iKnowMode: true, spice: true,
});

const w = (key, title, linkCy, wizardPrefix, topology, tags = ['scenario'], capOverrides = {}) => ({
  key, title, linkCy, wizardPrefix, topology,
  tags: Object.freeze(tags),
  capabilities: Object.freeze({ ...FULL, ...capOverrides }),
});

/**
 * All wizards from Header.vue (source of truth). Order matches the dropdown
 * grouping (Filters/PFC → Non-isolated → Isolated single-switch → Isolated
 * bridge → Resonant) so failures map intuitively to UI sections.
 *
 * Every wizard is expected to support analytical + simulated + Core Adviser
 * + Magnetic Adviser with its shipped defaults. A wizard that doesn't is a
 * product gap — the test failing loudly is the desired behaviour. Never add
 * capability flags (adviser: false, spice: false, etc.) to hide a broken path
 * without fixing the underlying problem and getting explicit approval.
 */
/** @type {ReadonlyArray<WizardSpec>} */
export const WIZARD_CATALOG = Object.freeze([
  // ── Filters / PFC ──────────────────────────────────────────────────
  w('cmc',                 'CMC',                       'Cmc-link',           'CmcWizard',                'filter',   ['smoke', 'scenario']),
  w('dmc',                 'DMC',                       'Dmc-link',     'DmcWizard',                'filter',   ['scenario']),
  // PFC's simulated mode is not implemented in the WASM backend yet; the
  // wizard hides the Simulated button. Mark explicitly so flows.js falls
  // back to Analytical instead of throwing on a missing button.
  w('pfc',                 'PFC',                       'Pfc-link',                              'PfcWizard',                'pfc',      ['heavy', 'scenario'], { simulated: false }),

  // ── Non-Isolated DC-DC ─────────────────────────────────────────────
  w('buck',                'Buck',                      'Buck-link',             'BuckWizard',               'dc-dc',    ['smoke', 'scenario']),
  w('boost',               'Boost',                     'Boost-link',            'BoostWizard',              'dc-dc',    ['smoke', 'scenario']),
  w('sepic',               'SEPIC',                     'Sepic-link',            'SepicWizard',              'dc-dc',    ['heavy', 'scenario']),
  w('cuk',                 'Cuk',                       'Cuk-link',              'CukWizard',                'dc-dc',    ['scenario']),
  w('zeta',                'Zeta',                      'Zeta-link',             'ZetaWizard',               'dc-dc',    ['scenario']),
  w('fsbb',                'Four-Switch Buck-Boost',    'FourSwitchBuckBoost-link', 'FourSwitchBuckBoostWizard', 'dc-dc', ['scenario']),

  // ── Isolated Single-Switch ─────────────────────────────────────────
  w('flyback',             'Flyback',                   'Flyback-link',          'FlybackWizard',            'isolated', ['heavy', 'scenario']),
  w('isolated-buck',       'Isolated Buck',             'IsolatedBuck-link',     'IsolatedBuckWizard',       'isolated', ['scenario']),
  w('isolated-buckboost',  'Isolated Buck-Boost',       'IsolatedBuckBoost-link','IsolatedBuckBoostWizard',  'isolated', ['heavy', 'scenario']),
  w('active-clamp-forward','Active Clamp Forward',      'ActiveClampForward-link','ActiveClampForwardWizard','isolated', ['heavy', 'scenario']),
  w('single-switch-forward','Single-Switch Forward',    'SingleSwitchForward-link','SingleSwitchForwardWizard','isolated', ['heavy', 'scenario']),
  w('two-switch-forward',  'Two-Switch Forward',        'TwoSwitchForward-link', 'TwoSwitchForwardWizard',   'isolated', ['scenario']),

  // ── Isolated Bridge / Push-Pull ────────────────────────────────────
  w('push-pull',           'Push-Pull',                 'PushPull-link',         'PushPullWizard',           'isolated', ['heavy', 'scenario']),
  w('weinberg',            'Weinberg',                  'Weinberg-link',         'WeinbergWizard',           'isolated', ['scenario']),
  w('psfb',                'PSFB',                      'Psfb-link',                             'PsfbWizard',               'isolated', ['scenario']),
  w('pshb',                'PSHB',                      'Pshb-link',                             'PshbWizard',               'isolated', ['heavy', 'scenario']),
  w('ahb',                 'AHB',                       'Ahb-link',                              'AhbWizard',                'isolated', ['heavy', 'scenario']),
  w('dab',                 'DAB',                       'Dab-link',                              'DabWizard',                'dab',      ['heavy', 'scenario']),

  // ── Resonant ──────────────────────────────────────────────────────
  w('llc',                 'LLC',                       'Llc-link',                              'LlcWizard',                'resonant', ['heavy', 'scenario']),
  w('cllc',                'CLLC',                      'Cllc-link',                             'CllcWizard',               'resonant', ['heavy', 'scenario']),
  w('clllc',               'CLLLC',                     'Clllc-link',                            'ClllcWizard',              'resonant', ['heavy', 'scenario']),
  w('src',                 'SRC',                       'Src-link',                              'SrcWizard',                'resonant', ['heavy', 'scenario']),

  // ── 3-phase PFC ───────────────────────────────────────────────────
  // Vienna SPICE is single-phase boost emulation (MKF Phase-1): one phase
  // solved at peak-of-line and replicated across B/C by 120-deg symmetry.
  // Returned payload carries `viennaDiagnostics.note` explaining the
  // limitation. Full 3-phase netlist deferred to MKF Phase 3+.
  // Vienna's SPICE is wired in the wizard but the `@get-spice-code` listener is
  // intentionally omitted (single-phase emulation only). Skip in tests.
  w('vienna',              'Vienna Rectifier',          'Vienna-link',                           'ViennaWizard',             'pfc',      ['scenario']),

  // ── Measurement (hidden from UI) ──────────────────────────────────
  // Current Transformer wizard exists but is intentionally not exposed in
  // the Header dropdown or WizardsLanding cards. Re-add an entry here when
  // the UI is re-enabled.
]);

/** Lookup by `key`. Throws if absent — never returns undefined silently. */
export function getWizard(key) {
  const w = WIZARD_CATALOG.find((x) => x.key === key);
  if (!w) {
    const known = WIZARD_CATALOG.map((x) => x.key).join(', ');
    throw new Error(`getWizard: unknown wizard key "${key}" (known: ${known})`);
  }
  return w;
}

/** Filter catalog by tag, e.g. byTag('smoke'). */
export function byTag(tag) {
  return WIZARD_CATALOG.filter((w) => w.tags.includes(tag));
}

/** Filter by capability flag, e.g. supporting('adviser'). */
export function supporting(cap) {
  return WIZARD_CATALOG.filter((w) => Boolean(w.capabilities[cap]));
}
