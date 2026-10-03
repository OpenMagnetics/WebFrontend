// Shared harness for the widget tests: builds tests/host/ (a minimal MCP Apps host on the
// official AppBridge) once, launches headless Chromium, and opens a BUILT dist/<widget>.html
// in the host's iframe with one tool result. Headless only.
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { build } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const HERE = dirname(fileURLToPath(import.meta.url));
const MCP = join(HERE, "..");
const ORIGIN = "http://widget.test";

export const fixture = (name) => JSON.parse(readFileSync(join(HERE, "fixtures", `${name}.json`), "utf8"));
export const toolResult = (structuredContent) => ({ content: [{ type: "text", text: "digest" }], structuredContent });

export async function startHarness(widgets) {
  const bodies = {};
  for (const w of widgets) {
    const bundle = join(MCP, "dist", w);
    if (!existsSync(bundle)) throw new Error(`${bundle} is missing: run npm run build first`);
    bodies[`/${w}`] = readFileSync(bundle, "utf8");
  }
  const hostDir = mkdtempSync(join(tmpdir(), "om-widget-host-"));
  await build({
    configFile: false, root: join(HERE, "host"), logLevel: "error", plugins: [viteSingleFile()],
    build: { outDir: hostDir, emptyOutDir: true, rollupOptions: { input: join(HERE, "host", "host.html") } },
  });
  bodies["/host.html"] = readFileSync(join(hostDir, "host.html"), "utf8");
  const browser = await chromium.launch({ headless: true });

  /** A fresh page with the host loaded and `widget` fed `result`. */
  async function open(widget, { result, capabilities = {}, toolName, refuseMessage = false, theme = "light" }) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    await page.route(`${ORIGIN}/**`, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path in bodies) return route.fulfill({ contentType: "text/html", body: bodies[path] });
      return route.fulfill({ status: 404, body: `no ${path}` });
    });
    await page.goto(`${ORIGIN}/host.html`);
    await page.evaluate((opts) => window.startHost(opts),
      { result, capabilities, toolName, refuseMessage, theme, widget: `/${widget}` });
    await page.waitForFunction(() => window.__host.initialized);
    return { page, view: page.frameLocator("#view"), pageErrors };
  }

  async function stop() {
    await browser.close();
    rmSync(hostDir, { recursive: true, force: true });
  }
  return { open, stop };
}
