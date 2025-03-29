/**
 * Service for handling friend-related API requests
 */
import { createApiClient } from "./api";
import { auth } from "../firebaseConfig";
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";

// Create an authenticated API client
const getApiClient = async () => {
  const getToken = async () => {
    try {
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken(true);
      }
      return null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  };

  return createApiClient(getToken);
};

/**
 * Get all friends for the current user
 * @param {string} userId - Current user ID
 * @returns {Promise} - Promise that resolves to a list of friends
 */
export const getFriends = async (userId) => {
  try {
    const api = await getApiClient();
    const data = await api.get(`/api/friends?userId=${userId}`);
    return data;
  } catch (error) {
    console.error("Error getting friends:", error);
    throw error;
  }
};

/**
 * Get pending friend requests for the current user
 * @param {string} userId - Current user ID
 * @returns {Promise} - Promise that resolves to a list of friend requests
 */
export const getFriendRequests = async (userId) => {
  try {
    const api = await getApiClient();
    const data = await api.get(`/api/friends/requests?userId=${userId}`);
    return data;
  } catch (error) {
    console.error("Error getting friend requests:", error);
    throw error;
  }
};

/**
 * Send a friend request
 * @param {string} senderId - Current user ID
 * @param {string} receiverId - User ID to send request to
 * @returns {Promise} - Promise that resolves to success message
 */
export const sendFriendRequest = async (senderId, receiverId) => {
  try {
    const api = await getApiClient();
    const data = await api.post("/api/friends/request", {
      senderId,
      receiverId,
    });
    return data;
  } catch (error) {
    // Don't log "already exists" as an error - it's an expected case
    if (!(error.message && error.message.includes("already exists"))) {
      console.error("Error sending friend request:", error);
    }
    throw error;
  }
};

/**
 * Accept or reject a friend request
 * @param {string} requestId - Friend request ID
 * @param {string} status - 'accepted' or 'rejected'
 * @param {string} userId - Current user ID
 * @returns {Promise} - Promise that resolves to success message
 */
export const respondToFriendRequest = async (requestId, status, userId) => {
  try {
    const api = await getApiClient();
    const data = await api.put(`/api/friends/request/${requestId}`, {
      status,
      userId,
    });
    return data;
  } catch (error) {
    console.error("Error responding to friend request:", error);
    throw error;
  }
};

/**
 * Remove a friend
 * @param {string} friendId - Friend user ID to remove
 * @param {string} userId - Current user ID
 * @returns {Promise} - Promise that resolves to success message
 */
export const removeFriend = async (friendId, userId) => {
  try {
    const api = await getApiClient();
    const data = await api.delete(`/api/friends/${friendId}`, {
      body: JSON.stringify({ userId }),
    });
    return data;
  } catch (error) {
    console.error("Error removing friend:", error);
    throw error;
  }
};

/**
 * Search for users to add as friends
 * @param {string} query - Search query
 * @param {string} userId - Current user ID
 * @returns {Promise} - Promise that resolves to a list of users
 */
export const searchUsers = async (query, userId) => {
  try {
    const api = await getApiClient();
    // Add a timestamp parameter to prevent caching
    const timestamp = new Date().getTime();
    const data = await api.get(
      `/api/friends/search?query=${encodeURIComponent(
        query
      )}&userId=${userId}&_t=${timestamp}`
    );
    return data;
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};

/**
 * Set up a real-time listener for friend requests
 * @param {string} userId - User ID to get requests for
 * @param {Function} callback - Function to call when data changes
 * @returns {Function} - Unsubscribe function to stop listening
 */
export const subscribeFriendRequests = (userId, callback) => {
  if (!userId) return () => {};

  const requestsQuery = query(
    collection(db, "friends"),
    where("receiverId", "==", userId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    requestsQuery,
    async (snapshot) => {
      const requests = [];

      for (const docSnapshot of snapshot.docs) {
        const requestData = docSnapshot.data();

        try {
          // Get the sender's user data
          const senderRef = doc(db, "users", requestData.senderId);
          const senderDoc = await getDoc(senderRef);

          if (senderDoc.exists()) {
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
        } catch (err) {
          console.error("Error getting sender data:", err);
        }
      }

      callback(requests);
    },
    (error) => {
      console.error("Error listening to friend requests:", error);
    }
  );
};

export default {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  searchUsers,
  subscribeFriendRequests,
};
