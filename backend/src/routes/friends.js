const express = require("express");
const router = express.Router();
const { db, admin } = require("../../firebaseConfig");

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
    const friendsQuery1 = db
      .collection("friends")
      .where("senderId", "==", userId)
      .where("status", "==", "accepted");

    const friendsQuery2 = db
      .collection("friends")
      .where("receiverId", "==", userId)
      .where("status", "==", "accepted");

    const [sentResults, receivedResults] = await Promise.all([
      friendsQuery1.get(),
      friendsQuery2.get(),
    ]);

    const friends = [];

    // Process friends where user is sender
    for (const docSnapshot of sentResults.docs) {
      const friendData = docSnapshot.data();
      const friendRef = docSnapshot.ref;

      // Get the receiver's user data
      const receiverRef = db.collection("users").doc(friendData.receiverId);
      const receiverDoc = await receiverRef.get();

      if (receiverDoc.exists) {
        const receiverData = receiverDoc.data();
        friends.push({
          id: docSnapshot.id,
          friendId: friendData.receiverId,
          displayName: receiverData.displayName || "User",
          photoURL: receiverData.photoURL || null,
          status: friendData.status,
          createdAt: friendData.createdAt?.toDate() || new Date(),
        });
      }
    }

    // Process friends where user is receiver
    for (const docSnapshot of receivedResults.docs) {
      const friendData = docSnapshot.data();

      // Get the sender's user data
      const senderRef = db.collection("users").doc(friendData.senderId);
      const senderDoc = await senderRef.get();

      if (senderDoc.exists) {
        const senderData = senderDoc.data();
        friends.push({
          id: docSnapshot.id,
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
    const requestsQuery = db
      .collection("friends")
      .where("receiverId", "==", userId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc");

    const requestsSnapshot = await requestsQuery.get();
    const requests = [];

    for (const docSnapshot of requestsSnapshot.docs) {
      const requestData = docSnapshot.data();

      // Get the sender's user data
      const senderRef = db.collection("users").doc(requestData.senderId);
      const senderDoc = await senderRef.get();

      if (senderDoc.exists) {
        const senderData = senderDoc.data();
        requests.push({
          id: docSnapshot.id,
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
      db.collection("users").doc(senderId).get(),
      db.collection("users").doc(receiverId).get(),
    ]);

    if (!senderDoc.exists) {
      return res.status(404).json({ error: "Sender user not found" });
    }

    if (!receiverDoc.exists) {
      return res.status(404).json({ error: "Receiver user not found" });
    }

    // Check if a request already exists
    const existingRequestQuery1 = db
      .collection("friends")
      .where("senderId", "==", senderId)
      .where("receiverId", "==", receiverId);

    const existingRequestQuery2 = db
      .collection("friends")
      .where("senderId", "==", receiverId)
      .where("receiverId", "==", senderId);

    const [results1, results2] = await Promise.all([
      existingRequestQuery1.get(),
      existingRequestQuery2.get(),
    ]);

    // Check if there's an active (pending or accepted) friend request
    let hasActiveRequest = false;
    let rejectedRequestId = null;

    // Check first direction (sender -> receiver)
    if (!results1.empty) {
      const request = results1.docs[0].data();
      if (request.status === "pending" || request.status === "accepted") {
        hasActiveRequest = true;
      } else if (request.status === "rejected") {
        // Store the rejected request ID to potentially update it
        rejectedRequestId = results1.docs[0].id;
      }
    }

    // Check second direction (receiver -> sender)
    if (!results2.empty && !hasActiveRequest) {
      const request = results2.docs[0].data();
      if (request.status === "pending" || request.status === "accepted") {
        hasActiveRequest = true;
      }
      // We don't update rejected requests in the opposite direction
    }

    // Only block if there's an active request
    if (hasActiveRequest) {
      return res.status(400).json({
        error: "Friend request already exists or users are already friends",
      });
    }

    // If there was a rejected request, update it instead of creating a new one
    if (rejectedRequestId) {
      const requestRef = db.collection("friends").doc(rejectedRequestId);

      await requestRef.update({
        status: "pending",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("notifications").add(notification);

      return res.status(201).json({
        success: true,
        requestId: rejectedRequestId,
      });
    }

    // Create a new friend request if there's no existing one
    const friendRequest = {
      senderId,
      receiverId,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const friendRequestRef = await db.collection("friends").add(friendRequest);

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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("notifications").add(notification);

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
    const requestRef = db.collection("friends").doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
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
    await requestRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // If accepted, create a notification for the sender
    if (status === "accepted") {
      const receiverRef = db.collection("users").doc(requestData.receiverId);
      const receiverDoc = await receiverRef.get();

      const notification = {
        userId: requestData.senderId,
        type: "friend_accepted",
        senderId: requestData.receiverId,
        senderName: receiverDoc.data().displayName || "A user",
        message: `${
          receiverDoc.data().displayName || "A user"
        } accepted your friend request`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("notifications").add(notification);
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
    const query1 = db
      .collection("friends")
      .where("senderId", "==", userId)
      .where("receiverId", "==", friendId)
      .where("status", "==", "accepted")
      .limit(1);

    const query2 = db
      .collection("friends")
      .where("senderId", "==", friendId)
      .where("receiverId", "==", userId)
      .where("status", "==", "accepted")
      .limit(1);

    const [results1, results2] = await Promise.all([
      query1.get(),
      query2.get(),
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
    await friendshipDoc.ref.delete();

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
    const usersSnapshot = await db.collection("users").get();
    const users = [];

    // Get current friends and pending requests
    const friendsQuery1 = db
      .collection("friends")
      .where("senderId", "==", userId);

    const friendsQuery2 = db
      .collection("friends")
      .where("receiverId", "==", userId);

    const [friendsResults1, friendsResults2] = await Promise.all([
      friendsQuery1.get(),
      friendsQuery2.get(),
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
