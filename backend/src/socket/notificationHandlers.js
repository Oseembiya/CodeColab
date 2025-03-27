const { db } = require("../../firebaseConfig");
// Remove client SDK imports
// const { collection, addDoc, serverTimestamp } = require("firebase/firestore");

module.exports = (io, socket) => {
  // Send notification to specific user
  const sendNotification = async (notification) => {
    try {
      // Store in Firestore using admin SDK
      const notificationRef = await db.collection("notifications").add({
        ...notification,
        createdAt: new Date(), // Admin SDK uses regular Date objects
        read: false,
      });

      // Emit to connected clients
      io.to(`user:${notification.userId}`).emit("new-notification", {
        id: notificationRef.id,
        ...notification,
        createdAt: new Date(),
        read: false,
      });

      console.log(`Notification sent to user ${notification.userId}`);
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Register event handlers
  socket.on("send-notification", sendNotification);

  // No special cleanup needed for this handler
  return () => {
    // If any cleanup is needed
  };
};
