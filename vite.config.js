import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/neuburg-explorer/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        plan: resolve(import.meta.dirname, "plan.html")
      }
    }
  }
});
