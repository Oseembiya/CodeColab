import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

// Get current directory using import.meta instead of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode from the current directory
  const env = loadEnv(mode, ".");

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:3001",
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on("error", (err, _req, res) => {
              // Handle proxy errors for API - return empty arrays for common endpoints
              console.log("Proxy error:", err);
              const url = _req.url;

              // Make sure res is writable (hasn't been sent yet)
              if (!res.headersSent) {
                // Send a JSON response with appropriate structure based on the endpoint
                res.writeHead(200, { "Content-Type": "application/json" });

                if (url.includes("/api/friends")) {
                  if (url.includes("/requests")) {
                    // Friend requests endpoint
                    res.end(JSON.stringify({ requests: [] }));
                  } else if (url.includes("/search")) {
                    // Search endpoint
                    res.end(JSON.stringify({ users: [] }));
                  } else {
                    // Friends list endpoint
                    res.end(JSON.stringify({ friends: [] }));
                  }
                } else if (url.includes("/api/sessions")) {
                  res.end(JSON.stringify({ sessions: [] }));
                } else if (url.includes("/api/notifications")) {
                  res.end(JSON.stringify({ notifications: [] }));
                } else {
                  // Generic fallback
                  res.end(
                    JSON.stringify({ data: null, error: "Backend unavailable" })
                  );
                }
              }
            });
          },
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
      sourcemap: mode !== "production",
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
          },
        },
      },
    },
  };
});
