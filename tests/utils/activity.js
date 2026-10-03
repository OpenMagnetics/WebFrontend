/**
 * tests/utils/activity.js — wait for the app to finish what it is doing, on real signals.
 *
 * The builder is event driven: a layout mount, a shape pick or an injected design sets off a
 * chain of store actions (magneticBuilderReady -> masAutocomplete -> coreProcessed -> wind ->
 * wound -> simulate ...), each of which calls the engine in a Web Worker. A fixed pause guesses
 * how long that chain takes; a wait on one store field is often already true from the step
 * before (ABT #929, #1415). This probe watches the chain itself:
 *
 *   - every action on the watched Pinia stores, counted in flight until it settles
 *     ($onAction after/onError — async actions settle when their promise does);
 *   - every request posted to a Web Worker (the MKF engine, the 3D builder, Kirchhoff) that
 *     carries a Comlink message id, counted until the worker answers that id.
 *
 * "Idle" means nothing in flight on either side and no new activity for a short quiet window.
 * The window only bridges the app's own hand-offs between links of the chain (event-bus
 * actions fired from setTimeout(.., 20), the 250 ms resize debounce); it is not a guess at how
 * long the work takes — the wait ends as soon as the work does and fails, with the in-flight
 * actions named, if it never does.
 *
 * Install with `installActivityProbe(page)` BEFORE the first navigation of the test: it is an
 * init script, so it also re-arms itself on every later page load.
 */

export const DEFAULT_ACTIVITY_STORES = ['magneticBuilderTaskQueue', 'taskQueue', 'mas'];

export async function installActivityProbe(page, { stores = DEFAULT_ACTIVITY_STORES } = {}) {
  await page.addInitScript((storeNames) => {
    if (window.__omActivity) return;
    const probe = {
      inflight: new Map(),        // token -> "store.action"
      workers: new Set(),
      last: performance.now(),
      seq: 0,                     // actions started since load
      completed: {},              // "store.action" -> number settled OK
      failed: [],                 // { action, error }
      recent: [],                 // last 40 started actions, for diagnostics
      pendingWorkerRequests() {
        let count = 0;
        for (const worker of this.workers) count += worker.__omPending.size;
        return count;
      },
    };
    window.__omActivity = probe;
    const touch = () => { probe.last = performance.now(); };

    // Web Workers: Comlink posts { id, type, path, ... } and the worker answers with the same
    // id. Ids we never posted (worker-initiated traffic) are ignored; a terminated worker drops
    // its pending ids, since it will never answer them.
    const NativeWorker = window.Worker;
    if (typeof NativeWorker === 'function') {
      class ProbedWorker extends NativeWorker {
        constructor(...args) {
          super(...args);
          this.__omPending = new Set();
          probe.workers.add(this);
          this.addEventListener('message', (event) => {
            const id = event.data?.id;
            if (id != null && this.__omPending.delete(id)) touch();
          });
        }
        postMessage(message, ...rest) {
          const id = message?.id;
          if (id != null) {
            this.__omPending.add(id);
            touch();
          }
          return super.postMessage(message, ...rest);
        }
        terminate() {
          this.__omPending.clear();
          probe.workers.delete(this);
          touch();
          return super.terminate();
        }
      }
      window.Worker = ProbedWorker;
    }

    // Pinia stores appear as the app and the builder mount; attach to each the first time it
    // exists (detached subscription, so it outlives whichever component created the store).
    const attached = new WeakSet();
    let token = 0;
    const attach = () => {
      const pinia = document.querySelector('#app')?.__vue_app__?.config?.globalProperties?.$pinia;
      if (pinia == null) return;
      for (const storeName of storeNames) {
        const store = pinia._s.get(storeName);
        if (store == null || attached.has(store)) continue;
        attached.add(store);
        store.$onAction(({ name, after, onError }) => {
          const key = `${storeName}.${name}`;
          const mine = ++token;
          probe.seq += 1;
          probe.inflight.set(mine, key);
          probe.recent.push(key);
          if (probe.recent.length > 40) probe.recent.shift();
          touch();
          after(() => {
            probe.inflight.delete(mine);
            probe.completed[key] = (probe.completed[key] ?? 0) + 1;
            touch();
          });
          onError((error) => {
            probe.inflight.delete(mine);
            probe.failed.push({ action: key, error: String(error?.message ?? error).slice(0, 300) });
            touch();
          });
        }, true);
      }
    };
    attach();
    setInterval(attach, 50);
  }, stores);
}

/**
 * A point in time to wait FROM. Pass it to waitForIdle / waitForActionSince so that work
 * finished before the step under test cannot satisfy the wait.
 */
export async function activityMark(page) {
  return page.evaluate(() => {
    const probe = window.__omActivity;
    if (probe == null) {
      throw new Error('activity probe not installed — call installActivityProbe(page) before navigating');
    }
    return { at: performance.now(), seq: probe.seq, completed: { ...probe.completed } };
  });
}

async function describeActivity(page) {
  return page.evaluate(() => {
    const probe = window.__omActivity;
    if (probe == null) return { probe: 'not installed on this document' };
    return {
      url: window.location.pathname,
      inflight: [...probe.inflight.values()],
      pendingWorkerRequests: probe.pendingWorkerRequests(),
      msSinceLastActivity: Math.round(performance.now() - probe.last),
      recent: probe.recent.slice(-15),
      failed: probe.failed.slice(-5),
    };
  }).catch((error) => ({ describeFailed: String(error).slice(0, 200) }));
}

/**
 * Wait until no store action and no worker request is in flight and nothing new has started
 * for `quietMs`, counted from the later of the last activity and `since` (a mark taken before
 * the step under test, so a page that was idle BEFORE the step cannot satisfy the wait while
 * the step's reaction is still being scheduled).
 */
export async function waitForIdle(page, { since = null, quietMs = 500, timeout = 120000, label = 'the app' } = {}) {
  try {
    await page.waitForFunction(([quiet, sinceAt]) => {
      const probe = window.__omActivity;
      if (probe == null) return false;
      if (probe.inflight.size > 0 || probe.pendingWorkerRequests() > 0) return false;
      const from = Math.max(probe.last, sinceAt ?? 0);
      return performance.now() - from >= quiet;
    }, [quietMs, since?.at ?? null], { timeout, polling: 100 });
  }
  catch (error) {
    const state = await describeActivity(page);
    throw new Error(`${label} never went idle within ${timeout} ms. Activity: ${JSON.stringify(state)}. `
                    + `(${error.message.split('\n')[0]})`);
  }
}

/**
 * Wait until `store.action` has settled at least once more than it had at `since`. Throws the
 * action's own error if it rejected instead.
 */
export async function waitForActionSince(page, since, key, { timeout = 120000 } = {}) {
  try {
    await page.waitForFunction(([actionKey, before]) => {
      const probe = window.__omActivity;
      if (probe == null) return false;
      if (probe.failed.some((failure) => failure.action === actionKey)) return true;
      return (probe.completed[actionKey] ?? 0) > before;
    }, [key, since.completed[key] ?? 0], { timeout, polling: 100 });
  }
  catch (error) {
    const state = await describeActivity(page);
    throw new Error(`${key} did not complete within ${timeout} ms. Activity: ${JSON.stringify(state)}. `
                    + `(${error.message.split('\n')[0]})`);
  }
  const failure = await page.evaluate((actionKey) =>
    window.__omActivity.failed.find((entry) => entry.action === actionKey) ?? null, key);
  if (failure != null) {
    throw new Error(`${key} failed: ${failure.error}`);
  }
}

/**
 * Wait until the visible layout stops moving: the boxes of the given elements are identical on
 * `frames` consecutive animation frames. For reflows (a viewport resize, a layout swap) where
 * the signal is the geometry itself settling rather than any store action.
 */
export async function waitForStableLayout(page, selector, { frames = 5, timeout = 30000 } = {}) {
  await page.evaluate(() => { delete window.__omStableLayout; });
  await page.waitForFunction(([css, needed]) => {
    const signature = () => [...document.querySelectorAll(css)]
      .map((element) => {
        const box = element.getBoundingClientRect();
        return `${Math.round(box.left)},${Math.round(box.top)},${Math.round(box.width)},${Math.round(box.height)}`;
      })
      .join('|');
    const state = window.__omStableLayout ?? (window.__omStableLayout = { css: null, last: null, same: 0 });
    if (state.css !== css) Object.assign(state, { css, last: null, same: 0 });
    const now = signature();
    state.same = now === state.last && now !== '' ? state.same + 1 : 0;
    state.last = now;
    return state.same >= needed;
  }, [selector, frames], { timeout, polling: 'raf' });
  await page.evaluate(() => { delete window.__omStableLayout; });
}
