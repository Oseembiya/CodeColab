const { db } = require("../../firebaseConfig");
const { doc, updateDoc } = require("firebase/firestore");

// Update user status in Firestore
const updateUserStatus = async (userId, status) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      online: status === "online",
      lastActive: new Date(),
    });
  } catch (error) {
    console.error("Error updating user status:", error);
  }
};

// Notify friends about status change
const notifyFriendsAboutStatus = async (userId, status) => {
  const io = require("../socket").getIO();

  try {
    // Get user's friends list
    const friendsSnapshot = await getFriendsList(userId);

    // Emit status update to each friend
    friendsSnapshot.forEach((friend) => {
      io.to(`user:${friend.friendId}`).emit("friend:status", {
        friendId: userId,
        status,
      });
    });
  } catch (error) {
    console.error("Error notifying friends:", error);
  }
};

module.exports = {
  updateUserStatus,
  notifyFriendsAboutStatus,
};
