import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// An MCP App resource renders in a deny-by-default CSP iframe, so the widget must be ONE
// self-contained file: no external script, style or font request survives. vite-plugin-singlefile
// inlines the entry; INPUT selects it so more widgets can be added the way Kirchhoff's build does,
// with emptyOutDir off so a second build cannot wipe the first.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: { input: process.env.INPUT || "curves.html" },
  },
});
