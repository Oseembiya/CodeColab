import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

// Get current directory using import.meta instead of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Force production mode
  mode = "production";

  // Load env file based on mode from the current directory
  const env = loadEnv(mode, ".");

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      headers: {
        "Cross-Origin-Opener-Policy": "unsafe-none",
      },
      proxy: {
        "/api": {
          target: "https://codecolab-852p.onrender.com",
          changeOrigin: true,
          secure: true,
        },
        "/peerjs": {
          target: "https://codecolab-852p.onrender.com",
          changeOrigin: true,
          secure: true,
          ws: true,
        },
        "^/judge0.*": {
          target: "https://judge0-ce.p.rapidapi.com",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/judge0/, ""),
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false, // Disable sourcemaps in production
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Base modules that should always be in the main chunk
            if (id.includes("node_modules")) {
              if (
                id.includes("react") ||
                id.includes("react-dom") ||
                id.includes("react-router-dom") ||
                id.includes("socket.io-client")
              ) {
                return "vendor";
              }

              if (id.includes("firebase")) {
                return "firebase";
              }

              return "vendor-deps";
            }

            // Core app modules
            if (
              id.includes("/src/App.jsx") ||
              id.includes("/src/pages/protectedRoute.jsx") ||
              id.includes("/src/error/ErrorBoundary.jsx") ||
              id.includes("/src/components/layouts/mainContent.jsx")
            ) {
              return "core";
            }

            // Sessions related modules
            if (
              id.includes("/src/pages/liveSession.jsx") ||
              id.includes("/src/pages/sessions.jsx") ||
              id.includes("/src/components/sessions/") ||
              id.includes("/src/contexts/SessionContext.jsx")
            ) {
              return "sessions";
            }

            // Editor related modules
            if (id.includes("/src/components/editor/")) {
              return "editor";
            }

            // Communication related modules
            if (id.includes("/src/components/communications/")) {
              return "communications";
            }

            // Default is to include in index.js
            return "index";
          },
          // Remove the timestamp to make chunk names stable between deployments
          chunkFileNames: `assets/[name]-[hash].js`,
          entryFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`,
        },
      },
    },
  };
});
