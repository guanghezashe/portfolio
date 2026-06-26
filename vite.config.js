import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  server: {
    proxy: {
      "/api": "http://127.0.0.1:4174",
      "/uploads": "http://127.0.0.1:4174",
      "/legacy-gallery": "http://127.0.0.1:4174",
    },
  },
});
