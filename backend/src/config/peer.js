const { ExpressPeerServer } = require("peer");
const logger = require("../utils/logger");

/**
 * Configure and create PeerJS server
 * @param {object} server - HTTP server instance to attach PeerJS to
 */
const configurePeerServer = (server) => {
  // Explicitly define the path to avoid any duplication issues
  const peerPath = "/peerjs";

  // Log detailed configuration
  logger.info("Configuring PeerJS server with settings:", {
    path: peerPath,
    proxied: true,
    allow_discovery: true,
  });

  // Create PeerJS server attached to the existing HTTP server
  const peerServer = ExpressPeerServer(server, {
    path: peerPath,
    proxied: true,
    allow_discovery: true,
    cleanup_out_msgs: 1000,
    alive_timeout: 60000,
    key: "peerjs",
    ssl: true,
    concurrent_limit: 5000,
    expire_timeout: 90000,
    ping_interval: 20000,
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
    debug: 3,
  });

  // PeerJS server events
  peerServer.on("connection", (client) => {
    const clientId = client.getId();
    const timestamp = new Date().toISOString();
    const clientIp = client._socket?.handshake?.address || "unknown";
    const clientHeaders = client._socket?.handshake?.headers || {};
    const clientUrl = clientHeaders.origin || "unknown";

    logger.info(`PeerJS client connected: ${clientId} at ${timestamp}`, {
      clientId,
      clientIp,
      clientUrl,
      headers: JSON.stringify(clientHeaders),
    });
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
  logger.info(`PeerJS server initialized with path ${peerPath}`);
  console.log(`PeerJS server initialized with path ${peerPath}`);

  return peerServer;
};

module.exports = configurePeerServer;
