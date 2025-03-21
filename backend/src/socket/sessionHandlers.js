const sessionStore = require("../utils/store");
const userMetrics = require("../utils/userMetrics");

/**
 * Session-related socket event handlers
 */
module.exports = (io, socket) => {
  // Track sessions this socket is observing
  if (!socket.observingSessions) {
    socket.observingSessions = new Set();
  }

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

    // Track user metrics - increment session count
    if (userId) {
      userMetrics.incrementUserSession(userId);
    }

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

    // Add to the set of sessions this socket is observing
    socket.observingSessions.add(sessionId);

    // Send initial participant count with consistent format
    const participants = sessionStore.getSessionUsers(sessionId);
    socket.emit("participants-update", {
      sessionId,
      participants,
      count: participants.length,
    });

    // Log more efficiently
    const observingCount = socket.observingSessions.size;
    console.log(
      `Observer ${socket.id} watching ${observingCount} ${
        observingCount === 1 ? "session" : "sessions"
      }`
    );

    // Only log details in debug mode
    if (process.env.LOG_LEVEL === "debug") {
      console.log(
        `Observer ${socket.id} sessions: ${Array.from(
          socket.observingSessions
        ).join(", ")}`
      );
    }
  };

  // Handle observer leaving
  const handleLeaveObserver = ({ sessionId }) => {
    socket.leave(`observe:${sessionId}`);
    sessionStore.removeSessionObserver(sessionId, socket.id);
    socket.observing = null;

    // Remove from tracking set
    socket.observingSessions.delete(sessionId);

    // Log more efficiently
    const observingCount = socket.observingSessions.size;
    console.log(
      `Observer ${socket.id} now watching ${observingCount} ${
        observingCount === 1 ? "session" : "sessions"
      }`
    );
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
      // Calculate line count changes for metrics
      let lineCount = 1; // Default to 1 line
      if (currentState && currentState.content) {
        const prevLineCount = currentState.content.split("\n").length;
        const newLineCount = content.split("\n").length;
        // Calculate the absolute difference in lines
        lineCount = Math.abs(newLineCount - prevLineCount);
        lineCount = Math.max(1, lineCount); // At least 1 line
      }

      sessionStore.updateSessionState(sessionId, {
        content,
        lastEditBy: userId,
      });

      // Broadcast to others in the session
      socket.to(sessionId).emit("code-update", {
        content,
        senderId: userId,
      });

      // Track user metrics - increment lines of code
      if (userId) {
        userMetrics.incrementLinesOfCode(userId, lineCount);
        // Update active time
        userMetrics.updateUserActiveTime(userId);
      }
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
    socket.to(sessionId).emit("typing-start", { userId });

    // Update active time
    if (userId) {
      userMetrics.updateUserActiveTime(userId);
    }
  };

  const handleTypingEnd = ({ sessionId, userId }) => {
    socket.to(sessionId).emit("typing-end", { userId });
  };

  // Handle leaving a session
  const handleLeaveSession = ({ sessionId, userId }) => {
    socket.leave(sessionId);
    const participants = sessionStore.removeUserFromSession(
      sessionId,
      socket.clientId
    );

    // Check if participants is null or undefined before accessing length
    if (participants) {
      // Emit to both participants and observers
      io.to(sessionId).to(`observe:${sessionId}`).emit("participants-update", {
        sessionId,
        participants,
        count: participants.length,
      });

      // Final update of active time when leaving session
      if (userId) {
        userMetrics.updateUserActiveTime(userId);
      }

      console.log(
        `User left session ${sessionId}. Remaining participants: ${participants.length}`
      );
    } else {
      console.log(
        `User left session ${sessionId}. No participants remaining or session not found.`
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
  const cleanup = () => {
    // Update all session metrics on disconnect
    if (socket.clientId) {
      // If the user was in any session update their active time
      const userId = socket.userId; // Assuming we store userId on socket
      if (userId) {
        userMetrics.updateUserActiveTime(userId);
      }
    }

    // Clean up existing code
    socket.observingSessions.forEach((observedSessionId) => {
      socket.leave(`observe:${observedSessionId}`);
      sessionStore.removeSessionObserver(observedSessionId, socket.id);
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

  return cleanup;
};
