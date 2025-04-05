const { db } = require("../config/firebase");

// Socket event handlers
const setupSocketHandlers = (io) => {
  // Active users in each session
  const activeUsers = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    let currentSessionId = null;
    let currentUser = null;

    // Handle user authentication and joining session
    socket.on("authenticate", async (data) => {
      try {
        const { sessionId, user } = data;

        if (!sessionId || !user) {
          socket.emit("error", {
            message: "Session ID and user data are required",
          });
          return;
        }

        // Store user data
        currentUser = user;
        currentSessionId = sessionId;

        // Join the session room
        socket.join(sessionId);

        // Add user to active users for this session
        if (!activeUsers.has(sessionId)) {
          activeUsers.set(sessionId, new Map());
        }

        activeUsers.get(sessionId).set(socket.id, {
          id: user.uid,
          name: user.displayName || user.email,
          avatar: user.photoURL,
          socketId: socket.id,
        });

        // Notify all users in the session about the updated user list
        const sessionUsers = Array.from(activeUsers.get(sessionId).values());
        io.to(sessionId).emit("users-update", sessionUsers);

        // Notify the user that they've successfully joined
        socket.emit("joined-session", {
          sessionId,
          users: sessionUsers,
        });

        console.log(`User ${user.uid} joined session ${sessionId}`);
      } catch (error) {
        console.error("Authentication error:", error);
        socket.emit("error", { message: "Failed to authenticate" });
      }
    });

    // Handle code changes
    socket.on("code-change", (data) => {
      if (!currentSessionId) {
        socket.emit("error", { message: "You must join a session first" });
        return;
      }

      // Add user information to the data
      const enrichedData = {
        ...data,
        user: currentUser
          ? {
              id: currentUser.uid,
              name: currentUser.displayName || currentUser.email,
            }
          : null,
      };

      // Broadcast to everyone in the session except the sender
      socket.to(currentSessionId).emit("code-update", enrichedData);

      // Update code in the database (throttled to prevent excessive writes)
      updateSessionCode(currentSessionId, data.code);
    });

    // Handle whiteboard updates
    socket.on("whiteboard-update", (data) => {
      if (!currentSessionId) {
        socket.emit("error", { message: "You must join a session first" });
        return;
      }

      // Add user information to the data
      const enrichedData = {
        ...data,
        user: currentUser
          ? {
              id: currentUser.uid,
              name: currentUser.displayName || currentUser.email,
            }
          : null,
      };

      // Broadcast to everyone in the session except the sender
      socket.to(currentSessionId).emit("whiteboard-update", enrichedData);
    });

    // Handle chat messages
    socket.on("chat-message", (data) => {
      if (!currentSessionId || !currentUser) {
        socket.emit("error", { message: "You must join a session first" });
        return;
      }

      const messageData = {
        text: data.text,
        timestamp: new Date(),
        user: {
          id: currentUser.uid,
          name: currentUser.displayName || currentUser.email,
          avatar: currentUser.photoURL,
        },
      };

      // Broadcast to everyone in the session (including the sender)
      io.to(currentSessionId).emit("chat-message", messageData);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (currentSessionId && activeUsers.has(currentSessionId)) {
        // Remove user from active users
        activeUsers.get(currentSessionId).delete(socket.id);

        // If there are no more users in the session, clean up
        if (activeUsers.get(currentSessionId).size === 0) {
          activeUsers.delete(currentSessionId);
        } else {
          // Notify remaining users
          const sessionUsers = Array.from(
            activeUsers.get(currentSessionId).values()
          );
          io.to(currentSessionId).emit("users-update", sessionUsers);
        }
      }
    });
  });

  // Helper function to update session code in the database (with debounce)
  const sessionUpdateTimers = {};
  const updateSessionCode = (sessionId, code) => {
    // Clear any existing timer for this session
    if (sessionUpdateTimers[sessionId]) {
      clearTimeout(sessionUpdateTimers[sessionId]);
    }

    // Set a new timer to update after 2 seconds of inactivity
    sessionUpdateTimers[sessionId] = setTimeout(async () => {
      try {
        await db.collection("sessions").doc(sessionId).update({
          code,
          updatedAt: new Date(),
        });
        console.log(`Session ${sessionId} code updated in database`);
      } catch (error) {
        console.error(`Failed to update session ${sessionId} code:`, error);
      }
    }, 2000);
  };
};

module.exports = { setupSocketHandlers };
