import { useState, useRef, useEffect } from "react";
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
import PropTypes from "prop-types";
import "../../styles/components/friend-dropdown.css";

const FriendDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const dropdownRef = useRef(null);
  const searchTimeoutRef = useRef(null);
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
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
      setSearchResults(results.users || []);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchUsers]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setActiveTab("friends");
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleAddFriend = async (userId) => {
    await sendRequest(userId);
    setSearchQuery("");
    setSearchResults([]);
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

      {isOpen && (
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
                  {searchQuery && (
                    <button
                      className="clear-search"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                    >
                      <FaTimes />
                    </button>
                  )}
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
                      <p>No users found</p>
                    </div>
                  ) : (
                    searchResults.map((user) => (
                      <SearchResultItem
                        key={user.id}
                        user={user}
                        onAddFriend={() => handleAddFriend(user.id)}
                      />
                    ))
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
        <img src={avatarUrl} alt={user.displayName} />
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
        <img src={avatarUrl} alt={request.senderName} />
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

  // Determine what action button to show based on status
  const renderActionButton = () => {
    switch (user.friendStatus) {
      case "accepted":
        return <span className="status-badge friends">Friends</span>;
      case "pending":
        return user.requestDirection === "outgoing" ? (
          <span className="status-badge pending">Requested</span>
        ) : (
          <span className="status-badge pending">Respond</span>
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
    <div className="search-result-item">
      <div className="friend-avatar">
        <img src={avatarUrl} alt={user.displayName} />
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
