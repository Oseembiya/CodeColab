import { useNotifications } from "../../contexts/NotificationContext";
import { IoMdNotifications } from "react-icons/io";
import { formatDistanceToNow } from "date-fns";
import { useDropdown } from "../../contexts/DropdownContext";
import { useState } from "react";

// Helper function to safely format dates
const formatNotificationTime = (timestamp) => {
  // Handle Firestore Timestamp objects
  if (timestamp && typeof timestamp.toDate === "function") {
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
  }

  // Handle regular Date objects
  if (timestamp && timestamp instanceof Date) {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  }

  // Handle timestamps stored as seconds or milliseconds
  if (timestamp && typeof timestamp === "number") {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  }

  // Fallback for any other case
  return "recently";
};

const NotificationMenu = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();
  const { openDropdownMenu, isDropdownOpen } = useDropdown();
  const dropdownName = "notifications";
  const [animatingRead, setAnimatingRead] = useState(false);

  // Filter to show only unread notifications
  const unreadNotifications = notifications.filter(
    (notification) => !notification.read
  );

  const handleToggle = () => {
    openDropdownMenu(dropdownName);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Handle navigation based on notification type
    if (notification.type === "friend_request") {
      // Navigate to friend requests
      window.location.href = "/dashboard/friends";
    } else if (notification.type === "friend_accepted") {
      // Navigate to friends list
      window.location.href = "/dashboard/friends";
    } else if (notification.type === "session_invite") {
      // Navigate to specific session
      window.location.href = `/dashboard/sessions/${notification.sessionId}`;
    }
  };

  const handleMarkAllAsRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      // Start the animation
      setAnimatingRead(true);

      // Close the dropdown after the animation completes
      setTimeout(() => {
        openDropdownMenu(null);
        setAnimatingRead(false);
      }, 600);
    }
  };

  return (
    <div className="notification-menu">
      <button
        className="notification-button"
        onClick={handleToggle}
        aria-label="Notifications"
      >
        <IoMdNotifications size={24} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {isDropdownOpen(dropdownName) && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={handleMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Loading...</div>
            ) : unreadNotifications.length === 0 ? (
              <div className="empty-notifications">No notifications</div>
            ) : (
              unreadNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item unread ${
                    animatingRead ? "fade-to-read" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;
