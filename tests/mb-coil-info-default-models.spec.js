/**
 * Regression for ABT #1227 — CoilInfo used `Defaults` without importing it.
 *
 * CoilInfo builds the simulation models as
 *   this.$userStore.selectedModels['coreLosses'] || Defaults.coreLossesModelDefault
 * `||` only evaluates the right-hand side when the user has no model selected,
 * so anyone with saved choices never reached the missing import. A user whose
 * selectedModels is empty did, and simulate() threw
 * `ReferenceError: Defaults is not defined` before it ever reached the engine.
 *
 * The test empties selectedModels, loads a wound design, and requires that
 * CoilInfo's simulation reaches the engine with MKF's default models.
 */
import fs from 'node:fs';
import { test, expect } from './_coverage.js';
import { BASE_URL } from './utils.js';

const MAS_FIXTURE = new URL('../MagneticBuilder/src/public/test_wound_coil.json', import.meta.url);

test.describe('MB – coil info with no saved model preferences (ABT #1227)', () => {
  test.describe.configure({ timeout: 180000 });

  test('CoilInfo simulates with the default models', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    const parsedMas = JSON.parse(fs.readFileSync(MAS_FIXTURE, 'utf-8'));

    await page.goto(`${BASE_URL}/magnetic_tool`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // The route redirects through /engine_loader and remounts on return; a MAS
    // injected before the engine is ready is wiped by that remount.
    await page.waitForFunction(
      () => window.__omEngineReady === true && !window.location.pathname.includes('engine_loader'),
      null,
      { timeout: 120000 },
    );

    await page.evaluate((mas) => {
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const masStore = pinia._s.get('mas');
      const state = pinia._s.get('state');

      pinia._s.get('user').selectedModels = {};

      window.__coilInfoSimulations = [];
      // MagneticBuilder components use the builder's own task queue, which is
      // only created when the builder mounts; a plugin sees it as it is created.
      pinia.use(({ store }) => {
        if (store.$id !== 'magneticBuilderTaskQueue') return;
        store.$onAction(({ name, args }) => {
          if (name === 'simulate') window.__coilInfoSimulations.push(JSON.parse(JSON.stringify(args[1])));
        });
      });
      if (pinia._s.has('magneticBuilderTaskQueue')) {
        throw new Error('magneticBuilderTaskQueue already exists; the simulate spy would never attach');
      }

      // The initial DesignRequirements mount resets the magnetic and operating
      // points; restore them from the fixture whenever that happens.
      let healing = false;
      masStore.$subscribe(() => {
        if (healing) return;
        const coilStripped = masStore.mas?.magnetic?.coil && masStore.mas.magnetic.coil.turnsDescription == null;
        const opsStripped = (masStore.mas?.inputs?.operatingPoints?.length ?? 0) === 0;
        if (coilStripped || opsStripped) {
          healing = true;
          if (coilStripped) masStore.mas.magnetic = JSON.parse(JSON.stringify(mas.magnetic));
          if (opsStripped) masStore.mas.inputs = JSON.parse(JSON.stringify(mas.inputs));
          healing = false;
        }
      });
      masStore.setMas(mas);

      state.selectWorkflow?.('design');
      state.selectTool?.('magneticBuilder');
      state.setCurrentToolSubsection('magneticBuilder');
      state.setCurrentToolSubsectionStatus('designRequirements', true);
      state.setCurrentToolSubsectionStatus('operatingPoints', true);
    }, parsedMas);

    await page.waitForFunction(
      () => window.__coilInfoSimulations.length > 0,
      null,
      { timeout: 60000 },
    ).catch((error) => {
      throw new Error(`CoilInfo never reached the engine's simulate. Page errors: ${JSON.stringify(errors)}\n${error.message}`);
    });

    const models = await page.evaluate(() => window.__coilInfoSimulations[0]);
    expect(models.coreLosses).toBe('IGSE');
    expect(models.coreTemperature).toBe('Maniktala');
    expect(models.gapReluctance).toBe('Zhang');
    expect(errors.filter(e => /Defaults is not defined/.test(e))).toEqual([]);
  });
});
