/**
 * The host side every OpenMagnetics view repeats: theme from the host context, the tool
 * result in, a failed or empty result shown as its specific error. Handlers are registered
 * BEFORE connect — the ordering curves.js learned by breaking it: a tool result can arrive
 * while the module is still evaluating.
 */
import { App, applyDocumentTheme, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";

export async function connectView(name, view, { onContext } = {}) {
  const app = new App({ name, version: "0.1.0" });
  const applyHostContext = (ctx) => {
    if (!ctx) return;
    if (ctx.theme) applyDocumentTheme(ctx.theme);
    if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
    onContext?.(ctx);
  };
  app.onhostcontextchanged = (ctx) => applyHostContext(ctx);
  app.ontoolresult = (result) => {
    if (result?.isError) {
      const text = (result.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      view.setError(`The tool failed: ${text || "it reported an error with no message"}`);
      return;
    }
    if (!result?.structuredContent) {
      view.setError("The tool returned no structured content for this widget.");
      return;
    }
    view.setPayload(result.structuredContent);
  };
  await app.connect();
  applyHostContext(app.getHostContext());
  return app;
}
