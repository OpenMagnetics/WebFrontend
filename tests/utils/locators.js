/**
 * tests/utils/locators.js
 *
 * Card-level locator factories. A "card" is one `.compact-card` in the
 * wizards' three-column layout, identified by its visible header text.
 *
 * Keep this file pure (no side effects, no awaits) — just locator builders.
 */

const card = (page, name) =>
  page.locator('.compact-card').filter({ hasText: name }).first();

export const conditionsCard   = (page) => card(page, 'Conditions');
export const transformerCard  = (page) => card(page, 'Transformer');
export const diagnosticsCard  = (page) => card(page, 'Diagnostics');
export const outputsCard      = (page) => card(page, 'Outputs');
export const inputVoltageCard = (page) => card(page, 'Input Voltage');

/** Sim buttons (analytical / simulated) live at the bottom of the wizard. */
export const analyticalBtn = (page) => page.locator('.sim-btn.analytical');
export const simulatedBtn  = (page) => page.locator('.sim-btn.simulated');

/** Top-of-wizard navigation buttons. */
export const designMagneticBtn = (page) =>
  page.locator('button').filter({ hasText: 'Design Magnetic' }).first();
export const reviewSpecsBtn = (page) =>
  page.locator('button').filter({ hasText: 'Review Specs' }).first();

/** Magnetic Tool: Adviser entry points. */
export const magneticAdviserBtn = (page) =>
  page.locator('button').filter({ hasText: /^Magnetic Adviser$/ }).first();
export const coreAdviseBtn = (page) =>
  page.locator('[data-cy$="-Core-Advise-button"]').first();
