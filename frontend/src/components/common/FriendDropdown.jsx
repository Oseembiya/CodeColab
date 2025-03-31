import { useRef, useEffect, useState } from "react";
import {
  FaUserFriends,
  FaUserPlus,
  FaSearch,
  FaTimes,
  FaCheck,
  FaUserMinus,
} from "react-icons/fa";
import { useFriends } from "../../contexts/FriendContext";
import { useAvatar } from "../../hooks/useImage";
import { useDropdown } from "../../contexts/DropdownContext";
import PropTypes from "prop-types";

// Add the default avatar SVG data URL
const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cpath fill='%23c6c6c6' d='M0 0h128v128H0z'/%3E%3Ccircle fill='%23fff' cx='64' cy='48' r='28'/%3E%3Cpath fill='%23fff' d='M64 95c19.883 0 36-8.075 36-18.031V89c0 18-16.117 33-36 33S28 107 28 89V76.969C28 86.925 44.117 95 64 95z'/%3E%3C/svg%3E";

const FriendDropdown = () => {
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const { openDropdownMenu, isDropdownOpen } = useDropdown();
  const dropdownName = "friends";
  const {
    friends,
    friendRequests,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    searchUsers,
    totalRequests,
  } = useFriends();

  // Handle clicks outside of dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        openDropdownMenu(null);
      }
    };

    if (isDropdownOpen(dropdownName)) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen, dropdownName, openDropdownMenu]);

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchUsers(searchQuery);

      // Filter out only users who are already friends
      // But KEEP users with pending requests to display differently
      const filteredResults = (results.users || []).filter((user) => {
        // Hide users who are already friends
        if (user.friendStatus === "accepted") {
          return false;
        }

        // Keep users with pending requests, rejected requests, and no requests
        return true;
      });

      setSearchResults(filteredResults);
    }, 1000);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchUsers]);

  const toggleDropdown = () => {
    openDropdownMenu(dropdownName);
    if (!isDropdownOpen(dropdownName)) {
      setActiveTab("friends");
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleAddFriend = async (userId) => {
    // Check if user already has a pending request
    const existingUser = searchResults.find((user) => user.id === userId);
    if (
      existingUser &&
      existingUser.friendStatus === "pending" &&
      existingUser.requestDirection === "outgoing"
    ) {
      // Just update the UI to show the pending status - no need to send another request
      return;
    }

    const result = await sendRequest(userId);

    if (result && result.success) {
      // Update search results to show user as "requested"
      setSearchResults((prevResults) =>
        prevResults.map((user) => {
          if (user.id === userId) {
            return {
              ...user,
              friendStatus: "pending",
              requestDirection: "outgoing",
            };
          }
          return user;
        })
      );
    }
  };

  const handleAcceptRequest = async (requestId) => {
    await acceptRequest(requestId);
  };

  const handleRejectRequest = async (requestId) => {
    await rejectRequest(requestId);
  };

  const handleRemoveFriend = async (friendId) => {
    await removeFriend(friendId);
  };

  return (
    <div className="friend-dropdown-container" ref={dropdownRef}>
      <button
        className="navbar-icon-button"
        onClick={toggleDropdown}
        aria-label="Friends"
        data-count={totalRequests > 0 ? totalRequests : undefined}
      >
        <FaUserFriends />
      </button>

      {isDropdownOpen(dropdownName) && (
        <div className="friend-dropdown">
          <div className="friend-dropdown-header">
            <div className="friend-tabs">
              <button
                className={`friend-tab ${
                  activeTab === "friends" ? "active" : ""
                }`}
                onClick={() => setActiveTab("friends")}
              >
                Friends ({friends.length})
              </button>
              <button
                className={`friend-tab ${
                  activeTab === "requests" ? "active" : ""
                }`}
                onClick={() => setActiveTab("requests")}
                data-count={
                  friendRequests.length > 0 ? friendRequests.length : undefined
                }
              >
                Requests
              </button>
              <button
                className={`friend-tab ${activeTab === "add" ? "active" : ""}`}
                onClick={() => setActiveTab("add")}
              >
                Add
              </button>
            </div>
          </div>

          <div className="friend-dropdown-content">
            {activeTab === "friends" && (
              <div className="friends-list">
                {friends.length === 0 ? (
                  <div className="empty-state">
                    <p>You don&apos;t have any friends yet</p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <FriendItem
                      key={friend.id}
                      user={friend}
                      action="remove"
                      onAction={() => handleRemoveFriend(friend.friendId)}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === "requests" && (
              <div className="requests-list">
                {friendRequests.length === 0 ? (
                  <div className="empty-state">
                    <p>No pending friend requests</p>
                  </div>
                ) : (
                  friendRequests.map((request) => (
                    <FriendRequestItem
                      key={request.id}
                      request={request}
                      onAccept={() => handleAcceptRequest(request.id)}
                      onReject={() => handleRejectRequest(request.id)}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === "add" && (
              <div className="add-friend">
                <div className="search-container">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>

                <div className="search-results">
                  {loading ? (
                    <div className="loading">Searching...</div>
                  ) : searchQuery.length < 2 ? (
                    <div className="empty-state">
                      <p>Enter at least 2 characters to search</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="empty-state">
                      <p>No users found with this name</p>
                      <small>
                        Only users you can add as friends will appear in search
                        results. Existing friends won&apos;t be shown.
                      </small>
                    </div>
                  ) : (
                    <>
                      {searchResults.map((user) => (
                        <SearchResultItem
                          key={user.id}
                          user={user}
                          onAddFriend={() => handleAddFriend(user.id)}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Friend item component
const FriendItem = ({ user, action, onAction }) => {
  const { url: avatarUrl } = useAvatar(user.photoURL);

  return (
    <div className="friend-item">
      <div className="friend-avatar">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user.displayName}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_AVATAR_SVG;
            }}
          />
        ) : (
          <div className="default-avatar-fallback">
            {user.displayName.charAt(0)}
          </div>
        )}
      </div>
      <div className="friend-info">
        <div className="friend-name">{user.displayName}</div>
      </div>
      {action === "remove" && (
        <button
          className="friend-action remove"
          onClick={onAction}
          aria-label="Remove friend"
          title="Remove friend"
        >
          <FaUserMinus />
        </button>
      )}
    </div>
  );
};

// Friend request item component
const FriendRequestItem = ({ request, onAccept, onReject }) => {
  const { url: avatarUrl } = useAvatar(request.senderPhoto);

  return (
    <div className="friend-request-item">
      <div className="friend-avatar">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={request.senderName}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = DEFAULT_AVATAR_SVG;
            }}
          />
        ) : (
          <div className="default-avatar-fallback">
            {request.senderName.charAt(0)}
          </div>
        )}
      </div>
      <div className="friend-info">
        <div className="friend-name">{request.senderName}</div>
        <div className="request-time">
          {new Date(request.createdAt).toLocaleDateString()}
        </div>
      </div>
      <div className="request-actions">
        <button
          className="request-action accept"
          onClick={onAccept}
          aria-label="Accept request"
          title="Accept"
        >
          <FaCheck />
        </button>
        <button
          className="request-action reject"
          onClick={onReject}
          aria-label="Reject request"
          title="Reject"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

// Search result item component
const SearchResultItem = ({ user, onAddFriend }) => {
  const { url: avatarUrl } = useAvatar(user.photoURL);

  // Only log with debug=true in URL for debugging
  const showDebug =
    new URLSearchParams(window.location.search).get("debug") === "true";
  if (showDebug) {
    console.log(
      "User in search results:",
      user.displayName,
      "status:",
      user.friendStatus,
      "direction:",
      user.requestDirection
    );
  }

  // Determine what action button to show based on status
  const renderActionButton = () => {
    switch (user.friendStatus) {
      case "accepted":
        return <span className="status-badge friends">Friends</span>;
      case "pending":
        if (user.requestDirection === "outgoing") {
          return (
            <button
              className="friend-action sent"
              disabled
              title="Request already sent"
            >
              Sent
            </button>
          );
        } else {
          return <span className="status-badge pending">Respond</span>;
        }
      case "rejected":
        return (
          <div className="action-with-status">
            <span className="status-badge rejected">Request Rejected</span>
            <button
              className="friend-action add"
              onClick={onAddFriend}
              aria-label="Add friend"
              title="Try again"
            >
              <FaUserPlus />
            </button>
          </div>
        );
      case "none":
      default:
        return (
          <button
            className="friend-action add"
            onClick={onAddFriend}
            aria-label="Add friend"
            title="Add friend"
          >
            <FaUserPlus />
          </button>
        );
    }
  };

  return (
    <div className={`search-result-item status-${user.friendStatus}`}>
      <div className="friend-avatar">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user.displayName}
            onError={(e) => {
              e.target.onerror = null;
              // Use the SVG defined at the top of this file
              e.target.src = DEFAULT_AVATAR_SVG;
            }}
          />
        ) : (
          <div className="default-avatar-fallback">
            {user.displayName.charAt(0)}
          </div>
        )}
      </div>
      <div className="friend-info">
        <div className="friend-name">{user.displayName}</div>
      </div>
      {renderActionButton()}
    </div>
  );
};

// PropTypes
FriendItem.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    friendId: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    photoURL: PropTypes.string,
  }).isRequired,
  action: PropTypes.oneOf(["remove"]).isRequired,
  onAction: PropTypes.func.isRequired,
};

FriendRequestItem.propTypes = {
  request: PropTypes.shape({
    id: PropTypes.string.isRequired,
    senderId: PropTypes.string.isRequired,
    senderName: PropTypes.string.isRequired,
    senderPhoto: PropTypes.string,
    createdAt: PropTypes.instanceOf(Date).isRequired,
  }).isRequired,
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
};

SearchResultItem.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string.isRequired,
    displayName: PropTypes.string.isRequired,
    photoURL: PropTypes.string,
    friendStatus: PropTypes.oneOf(["none", "pending", "accepted"]).isRequired,
    requestDirection: PropTypes.oneOf(["incoming", "outgoing", null]),
  }).isRequired,
  onAddFriend: PropTypes.func.isRequired,
};

export default FriendDropdown;
