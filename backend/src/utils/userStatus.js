const { db } = require("../../firebaseConfig");
const {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} = require("firebase/firestore");
const socketModule = require("../socket");

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

// Get user's friends list
const getFriendsList = async (userId) => {
  try {
    // Get accepted friend requests where user is either sender or receiver
    const friendsQuery1 = query(
      collection(db, "friends"),
      where("senderId", "==", userId),
      where("status", "==", "accepted")
    );

    const friendsQuery2 = query(
      collection(db, "friends"),
      where("receiverId", "==", userId),
      where("status", "==", "accepted")
    );

    const [sentResults, receivedResults] = await Promise.all([
      getDocs(friendsQuery1),
      getDocs(friendsQuery2),
    ]);

    const friends = [];

    // Process friends where user is sender
    sentResults.docs.forEach((doc) => {
      const data = doc.data();
      friends.push({
        id: doc.id,
        friendId: data.receiverId,
        status: "accepted",
      });
    });

    // Process friends where user is receiver
    receivedResults.docs.forEach((doc) => {
      const data = doc.data();
      friends.push({
        id: doc.id,
        friendId: data.senderId,
        status: "accepted",
      });
    });

    return friends;
  } catch (error) {
    console.error("Error getting friends list:", error);
    return [];
  }
};

// Notify friends about status change
const notifyFriendsAboutStatus = async (userId, status) => {
  try {
    // Get the Socket.IO instance safely
    let io;
    try {
      io = socketModule.getIO();
    } catch (error) {
      console.warn(
        "Socket not available for status notification, skipping:",
        error.message
      );
      return; // Exit function early if socket is not available
    }

    // Get user's friends list
    const friendsSnapshot = await getFriendsList(userId);

    if (!friendsSnapshot || friendsSnapshot.length === 0) {
      return; // No friends to notify
    }

    // Emit status update to each friend
    friendsSnapshot.forEach((friend) => {
      if (friend && friend.friendId) {
        io.to(`user:${friend.friendId}`).emit("friend:status", {
          friendId: userId,
          status,
        });
      }
    });
  } catch (error) {
    console.error("Error notifying friends:", error);
  }
};

module.exports = {
  updateUserStatus,
  notifyFriendsAboutStatus,
  getFriendsList,
};
