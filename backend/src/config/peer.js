const { ExpressPeerServer } = require("peer");
const logger = require("../utils/logger");

/**
 * Configure and create PeerJS server
 * @param {object} server - HTTP server instance to attach PeerJS to
 */
const configurePeerServer = (server) => {
  // Log the server object to debug
  logger.info("Configuring PeerJS server with HTTP server");
  console.log("Server object type:", typeof server);
  console.log("Is server defined:", !!server);

  try {
    // Create PeerJS server attached to the existing HTTP server
    const peerServer = ExpressPeerServer(server, {
      path: "/",
      proxied: true,
      allow_discovery: true,
      debug: 3,
      key: "peerjs",
      ssl: true,
      pingInterval: 25000,
      // These options help with stability on Render.com
      alive_timeout: 120000,
      expire_timeout: 120000,
      concurrent_limit: 1000,
      cleanup_out_msgs: 5000,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-Forwarded-For",
        ],
      },
    });

    // Add extra error handling
    peerServer.on("error", (error) => {
      logger.error("PeerJS Server Error:", error);
      console.error("PeerJS Server Error:", error);
    });

    // Add connection logging
    peerServer.on("connection", (client) => {
      const clientId = client.getId();
      logger.info(`PeerJS client connected: ${clientId}`);
      console.log(`PeerJS client connected: ${clientId}`);
    });

    // Add disconnect logging
    peerServer.on("disconnect", (client) => {
      const clientId = client.getId();
      logger.info(`PeerJS client disconnected: ${clientId}`);
      console.log(`PeerJS client disconnected: ${clientId}`);
    });

    // Log success
    logger.info("PeerJS server initialized successfully");
    console.log("PeerJS server initialized successfully");

    return peerServer;
  } catch (error) {
    logger.error("Error initializing PeerJS server:", error);
    console.error("Error initializing PeerJS server:", error);

    // Return null to indicate failure
    return null;
  }
};

module.exports = configurePeerServer;
