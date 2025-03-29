import { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../contexts/SocketContext";
import * as notificationService from "../services/notificationService";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set up real-time Firestore listener for notifications
  useEffect(() => {
    if (user?.uid) {
      setLoading(true);

      // Subscribe to notifications with Firestore real-time updates
      const unsubscribe = notificationService.subscribeToNotifications(
        user.uid,
        (notificationsData) => {
          setNotifications(notificationsData);
          setUnreadCount(notificationsData.filter((n) => !n.read).length);
          setLoading(false);
        }
      );

      // Clean up the listener when unmounting or user changes
      return () => unsubscribe();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.uid]);

  // Listen for socket notifications (keep this for backward compatibility)
  useEffect(() => {
    if (socket && user?.uid) {
      socket.on("new-notification", (notification) => {
        if (notification.userId === user.uid) {
          // The Firestore listener will handle this, but keep for legacy support
          // Show browser notification if supported
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("CodeColab", {
              body: notification.message,
              icon: "/logo.png",
            });
          }
        }
      });

      return () => {
        socket.off("new-notification");
      };
    }
  }, [socket, user?.uid]);

  const loadNotifications = async () => {
    // This function is kept for backward compatibility
    // Now notifications load automatically via the listener
    return;
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);

      // The Firestore listener will automatically update the UI
      // but we'll update locally too for immediate feedback
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      return true;
    } catch (err) {
      console.error("Error marking notification as read:", err);
      return false;
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(user.uid);

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);

      return true;
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      return false;
    }
  };

  const contextValue = {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

export default NotificationContext;
