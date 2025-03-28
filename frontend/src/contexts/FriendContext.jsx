import { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import PropTypes from "prop-types";
import * as friendService from "../services/friendService.jsx";
import Toast from "../components/common/Alert";
import { useSocket } from "../contexts/SocketContext";

// Create the context
const FriendContext = createContext();

export const FriendProvider = ({ children }) => {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const { socket } = useSocket();

  // Fetch friends and friend requests when user changes
  useEffect(() => {
    if (user?.uid) {
      loadFriendsData();
    } else {
      setFriends([]);
      setFriendRequests([]);
    }
  }, [user?.uid]);

  // Set up real-time listener for friend requests
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = friendService.subscribeFriendRequests(
        user.uid,
        (requests) => {
          setFriendRequests(requests);
        }
      );

      // Clean up listener when component unmounts or user changes
      return () => unsubscribe();
    }
  }, [user?.uid]);

  // Load friends and friend requests
  const loadFriendsData = async () => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      // Handle each request separately to prevent one failure from affecting the other
      let friendsData = { friends: [] };

      try {
        friendsData = await friendService.getFriends(user.uid);
      } catch (err) {
        console.warn("Error loading friends:", err);
      }

      // Set the data even if there were errors
      setFriends(friendsData?.friends || []);
      // Friend requests are now handled by the real-time listener
    } catch (err) {
      console.error("Error loading friends data:", err);
      setError("Failed to load friends data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Send a friend request
  const sendRequest = async (receiverId) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      // Optimistically update UI - add to search results with "pending" status
      const results = await friendService.sendFriendRequest(
        user.uid,
        receiverId
      );
      setSuccessMessage("Friend request sent successfully!");

      // Refresh data to ensure consistency
      await loadFriendsData();

      return { success: true };
    } catch (err) {
      // Handle the "already exists" case as a non-error
      if (
        err.message &&
        err.message.includes("already exists") &&
        !err.message.includes("rejected")
      ) {
        setSuccessMessage("Friend request already sent or connection exists");
        return { success: true, alreadyExists: true };
      }

      // Only log errors that aren't about duplicate requests
      console.error("Error sending friend request:", err);
      setError(err.message || "Failed to send friend request");
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Accept a friend request
  const acceptRequest = async (requestId) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      await friendService.respondToFriendRequest(
        requestId,
        "accepted",
        user.uid
      );

      // Update the UI immediately
      const acceptedRequest = friendRequests.find(
        (req) => req.id === requestId
      );
      if (acceptedRequest) {
        // Add to friends list
        setFriends((prev) => [
          ...prev,
          {
            id: requestId,
            friendId: acceptedRequest.senderId,
            displayName: acceptedRequest.senderName,
            photoURL: acceptedRequest.senderPhoto,
            status: "accepted",
            createdAt: new Date(),
          },
        ]);

        // Remove from requests
        setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));
      }

      setSuccessMessage("Friend request accepted!");
    } catch (err) {
      console.error("Error accepting friend request:", err);
      setError(err.message || "Failed to accept friend request");
      await loadFriendsData(); // Reload data on error to ensure consistency
    } finally {
      setLoading(false);
    }
  };

  // Reject a friend request
  const rejectRequest = async (requestId) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      await friendService.respondToFriendRequest(
        requestId,
        "rejected",
        user.uid
      );

      // Remove from requests list
      setFriendRequests((prev) => prev.filter((req) => req.id !== requestId));

      setSuccessMessage("Friend request rejected");
    } catch (err) {
      console.error("Error rejecting friend request:", err);
      setError(err.message || "Failed to reject friend request");
      await loadFriendsData(); // Reload data on error to ensure consistency
    } finally {
      setLoading(false);
    }
  };

  // Remove a friend
  const removeFriend = async (friendId) => {
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      await friendService.removeFriend(friendId, user.uid);

      // Update friends list
      setFriends((prev) =>
        prev.filter((friend) => friend.friendId !== friendId)
      );

      setSuccessMessage("Friend removed successfully");
    } catch (err) {
      console.error("Error removing friend:", err);
      setError(err.message || "Failed to remove friend");
      await loadFriendsData(); // Reload data on error to ensure consistency
    } finally {
      setLoading(false);
    }
  };

  // Search for users
  const searchUsers = async (query) => {
    if (!user?.uid || !query) return { users: [] };

    try {
      const result = await friendService.searchUsers(query, user.uid);
      return result;
    } catch (err) {
      console.error("Error searching users:", err);
      setError(err.message || "Failed to search users");
      return { users: [] };
    }
  };

  useEffect(() => {
    if (socket && user?.uid) {
      // Listen for friend status changes
      socket.on("friend:status", ({ friendId, status }) => {
        setFriends((prev) =>
          prev.map((friend) =>
            friend.friendId === friendId
              ? { ...friend, isOnline: status === "online" }
              : friend
          )
        );
      });
    }

    return () => {
      if (socket) {
        socket.off("friend:status");
      }
    };
  }, [socket, user?.uid]);

  return (
    <FriendContext.Provider
      value={{
        friends,
        friendRequests,
        loading,
        error,
        sendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend,
        searchUsers,
        refresh: loadFriendsData,
        totalRequests: friendRequests.length,
      }}
    >
      {children}
      {successMessage && (
        <Toast
          message={successMessage}
          type="success"
          onClose={() => setSuccessMessage("")}
        />
      )}
      {error && (
        <Toast message={error} type="error" onClose={() => setError(null)} />
      )}
    </FriendContext.Provider>
  );
};

FriendProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use the friend context
export const useFriends = () => {
  const context = useContext(FriendContext);
  if (!context) {
    throw new Error("useFriends must be used within a FriendProvider");
  }
  return context;
};

export default FriendContext;
