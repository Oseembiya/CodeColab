/**
 * Service for handling friend-related API requests
 */

/**
 * Get all friends for the current user
 * @param {string} userId - Current user ID
 * @returns {Promise} - Promise that resolves to a list of friends
 */
export const getFriends = async (userId) => {
  try {
    const response = await fetch(`/api/friends?userId=${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get friends");
    }

    return await response.json();
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
    const response = await fetch(`/api/friends/requests?userId=${userId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get friend requests");
    }

    return await response.json();
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
    const response = await fetch("/api/friends/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ senderId, receiverId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send friend request");
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending friend request:", error);
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
    const response = await fetch(`/api/friends/request/${requestId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to respond to friend request");
    }

    return await response.json();
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
    const response = await fetch(`/api/friends/${friendId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove friend");
    }

    return await response.json();
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
    const response = await fetch(
      `/api/friends/search?query=${encodeURIComponent(query)}&userId=${userId}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to search users");
    }

    return await response.json();
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};

export default {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  searchUsers,
};
