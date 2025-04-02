const sessionStore = require("../utils/store");
const logger = require("../utils/logger");

/**
 * Media chat socket event handlers for both audio and video
 * Simplified from previous implementation
 */
module.exports = (io, socket) => {
  // Handle joining media chat (audio or video)
  const handleJoinMedia = ({
    sessionId,
    userId,
    peerId,
    userName,
    mediaType = "video",
  }) => {
    // Media room has format: media-{sessionId}
    const roomId = `media-${sessionId}`;

    // Join the media room
    socket.join(roomId);

    logger.info(
      `User ${
        userName || userId
      } joined ${mediaType} chat in session ${sessionId}`
    );

    // Store user data for this media connection
    const userData = {
      userId,
      userName: userName || userId.substring(0, 6),
      peerId,
      mediaType, // 'audio' or 'video'
      joinedAt: Date.now(),
    };

    // Add participant to session store
    const participants = sessionStore.addMediaParticipant(
      sessionId,
      peerId,
      userData
    );

    // Store data in socket for later reference
    socket.mediaRoomId = sessionId;
    socket.mediaPeerId = peerId;
    socket.mediaUserId = userId;
    socket.mediaUserName = userName;
    socket.mediaType = mediaType;

    // Notify others in the session about the new participant
    socket.to(roomId).emit("participant-joined", {
      userId,
      peerId,
      name: userName || `User-${userId.substring(0, 6)}`,
      mediaType,
      timestamp: new Date().toISOString(),
    });

    // Get existing participants (excluding the current user who just joined)
    const existingParticipants = participants
      .filter((id) => id !== peerId)
      .map((id) => {
        const data = sessionStore.getMediaParticipantData(sessionId, id);
        return {
          peerId: id,
          userId: data?.userId || "",
          name:
            data?.userName ||
            `User-${data?.userId?.substring(0, 6) || "unknown"}`,
          mediaType: data?.mediaType || "unknown",
        };
      });

    // Send list of existing participants to the new user
    if (existingParticipants.length > 0) {
      socket.emit("existing-participants", {
        participants: existingParticipants,
      });
    }

    // Track total participants for metrics
    const totalParticipants = participants.length;
    logger.info(
      `Session ${sessionId} now has ${totalParticipants} media participants`
    );
  };

  // Handle leaving media chat
  const handleLeaveMedia = ({ sessionId, userId, peerId }) => {
    const roomId = `media-${sessionId}`;

    // Use stored values if not provided
    const actualPeerId = peerId || socket.mediaPeerId;
    const actualUserId = userId || socket.mediaUserId;

    if (!sessionId || !actualPeerId) {
      logger.warn("Invalid leave-media parameters", {
        sessionId,
        userId,
        peerId,
      });
      return;
    }

    // Leave the media room
    socket.leave(roomId);

    logger.info(`User ${actualUserId} left media chat in session ${sessionId}`);

    // Notify others that user has left
    socket.to(roomId).emit("participant-left", {
      userId: actualUserId,
      peerId: actualPeerId,
      timestamp: new Date().toISOString(),
    });

    // Remove from tracking store
    sessionStore.removeMediaParticipant(sessionId, actualPeerId);

    // Clear media data from socket
    socket.mediaRoomId = undefined;
    socket.mediaPeerId = undefined;
    socket.mediaUserId = undefined;
    socket.mediaUserName = undefined;
    socket.mediaType = undefined;
  };

  // Handle media state changes (mute/unmute, video on/off)
  const handleMediaStateChange = ({ sessionId, userId, peerId, updates }) => {
    if (!sessionId || !peerId || !updates) {
      logger.warn("Invalid media-state-change parameters");
      return;
    }

    const roomId = `media-${sessionId}`;

    // Update participant data in session store
    sessionStore.updateMediaParticipant(sessionId, peerId, updates);

    // Broadcast changes to all participants in the room
    socket.to(roomId).emit("participant-state-changed", {
      peerId,
      userId,
      updates,
      timestamp: new Date().toISOString(),
    });
  };

  // Register event handlers
  socket.on("join-media", handleJoinMedia);
  socket.on("leave-media", handleLeaveMedia);
  socket.on("media-state-change", handleMediaStateChange);

  // Return cleanup function
  return () => {
    // If socket was in a media room, handle cleanup
    if (socket.mediaRoomId && socket.mediaPeerId) {
      handleLeaveMedia({
        sessionId: socket.mediaRoomId,
        userId: socket.mediaUserId,
        peerId: socket.mediaPeerId,
      });
    }
  };
};
