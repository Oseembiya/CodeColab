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
          manualChunks: {
            vendor: [
              "react",
              "react-dom",
              "react-router-dom",
              "socket.io-client",
            ],
            firebase: [
              "firebase/app",
              "firebase/auth",
              "firebase/firestore",
              "firebase/storage",
            ],
            // Include sessions-related files in a predictable chunk
            sessions: [
              "./src/pages/liveSession.jsx",
              "./src/components/sessions",
              "./src/contexts/SessionContext.jsx",
            ],
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
