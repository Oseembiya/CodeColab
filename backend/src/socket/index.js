const sessionStore = require("../utils/store");
const sessionHandlers = require("./sessionHandlers");
const videoHandlers = require("./videoHandlers");
const whiteboardHandlers = require("./whiteboardHandlers");
const notificationHandlers = require("./notificationHandlers");
const userMetrics = require("../utils/userMetrics");
const { db, admin } = require("../../firebaseConfig");
const logger = require("../utils/logger");
const { validateSession } = require("../controllers/sessionController");
const { updateParticipants } = require("../controllers/userSessionController");
const { addBreadcrumb } = require("../utils/sentry");

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

  // Set up authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get authentication token from handshake
      const token = socket.handshake.auth.token;

      if (!token) {
        logger.warn("Socket connection rejected - no auth token");
        return next(new Error("Authentication error"));
      }

      // Validate token (handled by Firebase client-side)
      // We trust the token from client since Firebase handles auth
      socket.userId = socket.handshake.auth.userId;
      socket.username = socket.handshake.auth.username || "Anonymous";

      logger.info(`Authenticated socket connection for user: ${socket.userId}`);
      next();
    } catch (error) {
      logger.error("Socket authentication error:", error);
      next(new Error("Authentication error"));
    }
  });

  // Track active users and metrics for global stats
  const getGlobalStats = async () => {
    try {
      // Count active users
      const activeUsers = sessionStore.getActiveUsersCount();

      // Get total lines of code from all users
      const userMetricsRef = db.collection("userMetrics");
      const metricsSnapshot = await userMetricsRef.get();

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

  // Handle socket connections
  io.on("connection", (socket) => {
    logger.info(`New socket connection: ${socket.id}`);

    addBreadcrumb({
      category: "socket",
      message: `Socket connected: ${socket.id}`,
      level: "info",
      data: {
        socketId: socket.id,
        userId: socket.userId,
        username: socket.username,
      },
    });

    // Send welcome message to client
    socket.emit("connect_success", {
      message: "Socket connection established",
      socketId: socket.id,
      userId: socket.userId,
    });

    // Add disconnect handler
    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      addBreadcrumb({
        category: "socket",
        message: `Socket disconnected: ${socket.id}`,
        level: "info",
        data: { socketId: socket.id },
      });
    });

    // Session lifecycle events
    socket.on("join-session", async (data) => {
      try {
        const { sessionId, userId, username, photoURL } = data;

        if (!sessionId || !userId) {
          logger.error("Invalid join-session parameters", data);
          socket.emit("error", {
            message: "Invalid session join parameters",
          });
          return;
        }

        logger.info(`User ${userId} joining session ${sessionId}`);

        // Validate session exists and user has access
        const validSession = await validateSession(sessionId, userId);

        if (!validSession) {
          logger.warn(`Session access denied: ${sessionId} for user ${userId}`);
          socket.emit("error", {
            message: "You don't have access to this session",
          });
          return;
        }

        // Join the session room
        socket.join(sessionId);

        // Add user to participants list in database
        await updateParticipants(sessionId, userId, username, photoURL, true);

        // Notify others in the room
        socket.to(sessionId).emit("user-joined", {
          userId,
          username,
          photoURL,
          timestamp: new Date().toISOString(),
        });

        // Confirm join to the user
        socket.emit("joined-session", {
          sessionId,
          message: "Successfully joined session",
        });

        // Attach sessionId to socket for easier reference in other handlers
        socket.sessionId = sessionId;
        socket.currentUserId = userId;
      } catch (error) {
        logger.error("Error in join-session:", error);
        socket.emit("error", {
          message: "Failed to join session",
        });
      }
    });

    socket.on("leave-session", async (data) => {
      try {
        const { sessionId, userId } = data;

        if (!sessionId) {
          logger.warn("Invalid leave-session parameters", data);
          return;
        }

        logger.info(`User ${userId} leaving session ${sessionId}`);

        // Remove from participants list in database
        if (userId) {
          await updateParticipants(sessionId, userId, null, null, false);
        }

        // Leave the socket room
        socket.leave(sessionId);

        // Notify others
        socket.to(sessionId).emit("user-left", {
          userId,
          timestamp: new Date().toISOString(),
        });

        // Clean up session reference
        socket.sessionId = null;
      } catch (error) {
        logger.error("Error in leave-session:", error);
      }
    });

    // Register additional socket handlers
    sessionHandlers(io, socket);
    // videoHandlers(io, socket); // Temporarily disabled for rebuild
    whiteboardHandlers(io, socket);
    notificationHandlers(io, socket);

    // Handle general errors
    socket.on("error", (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
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
