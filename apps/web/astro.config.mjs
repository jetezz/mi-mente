import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config

export default defineConfig({
  integrations: [react()],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ["mimente.online"],
      proxy: {
        "/api": {
          target: process.env.API_INTERNAL_URL || "http://localhost:3000",
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ""),
        },
      },
      watch: {
        usePolling: true,
      },
    },
  },
});
