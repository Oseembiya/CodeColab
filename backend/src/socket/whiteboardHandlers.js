const sessionStore = require("../utils/store");

/**
 * Whiteboard socket event handlers
 */
module.exports = (io, socket) => {
  // Handle whiteboard join events
  const handleWhiteboardJoin = ({ sessionId, userId }) => {
    // Join the whiteboard room
    socket.join(`whiteboard:${sessionId}`);

    // Store for cleanup
    socket.whiteboardSessionId = sessionId;

    // Send current whiteboard state if it exists
    const canvasData = sessionStore.getWhiteboardState(sessionId);
    if (canvasData) {
      socket.emit("whiteboard-state", { canvasData });
    }

    console.log(`User ${userId} joined whiteboard in session ${sessionId}`);
  };

  // Handle whiteboard draw events
  const handleWhiteboardDraw = ({ sessionId, userId, objects }) => {
    // Broadcast to all users in the session except sender
    socket.to(`whiteboard:${sessionId}`).emit("whiteboard-draw", {
      userId,
      objects,
    });

    console.log(`User ${userId} drew in whiteboard in session ${sessionId}`);
  };

  // Handle whiteboard clear events
  const handleWhiteboardClear = ({ sessionId }) => {
    // Clear the saved state
    sessionStore.updateWhiteboardState(sessionId, null);

    // Broadcast to all users in the session except sender
    socket.to(`whiteboard:${sessionId}`).emit("whiteboard-clear");

    console.log(`Whiteboard cleared in session ${sessionId}`);
  };

  // Handle full whiteboard updates
  const handleWhiteboardUpdate = ({ sessionId, userId, canvasData }) => {
    // Save the updated state
    sessionStore.updateWhiteboardState(sessionId, canvasData);

    // No need to broadcast here as individual draw events are already sent
    console.log(`Whiteboard state updated in session ${sessionId}`);
  };

  // Register event handlers
  socket.on("whiteboard-join", handleWhiteboardJoin);
  socket.on("whiteboard-draw", handleWhiteboardDraw);
  socket.on("whiteboard-clear", handleWhiteboardClear);
  socket.on("whiteboard-update", handleWhiteboardUpdate);

  // Return cleanup function
  return () => {
    // Nothing specific to clean up for whiteboard
    // Room membership is automatically removed when socket disconnects
  };
};
