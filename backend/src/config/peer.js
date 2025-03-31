const { PeerServer } = require("peer");
const logger = require("../utils/logger");

/**
 * Configure and create PeerJS server
 */
const configurePeerServer = () => {
  // Log detailed configuration
  logger.info("Configuring PeerJS server with settings:", {
    port: process.env.PEER_PORT || 9000,
    path: "/peerjs",
    ssl: true,
    proxied: true,
  });

  const peerServer = PeerServer({
    port: process.env.PEER_PORT || 9000,
    path: "/peerjs",
    proxied: true,
    allow_discovery: true,
    cleanup_out_msgs: 1000,
    alive_timeout: 60000,
    key: "peerjs",
    ssl: true, // Always enable SSL for production
    concurrent_limit: 5000,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "stun:stun.stunprotocol.org:3478" },
        // Add TURN server configuration if available in environment variables
        process.env.TURN_SERVER_URL && {
          urls: process.env.TURN_SERVER_URL,
          username: process.env.TURN_USERNAME || "",
          credential: process.env.TURN_CREDENTIAL || "",
        },
      ].filter(Boolean), // Filter out undefined entries
    },
    debug: 3, // Enable more verbose debugging
  });

  // PeerJS server events
  peerServer.on("connection", (client) => {
    const clientId = client.getId();
    const timestamp = new Date().toISOString();
    logger.info(`PeerJS client connected: ${clientId} at ${timestamp}`);
    console.log(`PeerJS client connected: ${clientId} at ${timestamp}`);
  });

  peerServer.on("disconnect", (client) => {
    const clientId = client.getId();
    const timestamp = new Date().toISOString();
    logger.info(`PeerJS client disconnected: ${clientId} at ${timestamp}`);
    console.log(`PeerJS client disconnected: ${clientId} at ${timestamp}`);
  });

  // Error handling
  peerServer.on("error", (error) => {
    const timestamp = new Date().toISOString();
    logger.error(`PeerJS server error at ${timestamp}:`, error);
    console.error(`PeerJS server error at ${timestamp}:`, error);
  });

  // Log a success message
  logger.info(
    `PeerJS server initialized on port ${
      process.env.PEER_PORT || 9000
    } with path /peerjs`
  );
  console.log(
    `PeerJS server initialized on port ${
      process.env.PEER_PORT || 9000
    } with path /peerjs`
  );

  return peerServer;
};

module.exports = configurePeerServer;
