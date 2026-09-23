import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // ⚠️ FIX: el manifest generado por este plugin (el que realmente se
      // sirve en producción como manifest.webmanifest, no public/manifest.json
      // que queda sin usar) apuntaba solo a icon.svg — así, el sitio
      // instalado como app podía no cumplir los requisitos de ícono de
      // algunos Android/Chrome. Ahora usa los mismos PNG reales (192/512)
      // que ya existían en public/, igual que public/manifest.json.
      includeAssets: ["icon.svg", "favicon-16x16.png", "favicon-32x32.png", "apple-touch-icon.png"],
      manifest: {
        name: "Torneo Star Básquet",
        short_name: "Torneo Star",
        description: "Dashboard estadístico del Torneo Star Básquet Córdoba 2026",
        theme_color: "#08101a",
        background_color: "#08101a",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
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
          three: ['three'],
        },
      },
    },
  },
});
