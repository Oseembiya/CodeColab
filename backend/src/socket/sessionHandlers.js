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

  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  const WARNING_TIME = 5 * 60 * 1000; // 5 minute warning before end

  // Add a timeout map to track session timers
  const sessionTimeouts = new Map();

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
      userId: userId, // Add userId to data for collaboration tracking
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
      userMetrics.incrementUserSession(userId, sessionId);

      // Track collaborations with other users in the session
      if (participants.length > 1) {
        participants.forEach((participant) => {
          // Skip self-collaboration
          if (participant.userId && participant.userId !== userId) {
            // Track collaboration in both directions
            userMetrics.trackCollaboration(
              userId,
              participant.userId,
              sessionId
            );
            userMetrics.trackCollaboration(
              participant.userId,
              userId,
              sessionId
            );
          }
        });
      }
    }

    console.log(
      `User ${username} joined session ${sessionId}. Total participants: ${participants.length}`
    );

    // Set up the session timer
    const timeoutId = setTimeout(() => {
      // End the session after 30 minutes
      endSession(sessionId);
      io.to(sessionId).emit("session-ended", {
        reason: "Session time limit (30 minutes) reached",
      });
    }, SESSION_DURATION);

    // Store the timeout reference
    sessionTimeouts.set(sessionId, timeoutId);

    // Also set a warning timer
    setTimeout(() => {
      io.to(sessionId).emit("session-ending-soon", {
        timeLeft: WARNING_TIME / 60000, // minutes left
      });
    }, SESSION_DURATION - WARNING_TIME);
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

    // Only log details in debug mode
    if (process.env.LOG_LEVEL === "debug") {
      console.log(
        `Observer ${socket.id} watching ${
          socket.observingSessions.size
        } sessions: ${Array.from(socket.observingSessions).join(", ")}`
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

    // Only log details in debug mode
    if (process.env.LOG_LEVEL === "debug") {
      console.log(
        `Observer ${socket.id} now watching ${socket.observingSessions.size} sessions`
      );
    }
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
      let lineCount = 0;

      // Get session info for tracking initial content counting
      const sessionInfo = sessionStore.getSessionInfo(sessionId) || {};

      if (currentState && currentState.content) {
        // CASE 1: We have existing content - calculate only added lines

        // Get actual content lines (ignoring empty lines)
        const prevLines = currentState.content
          .split("\n")
          .filter((line) => line.trim().length > 0);
        const newLines = content
          .split("\n")
          .filter((line) => line.trim().length > 0);

        // Only count net new meaningful lines added, never deleted ones
        if (newLines.length > prevLines.length) {
          // We actually only want to count one line at a time to avoid double counting
          // This prevents counting +2 when only one line was added
          lineCount = 1;
          console.log(
            `[${sessionId}] Adding 1 line (effective change: ${prevLines.length} → ${newLines.length})`
          );
        } else {
          // Don't count line count decreases or in-place edits
          lineCount = 0;
          console.log(
            `[${sessionId}] No new lines added (${prevLines.length} → ${newLines.length})`
          );
        }
      } else if (content && content.trim().length > 0) {
        // CASE 2: First content for this session

        // Check if we've already counted the initial content for this session
        if (!sessionInfo.initialContentCounted) {
          // Only count non-empty lines
          const lineCountInitial = content
            .split("\n")
            .filter((line) => line.trim().length > 0).length;

          // Mark that we've counted this session's initial content
          sessionStore.updateSessionInfo(sessionId, {
            initialContentCounted: true,
            initialLineCount: lineCountInitial,
          });

          // Set this as the line count
          lineCount = lineCountInitial;
          console.log(
            `[${sessionId}] Initial content counted: ${lineCount} meaningful lines`
          );
        } else {
          // Initial content was already counted, don't count again
          console.log(`[${sessionId}] Ignoring duplicate initial content`);
          lineCount = 0;
        }
      }

      // Update the session state with new content
      sessionStore.updateSessionState(sessionId, {
        content,
        lastEditBy: userId,
      });

      // Broadcast to others in the session
      socket.to(sessionId).emit("code-update", {
        content,
        senderId: userId,
      });

      // Track user metrics - increment lines of code only if we actually added lines
      if (userId && lineCount > 0) {
        console.log(
          `[${sessionId}] Incrementing line count for user ${userId} by ${lineCount}`
        );
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

  // Handle cursor position updates
  const handleCursorPosition = ({ sessionId, userId, position, userName }) => {
    // Broadcast cursor position to all other users in the session
    socket.to(sessionId).emit("cursor-update", {
      userId,
      position,
      userName,
    });

    // Update active time
    if (userId) {
      userMetrics.updateUserActiveTime(userId);
    }
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

  // Debug command for line counts
  const handleDebugLineCount = ({ userId }) => {
    if (!userId) {
      socket.emit("debug-result", { error: "User ID is required" });
      return;
    }

    // Request metrics for the user
    userMetrics
      .getUserMetrics(userId)
      .then((metrics) => {
        // Send debug info to the client
        socket.emit("debug-result", {
          userId,
          metrics: {
            linesOfCode: metrics ? metrics.linesOfCode : 0,
            totalSessions: metrics ? metrics.totalSessions : 0,
            collaborations: metrics ? metrics.collaborations : 0,
            lastActive: metrics ? metrics.lastActive : null,
          },
        });
        console.log(
          `Debug line count for user ${userId}: ${
            metrics ? metrics.linesOfCode : 0
          }`
        );
      })
      .catch((error) => {
        socket.emit("debug-result", { error: error.message });
        console.error(`Debug error for user ${userId}:`, error);
      });
  };

  // Handle session ended event
  const handleSessionEnded = async ({
    sessionId,
    userId,
    totalParticipants,
  }) => {
    if (!sessionId) return;

    console.log(`Session ${sessionId} ended by user ${userId}`);

    // Get all participants in the session before clearing them
    const participants = sessionStore.getSessionUsers(sessionId);

    // Track completed session for the user ending it
    if (userId) {
      userMetrics.trackCompletedSession(userId, sessionId);
    }

    // Track the session as completed for all active participants
    participants.forEach((participant) => {
      if (participant.userId && participant.userId !== userId) {
        userMetrics.trackCompletedSession(participant.userId, sessionId);
      }
    });

    // If totalParticipants was calculated in the frontend and passed,
    // use that value which includes historical participants.
    // Otherwise we'll leave it to Firestore to count from userMetrics
    const participantDetails =
      totalParticipants !== undefined ? { totalParticipants } : {};

    // Clear all participants from the session in the backend store
    sessionStore.clearSessionParticipants(sessionId);

    // Broadcast the session ended event to all participants and observers
    io.to(sessionId)
      .to(`observe:${sessionId}`)
      .emit("session-ended", {
        sessionId,
        endedBy: userId,
        endedAt: new Date().toISOString(),
        participantsCleared: true,
        ...participantDetails,
      });

    // Clear the timeout if session is manually ended
    if (sessionTimeouts.has(sessionId)) {
      clearTimeout(sessionTimeouts.get(sessionId));
      sessionTimeouts.delete(sessionId);
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
  socket.on("cursor-update", handleCursorPosition);
  socket.on("leave-session", handleLeaveSession);
  socket.on("user-left-session", handleUserLeftSession);
  socket.on("session-ended", handleSessionEnded);
  socket.on("request-participant-count", ({ sessionId }) => {
    const participants = sessionStore.getSessionUsers(sessionId);
    socket.emit("participants-update", {
      sessionId,
      participants,
      count: participants.length,
    });
  });
  socket.on("debug-line-count", handleDebugLineCount);

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

// Helper function to end the session
function endSession(sessionId) {
  // Implement session cleanup logic here
  // This should do whatever your existing session end code does
  sessionStore.removeSession(sessionId);

  // Clean up timeout references
  sessionTimeouts.delete(sessionId);
}
