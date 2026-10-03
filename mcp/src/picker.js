/**
 * OpenMagnetics design picker — the MCP App behind ui://openmagnetics/picker.html (ABT #652).
 *
 * advise_magnetics, advise_cores, advise_coil and advise_from_catalog return a `design`
 * result under the Moebius pipeline contract: per design a rank, the adviser's score, a
 * compact digest (shape, material, gap, effective area, turns, wire, losses) under
 * `properties`, and a `mas://` handle to the full MAS the server keeps. The documents
 * themselves are megabytes and never travel; the handle is what the agent passes on.
 *
 * The table, filter, detail panel and the selection message are the shared ranked-candidate
 * picker (WebSharedComponents/mcpApps, ABT #663). This file is only the host wiring: theme
 * from the host context, the tool result in, the chosen handle out through
 * updateModelContext.
 */
import { App, applyDocumentTheme, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import { createCandidatePicker } from "../../WebSharedComponents/mcpApps/candidatePicker.js";
import "../../WebSharedComponents/mcpApps/candidatePicker.css";

const app = new App({ name: "OpenMagnetics design picker", version: "0.1.0" });

// Where the handle goes next, stated in the selection itself: the context update replaces
// what the model last saw from this widget, so the instruction cannot live only in the
// tool's description. The parameter names are the ones resolves_refs in server.py digs.
const SELECTION_NOTE =
  "[next] Pass the handle in place of a document as the `inputs`, `magnetic`, `coil` or `mas` "
  + "argument of any OpenMagnetics tool; fetch_design reads one part of it.";

const picker = createCandidatePicker(document.getElementById("app"), {
  selectionNote: SELECTION_NOTE,
  onSelect: async (selection) => {
    if (!app.getHostCapabilities()?.updateModelContext) {
      throw new Error("this host does not accept context updates from a widget "
        + "(no updateModelContext capability), so the choice cannot be sent from here. "
        + `Tell the assistant: ${selection.structuredContent.selected.ref ?? selection.text}`);
    }
    await app.updateModelContext({
      content: [{ type: "text", text: selection.text }],
      structuredContent: selection.structuredContent,
    });
  },
});

function applyHostContext(ctx) {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  const tool = ctx.toolInfo?.tool?.name;
  if (tool) picker.setSource(tool);
}

// Handlers before connect, connect LAST — the ordering curves.js learned by breaking it: a
// tool result can arrive while the module is still evaluating.
app.onhostcontextchanged = (ctx) => applyHostContext(ctx);
app.ontoolresult = (result) => {
  if (result?.isError) {
    const text = (result.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
    picker.setError(`The tool failed: ${text || "it reported an error with no message"}`);
    return;
  }
  if (!result?.structuredContent) {
    picker.setError("The tool returned no structured content for this widget.");
    return;
  }
  picker.setPayload(result.structuredContent);
};
await app.connect();
applyHostContext(app.getHostContext());
