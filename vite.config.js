import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "frontend",
  base: "./",
  server: {
    port: 5173,
    open: "/login.html",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        login: resolve(__dirname, "frontend/login.html"),
        signup: resolve(__dirname, "frontend/signup.html"),
        forgot: resolve(__dirname, "frontend/forgot.html"),
        dashboard: resolve(__dirname, "frontend/dashboard.html"),
        sandbox: resolve(__dirname, "frontend/sandbox.html"),
      },
    },
  },
});
