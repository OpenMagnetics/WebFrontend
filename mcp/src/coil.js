/**
 * OpenMagnetics wound coil — the MCP App behind ui://openmagnetics/coil.html (ABT #653),
 * attached to wind_coil, wind_by_turns, wind_by_sections, wind_by_layers and wind_planar.
 * The view (src/coilView.js) draws MKF's Painter cross-section the server sends and the
 * per-section / per-layer tables; this file is only the host wiring.
 */
import "./omWidget.css";
import "./coilView.css";
import { createCoilView } from "./coilView.js";
import { connectView } from "./hostWiring.js";

const view = createCoilView(document.getElementById("app"));
await connectView("OpenMagnetics wound coil", view);
