import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "nc85hh",
  video: false,
  component: {
    devServer: {
      framework: "vue",
      bundler: "vite",
    },
  },
  e2e: {
    baseUrl: 'http://localhost:5173',
  },
});
