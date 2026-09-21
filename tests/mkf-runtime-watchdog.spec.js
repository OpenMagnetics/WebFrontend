/**
 * MKF engine-worker watchdog (WebSharedComponents/assets/js/mkfRuntime.js), run in node
 * against a scripted fake worker — no browser, no engine.
 *
 * A user importing a dense LTspice export was told "MKF call 'resolve_dimension_with_tolerance'
 * did not return within 120s". That call takes a millisecond. The worker runs one call at a
 * time, the watchdog's clock started when a call was POSTED, and the import in front of it was
 * the one taking minutes; when its own timer fired and the worker was replaced, the calls still
 * waiting on the dead worker each fired later and replaced the NEW worker too. The replacement
 * also came up with no catalogues and default settings.
 *
 * The runtime source is loaded with two substitutions, both asserted so a refactor that moves
 * them fails here instead of silently testing something else: the 120 s watchdog becomes 300 ms,
 * and comlink becomes a stub that hands back the fake worker's API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';

const RUNTIME = new URL('../WebSharedComponents/assets/js/mkfRuntime.js', import.meta.url).pathname;

function substitute(source, from, to) {
    if (!source.includes(from)) {
        throw new Error(`mkfRuntime.js no longer contains ${JSON.stringify(from)}; update this test`);
    }
    return source.replace(from, to);
}

// A worker the way the real one behaves: one call at a time, and a terminated worker never
// answers again. 'hang' never returns; 'take' returns after args[0] ms.
function installFakeWorker(workers) {
    globalThis.Worker = class {
        constructor() {
            const worker = this;
            this.dead = false;
            this.id = workers.length;
            this.settings = null;
            this.loaded = false;
            this.tail = Promise.resolve();
            workers.push(this);
            this.api = {
                init: async () => true,
                waitReady: async () => true,
                callMethod: (name, ...args) => (worker.tail = worker.tail.then(() => new Promise((resolve, reject) => {
                    const answer = (value) => { if (!worker.dead) resolve(value); };
                    if (name === 'hang') return;
                    if (name === 'take') { setTimeout(() => answer(`took ${args[0]} ms`), args[0]); return; }
                    if (name === 'set_settings') { worker.settings = args[0]; answer(undefined); return; }
                    if (name === 'load_data') { worker.loaded = true; answer(true); return; }
                    if (name === 'get_state') { answer({ worker: worker.id, settings: worker.settings, loaded: worker.loaded }); return; }
                    if (name === 'fail') { reject(new Error('restore failed on purpose')); return; }
                    answer(`${name} answered`);
                }))),
            };
        }
        terminate() { this.dead = true; }
    };
}

async function loadRuntime(testInfo) {
    let source = fs.readFileSync(RUNTIME, 'utf8');
    source = substitute(source, 'const MKF_CALL_WATCHDOG_MS = 120_000;', 'const MKF_CALL_WATCHDOG_MS = 300;');
    source = substitute(source, "import * as Comlink from 'comlink';", 'const Comlink = { wrap: (worker) => worker.api };');
    const file = testInfo.outputPath('mkfRuntime.under-test.mjs');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source);
    return import(pathToFileURL(file).href);
}

const settle = (promise) => promise.then((value) => ({ ok: true, value }), (error) => ({ ok: false, message: error.message }));

test.describe('MKF worker watchdog', () => {
    test('times what a call runs, blames the stuck call, and restores the replacement', async ({}, testInfo) => {
        const workers = [];
        installFakeWorker(workers);
        const runtime = await loadRuntime(testInfo);
        runtime.setEngineRestoreHandler(async (mkf) => { await mkf.load_data(); });

        const mkf = await runtime.initWorker('/wasm/libMKF.wasm.js');
        await mkf.set_settings('{"coilUseRealWindingGeometry":true}');

        // Two 200 ms calls and a fast one: 400 ms of queue under a 300 ms watchdog. Each runs in
        // under 300 ms, so none of them is stuck.
        const queued = await Promise.all([mkf.take(200), mkf.take(200), mkf.fast()].map(settle));
        expect(queued.map((r) => r.ok)).toEqual([true, true, true]);
        expect(workers).toHaveLength(1);

        // The reported case: a call that never returns, and a 1 ms call queued behind it.
        const stuck = settle(mkf.hang());
        const behind = settle(mkf.resolve_dimension_with_tolerance('{"nominal":1e-4}'));
        const [stuckOutcome, behindOutcome] = await Promise.all([stuck, behind]);
        expect(stuckOutcome.message).toContain("MKF call 'hang' did not return within");
        expect(behindOutcome.ok).toBe(false);
        expect(behindOutcome.message).toContain("'resolve_dimension_with_tolerance' was cancelled");
        expect(behindOutcome.message).toContain("because 'hang' did not return");
        expect(behindOutcome.message).not.toContain("'resolve_dimension_with_tolerance' did not return");

        // The replacement has the last settings and the app's data before anyone can reach it.
        const fresh = await runtime.waitForMkf();
        expect(await fresh.get_state()).toEqual({ worker: 1, settings: '{"coilUseRealWindingGeometry":true}', loaded: true });

        // Nothing left over from the dead worker replaces the new one later...
        await new Promise((resolve) => setTimeout(resolve, 700));
        expect(workers).toHaveLength(2);
        expect(workers[1].dead).toBe(false);
        // ...and a call through the dead worker's proxy is refused, not posted into the void.
        const stale = await settle(mkf.fast());
        expect(stale.message).toContain('has since been restarted');

        // A restart that cannot restore the engine rejects waitForMkf instead of hanging it.
        runtime.setEngineRestoreHandler(async (m) => { await m.fail(); });
        const secondStuck = await settle(fresh.hang());
        expect(secondStuck.message).toContain("MKF call 'hang' did not return within");
        const afterFailedRestart = await settle(runtime.waitForMkf());
        expect(afterFailedRestart.ok).toBe(false);
        expect(afterFailedRestart.message).toContain('could not be restarted');
        expect(afterFailedRestart.message).toContain('restore failed on purpose');
    });
});
