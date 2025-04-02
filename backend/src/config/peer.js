const { PeerServer } = require("peer");
const logger = require("../utils/logger");

/**
 * Configure and create PeerJS server
 */
const configurePeerServer = () => {
  // Explicitly define the path to avoid any duplication issues
  const peerPath = "/peerjs";

  // For production, always use port 443 which is the standard HTTPS port
  // This helps with firewall traversal issues
  const isProduction = process.env.NODE_ENV === "production";
  const port = isProduction ? 443 : process.env.PEER_PORT || 9000;

  // Log detailed configuration
  logger.info("Configuring PeerJS server with settings:", {
    port: port,
    path: peerPath,
    ssl: true,
    proxied: true,
    allow_discovery: true,
  });

  const peerServer = PeerServer({
    port: port,
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
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "stun:stun.stunprotocol.org:3478" },
        // Public TURN servers - add these for better connectivity
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
        // Add TURN server configuration if available in environment variables
        process.env.TURN_SERVER_URL && {
          urls: process.env.TURN_SERVER_URL,
          username: process.env.TURN_USERNAME || "",
          credential: process.env.TURN_CREDENTIAL || "",
        },
      ].filter(Boolean),
      sdpSemantics: "unified-plan",
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
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
  logger.info(
    `PeerJS server initialized on port ${port} with path ${peerPath}`
  );
  console.log(
    `PeerJS server initialized on port ${port} with path ${peerPath}`
  );

  return peerServer;
};

module.exports = configurePeerServer;
