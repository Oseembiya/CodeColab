const { PeerServer } = require("peer");

/**
 * Configure and create PeerJS server
 */
const configurePeerServer = () => {
  const peerServer = PeerServer({
    port: process.env.PEER_PORT || 9000,
    path: process.env.PEER_PATH || "/peerjs",
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
  });

  // PeerJS server events
  peerServer.on("connection", (client) => {
    console.log(
      "PeerJS client connected:",
      client.getId(),
      "at",
      new Date().toISOString()
    );
  });

  peerServer.on("disconnect", (client) => {
    console.log(
      "PeerJS client disconnected:",
      client.getId(),
      "at",
      new Date().toISOString()
    );
  });

  // Error handling
  peerServer.on("error", (error) => {
    console.error(
      "PeerJS server error:",
      error,
      "at",
      new Date().toISOString()
    );
  });

  return peerServer;
};

module.exports = configurePeerServer;
