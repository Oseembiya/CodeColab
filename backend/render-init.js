/**
 * Render initialization script
 * This script runs before the server starts and sets up the needed files and configurations
 */
const path = require("path");
const fs = require("fs");

console.log("Backend initialization script running...");

// Set Socket.io environment variables for better compatibility with Render
process.env.SOCKET_TRANSPORTS = "polling,websocket";
process.env.SOCKET_CORS_ORIGIN = "https://codekolab.netlify.app";
console.log("Set Socket.io environment variables for Render compatibility");

// Set PeerJS configuration for Render environment
process.env.PEER_DEBUG = "3";
process.env.PEER_ALLOW_DISCOVERY = "true";
process.env.PEER_KEY = "peerjs";
process.env.PEER_HOST = "codecolab-852p.onrender.com";
process.env.PEER_PORT = "443";
process.env.PEER_PATH = "/peerjs";
process.env.PEER_PING_INTERVAL = "25000";
console.log("Set PeerJS environment variables for Render compatibility");

// Verify the peer.js module is available
try {
  const peerModule = require("peer");
  console.log("PeerJS module found:", !!peerModule);
  console.log("PeerJS version:", require("peer/package.json").version);
} catch (error) {
  console.error("PeerJS module not found or error loading it:", error.message);
}

// Create a credentials file from the environment variable if it exists
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    console.log(
      "Writing Firebase credentials from environment variable to file..."
    );

    // Parse to verify it's valid JSON
    const credentials = JSON.parse(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    );

    // Write to file
    const credentialsPath = path.join(__dirname, "firebase-credentials.json");
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

    // Set the credentials file path
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

    console.log(`Firebase credentials written to ${credentialsPath}`);
  } catch (error) {
    console.error("Error writing Firebase credentials:", error.message);
  }
} else {
  console.log(
    "No GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable found."
  );
}

// Log environment for debugging
console.log(`NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
console.log(`Production mode: ${process.env.NODE_ENV === "production"}`);

console.log("Initialization completed, server will start normally.");

// No need to export anything
