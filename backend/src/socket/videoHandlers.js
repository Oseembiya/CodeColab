const sessionStore = require("../utils/store");

/**
 * Video chat socket event handlers
 */
module.exports = (io, socket) => {
  // Handle joining video chat
  const handleJoinVideo = ({ sessionId, userId, peerId }) => {
    console.log(
      `User ${userId} joined video chat in session ${sessionId} with peer ID ${peerId}`
    );

    // Join the video room
    socket.join(`video-${sessionId}`);

    // Track the participant
    const participants = sessionStore.addVideoParticipant(sessionId, peerId);

    // Store data in socket for later reference
    socket.videoRoomId = sessionId;
    socket.videoPeerId = peerId;
    socket.videoUserId = userId;

    // Notify others in the session about the new participant
    socket.to(`video-${sessionId}`).emit("user-joined", {
      userId,
      peerId,
    });
  };

  // Handle leaving video chat
  const handleLeaveVideo = ({ sessionId, userId, peerId }) => {
    console.log(
      `User ${userId} left video chat in session ${sessionId}${
        peerId ? ` with peerId ${peerId}` : ""
      }`
    );

    // Leave the video room
    socket.leave(`video-${sessionId}`);

    // Notify others that user has left
    io.to(`video-${sessionId}`).emit("user-left", {
      userId,
      peerId: peerId || socket.videoPeerId,
    });

    // Remove from tracking if peerId is provided
    if (peerId || socket.videoPeerId) {
      const peerToRemove = peerId || socket.videoPeerId;
      const participants = sessionStore.removeVideoParticipant(
        sessionId,
        peerToRemove
      );

      console.log(
        `Removed peer ${peerToRemove} from video participants. Remaining: ${participants.length}`
      );
    }

    // Clear video data from socket
    socket.videoRoomId = undefined;
    socket.videoPeerId = undefined;
    socket.videoUserId = undefined;
  };

  // Register event handlers
  socket.on("join-video", handleJoinVideo);
  socket.on("leave-video", handleLeaveVideo);

  // Return cleanup function
  return () => {
    // If socket was in a video room, handle cleanup
    if (socket.videoRoomId) {
      handleLeaveVideo({
        sessionId: socket.videoRoomId,
        userId: socket.videoUserId,
        peerId: socket.videoPeerId,
      });
    }
  };
};
