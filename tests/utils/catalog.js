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
 *     wireAdviser    true  → Wire Adviser reachable (most: false today)
 *     simulated      true  → Simulated waveform button present
 *     iKnowMode      true  → Has DesignLevel radio for "I know the design"
 *     inductanceCy   data-cy suffix for inductance input in iKnow mode (e.g. 'Inductance')
 *   numericalCase  optional reference design used by the numerical battery
 *     inputs       map of data-cy suffix → value (set before analytical)
 *     expects      map of metric name → { value, tol }
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
 *     wireAdviser: boolean,
 *     simulated: boolean,
 *     iKnowMode: boolean,
 *     inductanceCy?: string,
 *   },
 *   numericalCase?: {
 *     inputs: Record<string, string|number>,
 *     expects: Record<string, { value: number, tol: number }>,
 *   },
 * }} WizardSpec */

/** @type {ReadonlyArray<WizardSpec>} */
export const WIZARD_CATALOG = Object.freeze([
  {
    key: 'buck',
    title: 'Buck',
    linkCy: 'Buck-CommonModeChoke-link',
    wizardPrefix: 'BuckWizard',
    topology: 'dc-dc',
    tags: ['smoke', 'scenario'],
    capabilities: {
      adviser: true, coreAdviser: true, wireAdviser: false,
      simulated: true, iKnowMode: true, inductanceCy: 'Inductance',
    },
  },
  {
    key: 'boost',
    title: 'Boost',
    linkCy: 'Boost-CommonModeChoke-link',
    wizardPrefix: 'BoostWizard',
    topology: 'dc-dc',
    tags: ['smoke', 'scenario'],
    capabilities: {
      adviser: true, coreAdviser: true, wireAdviser: false,
      simulated: true, iKnowMode: true, inductanceCy: 'Inductance',
    },
  },
  {
    key: 'flyback',
    title: 'Flyback',
    linkCy: 'Flyback-CommonModeChoke-link',
    wizardPrefix: 'FlybackWizard',
    topology: 'isolated',
    tags: ['scenario'],
    capabilities: {
      adviser: true, coreAdviser: true, wireAdviser: false,
      simulated: true, iKnowMode: true,
    },
  },
  {
    key: 'pfc',
    title: 'PFC',
    linkCy: 'Pfc-link',
    wizardPrefix: 'PfcWizard',
    topology: 'pfc',
    tags: ['scenario'],
    capabilities: {
      adviser: true, coreAdviser: true, wireAdviser: false,
      simulated: false, iKnowMode: true, inductanceCy: 'Inductance',
    },
  },
  {
    key: 'sepic',
    title: 'SEPIC',
    linkCy: 'Sepic-link',
    wizardPrefix: 'SepicWizard',
    topology: 'dc-dc',
    tags: ['scenario'],
    capabilities: {
      adviser: true, coreAdviser: true, wireAdviser: false,
      simulated: true, iKnowMode: true,
    },
  },
  {
    key: 'dab',
    title: 'DAB',
    linkCy: 'Dab-link',
    wizardPrefix: 'DabWizard',
    topology: 'dab',
    tags: ['heavy', 'scenario'],
    capabilities: {
      adviser: true, coreAdviser: true, wireAdviser: false,
      simulated: true, iKnowMode: true,
    },
  },
  // Future expansions: add isolated-battery (push-pull, forward), llc/psfb,
  // cuk/zeta/four-switch-bb/weinberg/cllllc as their batteries migrate.
  // Each is a one-entry append + a one-line spec file using makeBatterySpec.
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
