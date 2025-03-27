const sessionStore = require("../utils/store");
const sessionHandlers = require("./sessionHandlers");
const videoHandlers = require("./videoHandlers");
const whiteboardHandlers = require("./whiteboardHandlers");
const notificationHandlers = require("./notificationHandlers");
const userMetrics = require("../utils/userMetrics");
const { db, admin } = require("../../firebaseConfig");
const {
  collection,
  getDocs,
  query,
  doc,
  getDoc,
} = require("firebase/firestore");

// Store the io instance for access from other modules
let ioInstance = null;

/**
 * Get the Socket.IO instance
 * @returns {Server} Socket.IO server instance
 */
const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized yet");
  }
  return ioInstance;
};

/**
 * Initialize socket.io handlers
 * @param {Server} io - Socket.io server instance
 */
const initializeSocketHandlers = (io) => {
  // Store reference to io for other modules to access
  ioInstance = io;

  // Add authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    const clientId = socket.handshake.auth.clientId;

    // Always require clientId
    if (!clientId) {
      return next(new Error("Client ID is required"));
    }

    // If token exists, verify it
    if (token) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        socket.user = decodedToken;
        socket.userId = decodedToken.uid;
        console.log(
          `Authenticated socket connection for user: ${decodedToken.uid}`
        );
      } catch (error) {
        console.error("Socket authentication error:", error.message);
        return next(new Error("Authentication failed: Invalid token"));
      }
    } else {
      console.log("Socket connection without authentication token");
    }

    next();
  });

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
    console.log(`Socket connected: ${socket.id}`);

    // Extract client ID from authentication data
    const clientId = socket.handshake.auth.clientId;
    const userId = socket.userId || socket.handshake.auth.userId;

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

    // Add handler for getting session time info
    socket.on("get-session-time", async ({ sessionId }) => {
      try {
        // Get session data from Firestore
        const sessionRef = doc(db, "sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data();

          // Calculate time left based on the stored scheduledEndTime
          const now = new Date().getTime();
          let timeLeft = 30; // Default 30 minutes
          let extensionsUsed = 0;

          if (sessionData.scheduledEndTime) {
            const endTime = new Date(sessionData.scheduledEndTime).getTime();
            timeLeft = Math.max(0, Math.ceil((endTime - now) / 60000)); // Convert ms to minutes

            // Send server time along with the response for client synchronization
            socket.emit("session-time-info", {
              timeLeft,
              extensionsUsed: sessionData.extensionCount || 0,
              extensionsRemaining: 2 - (sessionData.extensionCount || 0),
              canExtend: (sessionData.extensionCount || 0) < 2,
              serverTime: now,
              scheduledEndTime: endTime,
            });
          } else {
            // If no scheduledEndTime exists yet, use the default
            socket.emit("session-time-info", {
              timeLeft: 30,
              extensionsUsed: 0,
              extensionsRemaining: 2,
              canExtend: true,
              serverTime: now,
              scheduledEndTime: now + 30 * 60 * 1000,
            });
          }
        } else {
          // Session not found, use defaults
          socket.emit("session-time-info", {
            timeLeft: 30,
            extensionsUsed: 0,
            extensionsRemaining: 2,
            canExtend: true,
            serverTime: new Date().getTime(),
            scheduledEndTime: new Date().getTime() + 30 * 60 * 1000,
          });
        }
      } catch (error) {
        console.error(`Error getting session time info:`, error);

        // Even on error, send something back
        socket.emit("session-time-info", {
          timeLeft: 30,
          extensionsUsed: 0,
          extensionsRemaining: 2,
          canExtend: true,
          serverTime: new Date().getTime(),
          scheduledEndTime: new Date().getTime() + 30 * 60 * 1000,
        });
      }
    });

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
      console.log(`Socket disconnected: ${socket.id}`);

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

// Create a single export object with both functions
const socketModule = {
  initializeSocketHandlers,
  getIO,
};

// Export the module
module.exports = socketModule;
