const sessionStore = require("../utils/store");
const sessionHandlers = require("./sessionHandlers");
const videoHandlers = require("./videoHandlers");
const whiteboardHandlers = require("./whiteboardHandlers");
const notificationHandlers = require("./notificationHandlers");
const userMetrics = require("../utils/userMetrics");
const { db } = require("../../firebaseConfig");
const { collection, getDocs, query } = require("firebase/firestore");

/**
 * Initialize socket.io handlers
 * @param {Server} io - Socket.io server instance
 */
const initializeSocketHandlers = (io) => {
  // Track active users and metrics for global stats
  const getGlobalStats = async () => {
    try {
      // Count active users
      const activeUsers = sessionStore.getActiveUsersCount();

      // Get total lines of code from all users
      const userMetricsRef = collection(db, "userMetrics");
      const metricsSnapshot = await getDocs(query(userMetricsRef));

      let totalLinesOfCode = 0;
      metricsSnapshot.forEach((doc) => {
        const data = doc.data();
        totalLinesOfCode += data.linesOfCode || 0;
      });

      return {
        activeUsers,
        totalLinesOfCode,
      };
    } catch (error) {
      console.error("Error getting global stats:", error);
      return {
        activeUsers: 0,
        totalLinesOfCode: 0,
      };
    }
  };

  io.on("connection", (socket) => {
    // Extract client ID from authentication data
    const clientId = socket.handshake.auth.clientId;
    const userId = socket.handshake.auth.userId;

    // Store userId on socket for metrics tracking
    if (userId) {
      socket.userId = userId;
    }

    if (clientId) {
      // Check if this client was already connected
      const existingSocket = sessionStore.connectClient(clientId, socket);
      if (existingSocket) {
        existingSocket.disconnect();
      }

      // Update the socket's data
      socket.clientId = clientId;
    }

    // Handle global stats request
    socket.on("request-global-stats", async () => {
      const stats = await getGlobalStats();
      socket.emit("global-stats", stats);
    });

    // Initialize all handlers and collect cleanup functions
    const cleanupFunctions = [
      sessionHandlers(io, socket),
      videoHandlers(io, socket),
      whiteboardHandlers(io, socket),
      notificationHandlers(io, socket),
    ];

    // Handle disconnection
    socket.on("disconnect", () => {
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

  // Broadcast global stats periodically (every 30 seconds)
  setInterval(async () => {
    const stats = await getGlobalStats();
    io.emit("global-stats", stats);
  }, 30000);
};

module.exports = initializeSocketHandlers;
