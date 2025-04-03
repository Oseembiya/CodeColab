/**
 * Environment configuration for the application
 * This file provides environment-specific variables and settings
 */

// Determine the current environment
const isDevelopment = import.meta.env.MODE === "development";
const isProduction = import.meta.env.MODE === "production";
const isTest = import.meta.env.MODE === "test";

// API configuration
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const socketPath = import.meta.env.VITE_SOCKET_PATH || "/socket.io";
const socketReconnectionAttempts = parseInt(
  import.meta.env.VITE_SOCKET_RECONNECTION_ATTEMPTS || "5",
  10
);
const socketReconnectionDelay = parseInt(
  import.meta.env.VITE_SOCKET_RECONNECTION_DELAY || "1000",
  10
);
const socketReconnectionDelayMax = parseInt(
  import.meta.env.VITE_SOCKET_RECONNECTION_DELAY_MAX || "5000",
  10
);

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// PeerJS configuration
const peerConfig = {
  host: import.meta.env.VITE_PEER_HOST || "localhost",
  port: parseInt(import.meta.env.VITE_PEER_PORT || "9000", 10),
  path: import.meta.env.VITE_PEER_PATH || "/peerjs",
  key: import.meta.env.VITE_PEER_KEY || "peerjs",
  url: import.meta.env.VITE_PEER_URL || "http://localhost:9000",
  maxConnections: parseInt(
    import.meta.env.VITE_MAX_PEER_CONNECTIONS || "5",
    10
  ),
  reconnectionAttempts: parseInt(
    import.meta.env.VITE_MAX_RECONNECTION_ATTEMPTS || "5",
    10
  ),
  reconnectionDelay: parseInt(
    import.meta.env.VITE_RECONNECTION_DELAY || "1000",
    10
  ),
};

// TURN server configuration for WebRTC
const turnConfig = {
  url: import.meta.env.VITE_TURN_SERVER_URL,
  username: import.meta.env.VITE_TURN_USERNAME,
  credential: import.meta.env.VITE_TURN_CREDENTIAL,
};

// Judge0 API configuration
const judge0Config = {
  host: import.meta.env.VITE_RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com",
  key: import.meta.env.VITE_RAPIDAPI_KEY,
};

// Logging configuration
const logLevel =
  import.meta.env.VITE_LOG_LEVEL || (isDevelopment ? "debug" : "info");

// Export the configuration
export default {
  isDevelopment,
  isProduction,
  isTest,
  apiUrl,
  socketUrl,
  socketPath,
  socketReconnectionAttempts,
  socketReconnectionDelay,
  socketReconnectionDelayMax,
  firebaseConfig,
  peerConfig,
  turnConfig,
  judge0Config,
  logLevel,
};
