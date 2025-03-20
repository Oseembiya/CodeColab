const sessionStore = require("../utils/store");

/**
 * Session-related socket event handlers
 */
module.exports = (io, socket) => {
  // Handle joining a session
  const handleJoinSession = ({ sessionId, userId, username, photoURL }) => {
    socket.join(sessionId);

    // Add user to session with socket data
    const userData = {
      socketId: socket.id,
      clientId: socket.clientId,
      username: username || "Anonymous",
      photoURL: photoURL || "/default-avatar.png",
      joinedAt: new Date().toISOString(),
    };

    // Add to session and get updated participants list
    const participants = sessionStore.addUserToSession(
      sessionId,
      socket.clientId,
      userData
    );

    // Emit to both participants and observers
    io.to(sessionId).to(`observe:${sessionId}`).emit("participants-update", {
      sessionId,
      participants,
      count: participants.length,
    });

    console.log(
      `User ${username} joined session ${sessionId}. Total participants: ${participants.length}`
    );
  };

  // Handle session observation
  const handleObserveSession = ({ sessionId }) => {
    // Leave any previous observation rooms
    if (socket.observing) {
      socket.leave(`observe:${socket.observing}`);
      sessionStore.removeSessionObserver(socket.observing, socket.id);
    }

    // Join new observation room
    socket.join(`observe:${sessionId}`);
    socket.observing = sessionId;

    // Track observer
    sessionStore.addSessionObserver(sessionId, socket.id);

    // Send initial participant count with consistent format
    const participants = sessionStore.getSessionUsers(sessionId);
    socket.emit("participants-update", {
      sessionId,
      participants,
      count: participants.length,
    });

    console.log(`Observer ${socket.id} watching session ${sessionId}`);
  };

  // Handle observer leaving
  const handleLeaveObserver = ({ sessionId }) => {
    socket.leave(`observe:${sessionId}`);
    sessionStore.removeSessionObserver(sessionId, socket.id);
    socket.observing = null;
    console.log(`Observer ${socket.id} stopped watching session ${sessionId}`);
  };

  // Handle request for initial code
  const handleRequestCode = ({ sessionId }) => {
    const sessionState = sessionStore.getSessionState(sessionId);
    if (sessionState) {
      socket.emit("session-code", {
        content: sessionState.content,
        language: sessionState.language,
      });
    }
  };

  // Optimize code change handling
  const handleCodeChange = ({ sessionId, content, userId }) => {
    // Get current state
    const currentState = sessionStore.getSessionState(sessionId);

    // Only update if content has changed
    if (!currentState || currentState.content !== content) {
      sessionStore.updateSessionState(sessionId, {
        content,
        lastEditBy: userId,
      });

      // Broadcast to others in the session
      socket.to(sessionId).emit("code-update", {
        content,
        senderId: userId,
      });
    }
  };

  // Handle language changes
  const handleLanguageChange = ({ sessionId, newLanguage, userId }) => {
    // Update session state
    sessionStore.updateSessionState(sessionId, {
      language: newLanguage,
    });

    // Broadcast to all clients in the session
    socket.to(sessionId).emit("language-change", {
      newLanguage,
      userId,
    });
  };

  // Handle typing indicators
  const handleTypingStart = ({ sessionId, userId }) => {
    socket.to(sessionId).emit("user-typing", { userId });
  };

  const handleTypingEnd = ({ sessionId, userId }) => {
    socket.to(sessionId).emit("user-stopped-typing", { userId });
  };

  // Handle user leaving session
  const handleLeaveSession = ({ sessionId, userId }) => {
    console.log(`User ${userId} leaving session ${sessionId}`);

    if (!sessionId) return;

    // Remove user and get updated participants list
    const participants = sessionStore.removeUserFromSession(
      sessionId,
      socket.clientId
    );

    if (participants) {
      // Emit updated participants list to all clients including observers
      io.to(sessionId).to(`observe:${sessionId}`).emit("participants-update", {
        sessionId,
        participants,
        count: participants.length,
      });

      console.log(
        `User left session ${sessionId}. Remaining participants: ${participants.length}`
      );
    }
  };

  // Handle user left session
  const handleUserLeftSession = ({ sessionId }) => {
    if (!sessionId) return;

    // Remove user and get updated participants list
    const participants = sessionStore.removeUserFromSession(
      sessionId,
      socket.clientId
    );

    if (participants) {
      // Emit updated participants list to all clients
      io.to(sessionId).to(`observe:${sessionId}`).emit("participants-update", {
        sessionId,
        participants,
        count: participants.length,
      });

      console.log(
        `User left session ${sessionId}. Remaining participants: ${participants.length}`
      );
    }
  };

  // Register event handlers
  socket.on("join-session", handleJoinSession);
  socket.on("observe-session", handleObserveSession);
  socket.on("leave-observer", handleLeaveObserver);
  socket.on("request-code", handleRequestCode);
  socket.on("code-change", handleCodeChange);
  socket.on("language-change", handleLanguageChange);
  socket.on("typing-start", handleTypingStart);
  socket.on("typing-end", handleTypingEnd);
  socket.on("leave-session", handleLeaveSession);
  socket.on("user-left-session", handleUserLeftSession);
  socket.on("request-participant-count", ({ sessionId }) => {
    const participants = sessionStore.getSessionUsers(sessionId);
    socket.emit("participants-update", {
      sessionId,
      participants,
      count: participants.length,
    });
  });

  // Handle cleanup when socket disconnects
  return () => {
    // Clean up observer tracking
    if (socket.observing) {
      sessionStore.removeSessionObserver(socket.observing, socket.id);
    }

    // Check all active sessions for this user
    const activeSessions = sessionStore.activeSessions;
    activeSessions.forEach((users, sessionId) => {
      const userRemoved = sessionStore.removeUserFromSession(
        sessionId,
        socket.clientId
      );

      if (userRemoved) {
        // Get updated participants list
        const participants = sessionStore.getSessionUsers(sessionId);

        // Emit update
        io.to(sessionId)
          .to(`observe:${sessionId}`)
          .emit("participants-update", {
            sessionId,
            participants,
            count: participants.length,
          });

        console.log(
          `User disconnected from session ${sessionId}. Remaining participants: ${participants.length}`
        );
      }
    });
  };

  // When user connects
  socket.on("connect", (userId) => {
    // Update user status to online
    updateUserStatus(userId, "online");

    // Join a room with this user's ID to receive updates
    socket.join(`user:${userId}`);

    // Notify friends about online status
    notifyFriendsAboutStatus(userId, "online");
  });

  // When user disconnects
  socket.on("disconnect", () => {
    if (socket.userId) {
      updateUserStatus(socket.userId, "offline");
      notifyFriendsAboutStatus(socket.userId, "offline");
    }
  });
};
