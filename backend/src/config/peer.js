const { PeerServer } = require("peer");

/**
 * Configure and create PeerJS server
 */
const configurePeerServer = () => {
  const peerServer = PeerServer({
    port: process.env.PEER_PORT || 9000,
    path: "/myapp",
    proxied: true,
    allow_discovery: true,
    cleanup_out_msgs: 1000,
    alive_timeout: 60000,
    key: "peerjs",
    ssl: false,
    concurrent_limit: 5000,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // PeerJS server events
  peerServer.on("connection", (client) => {
    console.log("PeerJS client connected:", client.getId());
  });

  peerServer.on("disconnect", (client) => {
    console.log("PeerJS client disconnected:", client.getId());
  });

  // Error handling
  peerServer.on("error", (error) => {
    console.error("PeerJS server error:", error);
  });

  return peerServer;
};

module.exports = configurePeerServer;
