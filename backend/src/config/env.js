/**
 * Environment configuration loader
 */
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

// Determine environment - default to development
const NODE_ENV = process.env.NODE_ENV || "development";

// Load environment-specific .env file if it exists, fall back to .env
const envFiles = [
  path.resolve(process.cwd(), `.env.${NODE_ENV}`),
  path.resolve(process.cwd(), ".env"),
];

// Load the first env file that exists
for (const file of envFiles) {
  if (fs.existsSync(file)) {
    console.log(`Loading environment from: ${file}`);
    dotenv.config({ path: file });
    break;
  }
}

// Define config object with defaults and environment overrides
const config = {
  // Server configuration
  port: parseInt(process.env.PORT, 10) || 3001,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  peerPort: parseInt(process.env.PEER_PORT, 10) || 9000,
  peerPath: process.env.PEER_PATH || "/peerjs",
  logLevel: parseInt(process.env.LOG_LEVEL, 10) || 1,

  // Server limits
  maxConnections: parseInt(process.env.MAX_CONNECTIONS, 10) || 1000,
  maxParticipantsPerSession:
    parseInt(process.env.MAX_PARTICIPANTS_PER_SESSION, 10) || 20,
  maxActiveSessions: parseInt(process.env.MAX_ACTIVE_SESSIONS, 10) || 100,
  sessionTimeoutHours: parseInt(process.env.SESSION_TIMEOUT_HOURS, 10) || 24,
  cacheDuration: parseInt(process.env.CACHE_DURATION, 10) || 3600000,

  // WebRTC settings
  maxConnectionsPerClient:
    parseInt(process.env.MAX_CONNECTIONS_PER_CLIENT, 10) || 10,
  staleVideoThreshold:
    parseInt(process.env.STALE_VIDEO_THRESHOLD, 10) || 900000,
  videoCleanupInterval:
    parseInt(process.env.VIDEO_CLEANUP_INTERVAL, 10) || 600000,

  // Firebase configuration
  firebase: {
    // Admin SDK
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseUrl: process.env.FIREBASE_DATABASE_URL,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    credentialsFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,

    // Client SDK (for backend use)
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  },

  // Environment info
  env: NODE_ENV,
  isDevelopment: NODE_ENV === "development",
  isProduction: NODE_ENV === "production",
  isTest: NODE_ENV === "test",
};

// Validate required configuration
const validateConfig = () => {
  const requiredVars = [["firebase.projectId", config.firebase.projectId]];

  // At least one Firebase auth method must be configured
  if (
    !config.firebase.credentialsFile &&
    !(config.firebase.clientEmail && config.firebase.privateKey)
  ) {
    throw new Error(
      "Either GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be set"
    );
  }

  for (const [name, value] of requiredVars) {
    if (!value) {
      throw new Error(`Required configuration ${name} is missing`);
    }
  }
};

// Validate on load unless testing
if (NODE_ENV !== "test") {
  validateConfig();
}

module.exports = config;
