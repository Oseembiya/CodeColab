const sessionStore = require("../utils/store");
const sessionHandlers = require("./sessionHandlers");
const videoHandlers = require("./videoHandlers");
const whiteboardHandlers = require("./whiteboardHandlers");

/**
 * Initialize socket.io handlers
 * @param {Server} io - Socket.io server instance
 */
const initializeSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    // Extract client ID from authentication data
    const clientId = socket.handshake.auth.clientId;

    if (clientId) {
      // Check if this client was already connected
      const existingSocket = sessionStore.connectClient(clientId, socket);
      if (existingSocket) {
        existingSocket.disconnect();
        console.log(`Disconnected previous session for client: ${clientId}`);
      }

      // Update the socket's data
      socket.clientId = clientId;
      console.log(`Client connected/reconnected: ${clientId}`);
    } else {
      console.log("Client connected without ID");
    }

    // Initialize all handlers and collect cleanup functions
    const cleanupFunctions = [
      sessionHandlers(io, socket),
      videoHandlers(io, socket),
      whiteboardHandlers(io, socket),
    ];

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      // Run all cleanup functions
      cleanupFunctions.forEach((cleanup) => {
        if (typeof cleanup === "function") {
          cleanup();
        }
      });

      // Clean up client connection
      if (socket.clientId) {
        sessionStore.disconnectClient(socket.clientId);
      }
    });
  });
};

module.exports = initializeSocketHandlers;
