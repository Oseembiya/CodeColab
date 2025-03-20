const express = require("express");
const router = express.Router();
const { db } = require("../../firebaseConfig");
const {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
} = require("firebase/firestore");

/**
 * Get all friends for a user
 * GET /api/friends
 */
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

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
    for (const doc of sentResults.docs) {
      const friendData = doc.data();
      const friendRef = await getDoc(doc.ref);

      // Get the receiver's user data
      const receiverRef = doc(db, "users", friendData.receiverId);
      const receiverDoc = await getDoc(receiverRef);

      if (receiverDoc.exists()) {
        const receiverData = receiverDoc.data();
        friends.push({
          id: doc.id,
          friendId: friendData.receiverId,
          displayName: receiverData.displayName || "User",
          photoURL: receiverData.photoURL || null,
          status: friendData.status,
          createdAt: friendData.createdAt?.toDate() || new Date(),
        });
      }
    }

    // Process friends where user is receiver
    for (const doc of receivedResults.docs) {
      const friendData = doc.data();

      // Get the sender's user data
      const senderRef = doc(db, "users", friendData.senderId);
      const senderDoc = await getDoc(senderRef);

      if (senderDoc.exists()) {
        const senderData = senderDoc.data();
        friends.push({
          id: doc.id,
          friendId: friendData.senderId,
          displayName: senderData.displayName || "User",
          photoURL: senderData.photoURL || null,
          status: friendData.status,
          createdAt: friendData.createdAt?.toDate() || new Date(),
        });
      }
    }

    return res.status(200).json({ friends });
  } catch (error) {
    console.error("Error getting friends:", error);
    return res.status(500).json({ error: "Failed to get friends" });
  }
});

/**
 * Get pending friend requests for a user
 * GET /api/friends/requests
 */
router.get("/requests", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get pending requests where user is the receiver
    const requestsQuery = query(
      collection(db, "friends"),
      where("receiverId", "==", userId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const requestsSnapshot = await getDocs(requestsQuery);
    const requests = [];

    for (const doc of requestsSnapshot.docs) {
      const requestData = doc.data();

      // Get the sender's user data
      const senderRef = doc(db, "users", requestData.senderId);
      const senderDoc = await getDoc(senderRef);

      if (senderDoc.exists()) {
        const senderData = senderDoc.data();
        requests.push({
          id: doc.id,
          senderId: requestData.senderId,
          senderName: senderData.displayName || "User",
          senderPhoto: senderData.photoURL || null,
          status: requestData.status,
          createdAt: requestData.createdAt?.toDate() || new Date(),
        });
      }
    }

    return res.status(200).json({ requests });
  } catch (error) {
    console.error("Error getting friend requests:", error);
    return res.status(500).json({ error: "Failed to get friend requests" });
  }
});

/**
 * Send a friend request
 * POST /api/friends/request
 */
router.post("/request", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({ error: "Sender ID and receiver ID are required" });
    }

    if (senderId === receiverId) {
      return res
        .status(400)
        .json({ error: "Cannot send friend request to yourself" });
    }

    // Check if users exist
    const [senderDoc, receiverDoc] = await Promise.all([
      getDoc(doc(db, "users", senderId)),
      getDoc(doc(db, "users", receiverId)),
    ]);

    if (!senderDoc.exists()) {
      return res.status(404).json({ error: "Sender user not found" });
    }

    if (!receiverDoc.exists()) {
      return res.status(404).json({ error: "Receiver user not found" });
    }

    // Check if a request already exists
    const existingRequestQuery1 = query(
      collection(db, "friends"),
      where("senderId", "==", senderId),
      where("receiverId", "==", receiverId)
    );

    const existingRequestQuery2 = query(
      collection(db, "friends"),
      where("senderId", "==", receiverId),
      where("receiverId", "==", senderId)
    );

    const [results1, results2] = await Promise.all([
      getDocs(existingRequestQuery1),
      getDocs(existingRequestQuery2),
    ]);

    if (!results1.empty || !results2.empty) {
      return res.status(400).json({
        error: "Friend request already exists or users are already friends",
      });
    }

    // Create the friend request
    const friendRequest = {
      senderId,
      receiverId,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const friendRequestRef = await addDoc(
      collection(db, "friends"),
      friendRequest
    );

    // Create a notification for the receiver
    const notification = {
      userId: receiverId,
      type: "friend_request",
      senderId,
      senderName: senderDoc.data().displayName || "A user",
      message: `${
        senderDoc.data().displayName || "A user"
      } sent you a friend request`,
      read: false,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "notifications"), notification);

    return res.status(201).json({
      success: true,
      requestId: friendRequestRef.id,
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return res.status(500).json({ error: "Failed to send friend request" });
  }
});

/**
 * Accept or reject a friend request
 * PUT /api/friends/request/:requestId
 */
router.put("/request/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, userId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: "Request ID is required" });
    }

    if (!status || !["accepted", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Valid status is required (accepted or rejected)" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get the friend request
    const requestRef = doc(db, "friends", requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    const requestData = requestDoc.data();

    // Verify the user is the receiver
    if (requestData.receiverId !== userId) {
      return res.status(403).json({
        error: "Only the receiver can accept or reject a friend request",
      });
    }

    // Update the friend request status
    await updateDoc(requestRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    // If accepted, create a notification for the sender
    if (status === "accepted") {
      const receiverRef = doc(db, "users", requestData.receiverId);
      const receiverDoc = await getDoc(receiverRef);

      const notification = {
        userId: requestData.senderId,
        type: "friend_accepted",
        senderId: requestData.receiverId,
        senderName: receiverDoc.data().displayName || "A user",
        message: `${
          receiverDoc.data().displayName || "A user"
        } accepted your friend request`,
        read: false,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "notifications"), notification);
    }

    return res.status(200).json({ success: true, status });
  } catch (error) {
    console.error("Error processing friend request:", error);
    return res.status(500).json({ error: "Failed to process friend request" });
  }
});

/**
 * Remove a friend
 * DELETE /api/friends/:friendId
 */
router.delete("/:friendId", async (req, res) => {
  try {
    const { friendId } = req.params;
    const { userId } = req.body;

    if (!friendId || !userId) {
      return res
        .status(400)
        .json({ error: "Friend ID and user ID are required" });
    }

    // Find the friendship document
    const query1 = query(
      collection(db, "friends"),
      where("senderId", "==", userId),
      where("receiverId", "==", friendId),
      where("status", "==", "accepted"),
      limit(1)
    );

    const query2 = query(
      collection(db, "friends"),
      where("senderId", "==", friendId),
      where("receiverId", "==", userId),
      where("status", "==", "accepted"),
      limit(1)
    );

    const [results1, results2] = await Promise.all([
      getDocs(query1),
      getDocs(query2),
    ]);

    let friendshipDoc;

    if (!results1.empty) {
      friendshipDoc = results1.docs[0];
    } else if (!results2.empty) {
      friendshipDoc = results2.docs[0];
    } else {
      return res.status(404).json({ error: "Friendship not found" });
    }

    // Delete the friendship
    await deleteDoc(doc(db, "friends", friendshipDoc.id));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error removing friend:", error);
    return res.status(500).json({ error: "Failed to remove friend" });
  }
});

/**
 * Search for users to add as friends
 * GET /api/friends/search
 */
router.get("/search", async (req, res) => {
  try {
    const { query: searchQuery, userId } = req.query;

    if (!searchQuery) {
      return res.status(400).json({ error: "Search query is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users = [];

    // Get current friends and pending requests
    const friendsQuery1 = query(
      collection(db, "friends"),
      where("senderId", "==", userId)
    );

    const friendsQuery2 = query(
      collection(db, "friends"),
      where("receiverId", "==", userId)
    );

    const [friendsResults1, friendsResults2] = await Promise.all([
      getDocs(friendsQuery1),
      getDocs(friendsQuery2),
    ]);

    const friendMap = new Map();

    // Map friends where user is sender
    friendsResults1.docs.forEach((doc) => {
      const data = doc.data();
      friendMap.set(data.receiverId, {
        status: data.status,
        direction: "outgoing",
      });
    });

    // Map friends where user is receiver
    friendsResults2.docs.forEach((doc) => {
      const data = doc.data();
      friendMap.set(data.senderId, {
        status: data.status,
        direction: "incoming",
      });
    });

    // Filter and format users
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Skip current user
      if (userDoc.id === userId) continue;

      // Search by displayName (case insensitive)
      const displayName = userData.displayName || "";
      if (!displayName.toLowerCase().includes(searchQuery.toLowerCase()))
        continue;

      // Add friendship status
      const friendStatus = friendMap.get(userDoc.id) || {
        status: "none",
        direction: null,
      };

      users.push({
        id: userDoc.id,
        displayName: userData.displayName || "User",
        photoURL: userData.photoURL || null,
        email: userData.email || null,
        friendStatus: friendStatus.status,
        requestDirection: friendStatus.direction,
      });
    }

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({ error: "Failed to search users" });
  }
});

module.exports = router;
