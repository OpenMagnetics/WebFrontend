/**
 * Per-wizard battery specs generated via makeBatterySpec(catalog-entry).
 *
 * One file per wizard, ~4 lines each. Add a new wizard by:
 *   1. Appending an entry to tests/utils/catalog.js
 *   2. Creating tests/wizards/<key>.spec.js with the same 3 lines below
 *
 * The contents of each test (Groups A/B/D/E/F/G) live in tests/utils/battery.js.
 * Per-wizard quirks belong in the catalog entry's `precondition` hook, NOT here.
 */
import { makeBatterySpec, getWizard } from '../utils/index.js';

makeBatterySpec(getWizard('buck'));
