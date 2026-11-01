/**
 * tests/utils/engineStub.js
 *
 * Answers chosen MKF calls in the page instead of the engine worker. The runtime sends every MKF
 * method through Comlink as `callMethod(<method>, ...args)` (WebSharedComponents
 * assets/js/mkfRuntime.js createMkfProxy); a post for one of the stubbed methods is not sent to the
 * worker, and its reply is handed to Comlink as the worker's own reply would be. Everything the
 * app does with the reply (the task queue's "Exception" handling, the Engine log) runs for real.
 *
 * Install before the page loads. `replies`: { <method>: <reply string> }, e.g.
 * { get_insulation_section_thickness: '2.5e-05' } or { ...: 'Exception: <why>' }.
 */
export async function stubEngineCalls(page, replies) {
  if (replies == null || typeof replies !== 'object' || Object.keys(replies).length === 0) {
    throw new Error('stubEngineCalls needs { method: reply } for at least one MKF method');
  }
  await page.addInitScript((stubbed) => {
    window.__stubbedEngineCalls = [];
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message, ...rest) {
      const method = message?.type === 'APPLY' && message.path?.[0] === 'callMethod'
        ? message.argumentList?.[0]?.value : null;
      if (method != null && Object.prototype.hasOwnProperty.call(stubbed, method)) {
        window.__stubbedEngineCalls.push({ method, args: message.argumentList.slice(1).map((arg) => arg.value) });
        const worker = this;
        setTimeout(() => worker.dispatchEvent(new MessageEvent('message', {
          data: { id: message.id, type: 'RAW', value: stubbed[method] },
        })), 0);
        return undefined;
      }
      return post.call(this, message, ...rest);
    };
  }, replies);
}

// The stubbed calls the page made, in order: [{ method, args }].
export async function stubbedEngineCalls(page) {
  return page.evaluate(() => {
    if (!Array.isArray(window.__stubbedEngineCalls)) throw new Error('stubEngineCalls was not installed');
    return window.__stubbedEngineCalls;
  });
}
