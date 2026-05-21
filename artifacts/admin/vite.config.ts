import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

export default defineConfig(async ({ command }) => {
  /* PORT is only required for dev/preview, not for production builds */
  const rawPort = process.env.PORT;
  const isBuild = command === "build";

  if (!rawPort && !isBuild) {
    throw new Error("PORT environment variable is required but was not provided.");
  }

  const port = rawPort ? Number(rawPort) : 3000;

  if (!isBuild && (Number.isNaN(port) || port <= 0)) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = process.env.BASE_PATH ?? "/admin";

  const devPlugins =
    process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({ root: path.resolve(import.meta.dirname, "..") })
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : [];

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      process.env.ANALYZE === "1" &&
        visualizer({ filename: "dist/bundle-stats.html", open: false, gzipSize: true }),
      ...devPlugins,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
        react: path.resolve(import.meta.dirname, "node_modules/react"),
        "react-dom": path.resolve(import.meta.dirname, "node_modules/react-dom"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      cssCodeSplit: true,
      minify: "esbuild",
      sourcemap: false,
      target: "es2020",
      /* mapbox-gl is genuinely ~1.7 MB minified — raise limit to suppress noise */
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            /* ── Stable vendor chunks (hash unchanged between feature deploys) ── */
            "vendor-react": ["react", "react-dom"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-router": ["wouter"],
            "vendor-radix": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-popover",
              "@radix-ui/react-label",
              "@radix-ui/react-switch",
              "@radix-ui/react-checkbox",
              "@radix-ui/react-slot",
            ],
            "vendor-charts": ["recharts"],
            /* Leaflet (OSM map) — loaded on all map pages */
            "vendor-map": ["leaflet", "react-leaflet"],
            /* Mapbox GL — only loaded when admin configures Mapbox provider */
            "vendor-mapbox": ["mapbox-gl", "react-map-gl"],
            "vendor-icons": ["lucide-react"],
          },
        },
      },
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      hmr: process.env.REPL_ID ? { clientPort: 443, protocol: "wss" } : undefined,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        "/api": {
          target: `http://localhost:${process.env.API_PORT ?? 5000}`,
          changeOrigin: true,
          ws: false,
        },
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
