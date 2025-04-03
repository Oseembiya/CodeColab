const logger = require("../utils/logger");
const sessionStore = require("../utils/store");

/**
 * Initialize video-related socket handlers
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Socket instance
 */
const videoHandlers = (io, socket) => {
  // Handle video call signaling
  socket.on("video-offer", (data) => {
    try {
      const { sessionId, targetUserId, offer } = data;

      if (!sessionId || !targetUserId || !offer) {
        logger.error("Invalid video-offer parameters", data);
        return;
      }

      logger.info(
        `Video offer from ${socket.currentUserId} to ${targetUserId} in session ${sessionId}`
      );

      // Forward the offer to the target user
      io.to(sessionId).emit("video-offer", {
        from: socket.currentUserId,
        offer,
      });
    } catch (error) {
      logger.error("Error in video-offer:", error);
    }
  });

  socket.on("video-answer", (data) => {
    try {
      const { sessionId, targetUserId, answer } = data;

      if (!sessionId || !targetUserId || !answer) {
        logger.error("Invalid video-answer parameters", data);
        return;
      }

      logger.info(
        `Video answer from ${socket.currentUserId} to ${targetUserId} in session ${sessionId}`
      );

      // Forward the answer to the target user
      io.to(sessionId).emit("video-answer", {
        from: socket.currentUserId,
        answer,
      });
    } catch (error) {
      logger.error("Error in video-answer:", error);
    }
  });

  socket.on("ice-candidate", (data) => {
    try {
      const { sessionId, targetUserId, candidate } = data;

      if (!sessionId || !targetUserId || !candidate) {
        logger.error("Invalid ice-candidate parameters", data);
        return;
      }

      // Forward the ICE candidate to the target user
      io.to(sessionId).emit("ice-candidate", {
        from: socket.currentUserId,
        candidate,
      });
    } catch (error) {
      logger.error("Error in ice-candidate:", error);
    }
  });

  // Handle video call state changes
  socket.on("video-call-started", (data) => {
    try {
      const { sessionId, userId } = data;

      if (!sessionId || !userId) {
        logger.error("Invalid video-call-started parameters", data);
        return;
      }

      logger.info(`Video call started by ${userId} in session ${sessionId}`);

      // Update session state
      sessionStore.updateSession(sessionId, {
        hasVideoCall: true,
        videoCallStartedBy: userId,
        videoCallStartedAt: new Date().toISOString(),
      });

      // Notify all users in the session
      io.to(sessionId).emit("video-call-started", {
        startedBy: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error in video-call-started:", error);
    }
  });

  socket.on("video-call-ended", (data) => {
    try {
      const { sessionId, userId } = data;

      if (!sessionId || !userId) {
        logger.error("Invalid video-call-ended parameters", data);
        return;
      }

      logger.info(`Video call ended by ${userId} in session ${sessionId}`);

      // Update session state
      sessionStore.updateSession(sessionId, {
        hasVideoCall: false,
        videoCallEndedBy: userId,
        videoCallEndedAt: new Date().toISOString(),
      });

      // Notify all users in the session
      io.to(sessionId).emit("video-call-ended", {
        endedBy: userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error in video-call-ended:", error);
    }
  });
};

module.exports = videoHandlers;
