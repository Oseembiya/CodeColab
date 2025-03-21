import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * Fetch all notifications for a user
 * @param {string} userId - The user ID to fetch notifications for
 * @returns {Promise<Array>} - Array of notification objects
 */
export const getNotifications = async (userId) => {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

/**
 * Mark a single notification as read
 * @param {string} notificationId - ID of the notification to mark as read
 * @returns {Promise<void>}
 */
export const markAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date(),
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications for a user as read
 * @param {string} userId - User ID whose notifications to mark as read
 * @returns {Promise<void>}
 */
export const markAllAsRead = async (userId) => {
  try {
    const notificationsRef = collection(db, "notifications");
    const q = query(
      notificationsRef,
      where("userId", "==", userId),
      where("read", "==", false)
    );

    const querySnapshot = await getDocs(q);

    // Use a batch write to update multiple documents efficiently
    const batch = writeBatch(db);

    querySnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: new Date(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - ID of the notification to delete
 * @returns {Promise<void>}
 */
export const deleteNotification = async (notificationId) => {
  try {
    const notificationRef = doc(db, "notifications", notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};
