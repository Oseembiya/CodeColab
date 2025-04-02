/**
 * Environment configuration for the frontend
 *
 * This file centralizes all environment variable access and
 * provides defaults when variables are not defined.
 */

// Determine the current environment - always use production settings
const mode = "production";
const isDev = false;
const isProd = true;

// Helper to format URLs consistently
const formatUrl = (url) => {
  if (!url) return "/";
  // Ensure URLs don't have trailing slashes (for consistency)
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

// Production backend URL
const DEFAULT_PROD_BACKEND = "https://codecolab-852p.onrender.com";

// API and connection settings
const config = {
  // Environment info
  env: mode,
  isDevelopment: isDev,
  isProduction: isProd,
  debug: parseInt(import.meta.env.VITE_LOG_LEVEL || "1"),

  // API endpoints
  api: {
    url: formatUrl(
      import.meta.env.VITE_API_URL || `${DEFAULT_PROD_BACKEND}/api`
    ),
    socketUrl: formatUrl(
      import.meta.env.VITE_SOCKET_URL || DEFAULT_PROD_BACKEND
    ),
  },

  // PeerJS configuration
  peer: {
    host: import.meta.env.VITE_PEER_HOST || "codecolab-852p.onrender.com",
    port: parseInt(import.meta.env.VITE_PEER_PORT || "443"),
    path: import.meta.env.VITE_PEER_PATH || "/peerjs",
    secure: true,
    key: import.meta.env.VITE_PEER_KEY || "peerjs",
    debug: parseInt(import.meta.env.VITE_LOG_LEVEL || "1"),
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        // Add TURN servers for better connectivity
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
    },
  },

  // WebRTC configuration
  webrtc: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
      { urls: "stun:global.stun.twilio.com:3478" },
      // Add TURN servers for better connectivity
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:global.turn.twilio.com:3478?transport=tcp",
        username:
          "f4360f30c5b0e9dabcb9e677be77e451205a2cd7e45a899cfa5c2260bf91e028",
        credential: "ZAzzcz9aJLKHbFWPDjnIWWSN+nWF0YJIF4V4hehJzLc=",
      },
    ],
    sdpSemantics: "unified-plan",
    iceTransportPolicy: "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceCandidatePoolSize: 10,
    maxConnections: parseInt(import.meta.env.VITE_MAX_PEER_CONNECTIONS || "10"),
    reconnectionAttempts: parseInt(
      import.meta.env.VITE_MAX_RECONNECTION_ATTEMPTS || "3"
    ),
    reconnectionDelay: parseInt(
      import.meta.env.VITE_RECONNECTION_DELAY || "2000"
    ),
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    videoConstraints: {
      width: { ideal: 320, max: 640 },
      height: { ideal: 240, max: 480 },
      frameRate: { ideal: 24, max: 30 },
    },
  },

  // Socket.io configuration
  socket: {
    reconnectionAttempts: parseInt(
      import.meta.env.VITE_SOCKET_RECONNECTION_ATTEMPTS || "5"
    ),
    reconnectionDelay: parseInt(
      import.meta.env.VITE_SOCKET_RECONNECTION_DELAY || "1000"
    ),
    reconnectionDelayMax: parseInt(
      import.meta.env.VITE_SOCKET_RECONNECTION_DELAY_MAX || "5000"
    ),
  },

  // Firebase configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  },

  // External API configuration
  externalApis: {
    rapidApi: {
      key: import.meta.env.VITE_RAPIDAPI_KEY,
      host: import.meta.env.VITE_RAPIDAPI_HOST,
    },
  },
};

// Validation function to check required configuration
const validateConfig = () => {
  const requiredVars = [
    ["firebase.apiKey", config.firebase.apiKey],
    ["firebase.authDomain", config.firebase.authDomain],
    ["firebase.projectId", config.firebase.projectId],
    ["externalApis.rapidApi.key", config.externalApis.rapidApi.key],
    ["api.url", config.api.url],
  ];

  const missing = requiredVars
    .filter(([_, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
};

// Validate the configuration
validateConfig();

export default config;
