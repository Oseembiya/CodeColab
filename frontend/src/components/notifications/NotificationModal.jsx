import { db, auth } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";

/**
 * Get unread notifications for the current user
 * @param {string} userId - Current user ID
 * @param {number} limit - Maximum notifications to fetch (default 20)
 * @returns {Promise} - Promise resolving to array of notifications
 */
export const getNotifications = async (userId, maxLimit = 20) => {
  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(maxLimit)
    );

    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID to mark as read
 * @returns {Promise} - Promise resolving to success status
 */
export const markAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      read: true,
    });
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @param {string} userId - Current user ID
 * @returns {Promise} - Promise resolving to success status
 */
export const markAllAsRead = async (userId) => {
  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );

    const snapshot = await getDocs(notificationsQuery);

    // Update each unread notification
    const updatePromises = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};
