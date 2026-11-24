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
      // ⚡ El service worker descargaba de antemano TODO el sitio para cada
      // visitante, incluido el panel de admin y la librería de Excel (~0,5 MB
      // que el público nunca usa). Ahora esos archivos quedan afuera: el
      // panel los pide recién cuando un admin entra, como cualquier página.
      // Lo mismo con la pelota 3D (three.js, ~0,5 MB): en celulares viejos o
      // con ahorro de datos no se muestra, así que no tiene sentido bajarla.
      workbox: {
        // ⚠️ FIX pantalla en blanco (21/11): el precache viejo quedó con la
        // página HTML guardada en lugar del JS/CSS (ver vercel.json). Un
        // nombre de caché nuevo obliga a todos los celulares a armar el
        // precache de cero, sin reusar esas copias malas.
        cacheId: 'torneostar',
        // 🔄 App instalada = igual que la web (pedido de Alvaro): antes la
        // página principal (index.html) se guardaba en el celular y la app
        // instalada SIEMPRE arrancaba con la versión guardada; la nueva
        // recién aparecía la vez siguiente que se abría. Ahora, al abrir, la
        // página se pide primero a internet (lo nuevo al instante) y solo si
        // no hay conexión (o tarda más de 4 s) se usa la copia guardada.
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "paginas",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 5 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        globIgnores: [
          "**/index.html",
          "**/three-*.js",
          "**/basketballScene-*.js",
          "**/xlsx-*.js",
          "**/AdminPanel-*.js",
          "**/AdminLogin-*.js",
          "**/ExcelUpload-*.js",
        ],
      },
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
        // ⚠️ FIX pantalla en blanco (21/11): durante un deploy, el rewrite de
        // vercel.json devolvía la página HTML para archivos de /assets/ que
        // todavía no estaban, y esa respuesta quedó guardada (caché del
        // navegador/Vercel/service worker) en lugar del JS/CSS real -> el
        // sitio quedaba en blanco. vercel.json ya no reescribe /assets/;
        // además se cambian TODAS las direcciones de archivos ("-r3-") para
        // que nadie vuelva a usar esas copias malas ya guardadas.
        // (23/11) "-r3-": se sacó de vercel.json el Cache-Control "immutable"
        // de /assets/ — también se aplicaba a los 404 de un archivo pedido
        // justo durante un deploy, y el navegador guardaba ese 404 por un año
        // (página en negro). Nombres nuevos para salir de eso.
        entryFileNames: 'assets/[name]-r3-[hash].js',
        chunkFileNames: 'assets/[name]-r3-[hash].js',
        assetFileNames: 'assets/[name]-r3-[hash][extname]',
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
