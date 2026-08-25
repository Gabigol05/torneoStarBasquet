import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Torneo Star Básquet",
        short_name: "Torneo Star",
        description: "Dashboard estadístico del Torneo Star Básquet Córdoba 2026",
        theme_color: "#08101a",
        background_color: "#08101a",
        display: "standalone",
        icons: [
          {
            src: "/icon.svg",
            sizes: "192x192 512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Separa las librerías más pesadas en su propio chunk, para que no
        // vayan mezcladas con el bundle principal ni se re-descarguen enteras
        // cada vez que cambia código de la app (mejor cacheo entre deploys).
        manualChunks: {
          xlsx: ['xlsx'],
        },
      },
    },
  },
});
