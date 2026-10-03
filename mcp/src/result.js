/**
 * OpenMagnetics result panel — the MCP App behind ui://openmagnetics/result.html (ABT #654),
 * attached to core_losses, winding_losses, leakage_inductance, peak_winding_current and
 * core_temperature. The panel (src/resultView.js) shows the quantity result; this file is the
 * host wiring, plus the one thing the panel asks of the host: to have the assistant run the
 * sweep whose curve belongs beside the number (drawn by the existing sweeps widget).
 */
import "./omWidget.css";
import "./resultView.css";
import { createResultView } from "./resultView.js";
import { connectView } from "./hostWiring.js";

let app = null;
let toolName = null;

const view = createResultView(document.getElementById("app"), {
  toolName: () => toolName,
  canMessage: () => Boolean(app?.getHostCapabilities()?.message),
  onCurve: async (curve, button) => {
    const status = button.parentElement.querySelector(".rp-curve-status");
    button.disabled = true;
    try {
      const reply = await app.sendMessage({ role: "user", content: [{ type: "text", text: curve.text }] });
      if (reply?.isError) throw new Error("the host refused the message");
      status.textContent = `asked for ${curve.tool}`;
    } catch (error) {
      button.disabled = false;
      status.textContent = `the request did not reach the assistant: ${error.message}`;
      status.classList.add("rp-curve-error");
    }
  },
});

app = await connectView("OpenMagnetics result", view, {
  onContext: (ctx) => {
    const name = ctx.toolInfo?.tool?.name;
    if (name && name !== toolName) {
      toolName = name;
      view.refresh();
    }
  },
});
view.refresh();
