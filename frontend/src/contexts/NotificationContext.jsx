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

  // Load notifications when user is authenticated
  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.uid]);

  // Listen for real-time notifications
  useEffect(() => {
    if (socket && user?.uid) {
      socket.on("new-notification", (notification) => {
        if (notification.userId === user.uid) {
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);

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
    if (!user?.uid) return;

    setLoading(true);
    setError(null);

    try {
      const data = await notificationService.getNotifications(user.uid);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (err) {
      console.error("Error loading notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
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
