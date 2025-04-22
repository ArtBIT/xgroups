import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    lib: {
      entry: "src/main.js",
      name: "XGroups",
      fileName: "xgroups",
      formats: ["iife"], // Immediately Invoked Function Expression for TamperMonkey
    },
    minify: false, // Keep readable for debugging
  },
});
