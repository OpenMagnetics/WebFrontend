/**
 * A minimal MCP Apps HOST for the widget tests: the official AppBridge, talking to the built
 * dist/picker.html in an iframe over postMessage — the same path a real host uses, so the
 * test exercises the widget's actual bridge calls rather than a stub of them.
 *
 * window.startHost(opts) loads the widget, sends one tool result once the view has
 * initialised, and records every ui/update-model-context request in window.__host.contexts.
 */
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";

window.__host = { contexts: [], initialized: false, errors: [] };

window.startHost = async ({ result, capabilities, toolName, refuseContext, theme = "light" }) => {
  const iframe = document.getElementById("view");
  const bridge = new AppBridge(null, { name: "picker-test-host", version: "0.0.0" }, capabilities, {
    hostContext: {
      theme,
      toolInfo: toolName ? { tool: { name: toolName, inputSchema: { type: "object" } } } : undefined,
    },
  });
  bridge.onupdatemodelcontext = async (params) => {
    if (refuseContext) throw new Error("the test host refused the context update");
    window.__host.contexts.push(params);
    return {};
  };
  bridge.oninitialized = () => {
    window.__host.initialized = true;
    bridge.sendToolResult(result).catch((e) => window.__host.errors.push(String(e)));
  };
  await bridge.connect(new PostMessageTransport(iframe.contentWindow, iframe.contentWindow));
  iframe.src = "/picker.html";
};
