import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { auth } from "../firebaseConfig";
import { formatDateTime, getCurrentTimestamp } from "../utils/dateUtils";

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to combine date and time
  const combineDateTime = (date, time) => {
    if (!date || !time) return new Date().toISOString();
    return new Date(`${date}T${time}`).toISOString();
  };

  // Fetch sessions once instead of real-time updates
  const fetchSessions = async () => {
    try {
      const sessionsRef = collection(db, "sessions");
      const q = query(sessionsRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      const sessionData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          language: data.language || "javascript",
          maxParticipants: Number(data.maxParticipants),
          createdAt: data.createdAt?.toString() || getCurrentTimestamp(),
          startTime: data.startTime?.toString() || data.createdAt?.toString(),
          isPrivate: Boolean(data.isPrivate),
        };
      });

      setSessions(sessionData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(err);
      setLoading(false);
    }
  };

  // Fetch sessions on component mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const createSession = async (sessionData) => {
    try {
      if (!sessionData) {
        throw new Error("Session data is required");
      }

      // Initialize timestamps now to avoid potential timing issues
      const now = getCurrentTimestamp();

      // Determine if this is a scheduled session
      const isScheduled =
        sessionData.status === "scheduled" ||
        (!sessionData.startNow && sessionData.scheduledDate);

      // Get current user ID
      const currentUserId = auth.currentUser?.uid || null;

      // Calculate participants array
      const participants = isScheduled
        ? []
        : currentUserId
        ? [currentUserId]
        : [];

      // Calculate startTime
      let startTime = now;
      let status = "active";

      // Calculate startTime for scheduled sessions
      if (
        isScheduled &&
        sessionData.scheduledDate &&
        sessionData.scheduledTime
      ) {
        startTime = formatDateTime(
          sessionData.scheduledDate,
          sessionData.scheduledTime
        );
        status = "scheduled";
      }

      // Create a complete session object with all properties initialized
      const sessionToCreate = {
        title: sessionData.title || "Untitled Session",
        description: sessionData.description || "",
        language: sessionData.language || "javascript",
        maxParticipants: Number(sessionData.maxParticipants || 10),
        isPrivate: Boolean(sessionData.isPrivate),
        joinCode: sessionData.joinCode || "",
        createdAt: now,
        startTime: startTime,
        status: status,
        participants: participants,
        owner: currentUserId,
      };

      console.log("Session data: ", sessionToCreate);

      const docRef = await addDoc(collection(db, "sessions"), sessionToCreate);

      // Update local state
      setSessions((prev) => [
        {
          id: docRef.id,
          ...sessionToCreate,
        },
        ...prev,
      ]);

      return { id: docRef.id, ...sessionToCreate };
    } catch (err) {
      console.error("Error creating session:", err);
      throw err;
    }
  };

  const updateSession = async (sessionId, updateData) => {
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, updateData);

      // Update local state
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, ...updateData } : session
        )
      );
    } catch (err) {
      console.error("Error updating session:", err);
      throw err;
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      await deleteDoc(sessionRef);

      // Update local state
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    } catch (err) {
      console.error("Error deleting session:", err);
      throw err;
    }
  };

  const joinSession = async (sessionId, code = null) => {
    try {
      // Validate sessionId
      if (!sessionId || typeof sessionId !== "string") {
        throw new Error("Invalid session ID");
      }

      const sessionRef = doc(db, "sessions", sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (!sessionDoc.exists()) {
        throw new Error("Session not found");
      }

      const session = { id: sessionId, ...sessionDoc.data() };

      // Check if this is a scheduled session in the future
      if (session.status === "scheduled") {
        const scheduledTime = new Date(session.startTime);
        const now = new Date();

        if (scheduledTime > now) {
          const formattedDate = scheduledTime.toLocaleString();
          throw new Error(
            `This session is scheduled for ${formattedDate}. Please join at the scheduled time.`
          );
        }
      }

      // Validate private session access - ONLY if the session is private
      if (session.isPrivate) {
        if (!code) {
          throw new Error("Join code required for private session");
        }
        if (session.joinCode !== code) {
          throw new Error("Invalid join code");
        }
      }
      // For public sessions, no join code validation is needed

      // Return the joined session
      return session;
    } catch (err) {
      console.error("Error joining session:", err);
      throw err;
    }
  };

  // Manual refresh function
  const refreshSessions = () => {
    setLoading(true);
    fetchSessions();
  };

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    deleteSession,
    joinSession,
    refreshSessions,
  };
};
