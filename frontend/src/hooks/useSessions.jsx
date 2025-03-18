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

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          createdAt: data.createdAt?.toString() || new Date().toISOString(),
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
      const sessionToCreate = {
        ...sessionData,
        maxParticipants: Number(sessionData.maxParticipants),
        createdAt: new Date().toISOString(),
        startTime: sessionData.startNow
          ? new Date().toISOString()
          : sessionData.scheduledTime,
        status: "active",
      };

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
      // If we only have a code and no ID, try to find the session
      if (!sessionId && code) {
        // This scenario is now handled in sessions.jsx
        // But we should handle it here too as a fallback
        throw new Error("Please provide a valid session ID or join code");
      }

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

      // Validate private session access
      if (session.isPrivate) {
        if (!code) {
          throw new Error("Join code required for private session");
        }
        if (session.joinCode !== code) {
          throw new Error("Invalid join code");
        }
      }

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
