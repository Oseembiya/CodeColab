import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  setDoc,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../hooks/useAuth";

/**
 * Hook for managing sessions
 * @returns {Object} Sessions-related state and functions
 */
export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { socket } = useSocket();

  // Fetch sessions from Firestore
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Query for sessions where user is participant or owner
      // Removing orderBy to avoid composite index requirement
      const sessionsRef = collection(db, "sessions");
      const userSessionsQuery = query(
        sessionsRef,
        where("participants", "array-contains", user.uid)
      );

      const ownedSessionsQuery = query(
        sessionsRef,
        where("ownerId", "==", user.uid)
      );

      // Execute queries
      const [participantSnapshot, ownerSnapshot] = await Promise.all([
        getDocs(userSessionsQuery),
        getDocs(ownedSessionsQuery),
      ]);

      // Combine results, removing duplicates
      const uniqueSessions = new Map();

      // Add sessions where user is a participant
      participantSnapshot.forEach((doc) => {
        uniqueSessions.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // Add sessions where user is the owner
      ownerSnapshot.forEach((doc) => {
        uniqueSessions.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // Convert to array and sort by creation date (newest first)
      const sessionsArray = Array.from(uniqueSessions.values());
      sessionsArray.sort((a, b) => {
        // Handle both Firestore timestamps and ISO date strings
        const getTimestamp = (item) => {
          if (!item.createdAt) return 0;

          // Handle Firestore Timestamp objects
          if (typeof item.createdAt.toDate === "function") {
            return item.createdAt.toDate().getTime();
          }

          // Handle ISO strings or already converted dates
          if (typeof item.createdAt === "string") {
            return new Date(item.createdAt).getTime();
          }

          return 0;
        };

        return getTimestamp(b) - getTimestamp(a);
      });

      setSessions(sessionsArray);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(err);
      setLoading(false);
    }
  }, [user]);

  // Fetch sessions on component mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Create a new session
  const createSession = useCallback(
    async (sessionData) => {
      if (!user) {
        throw new Error("You must be logged in to create a session");
      }

      setLoading(true);
      setError(null);

      try {
        // Generate a unique join code for private sessions
        const joinCode = sessionData.isPrivate
          ? sessionData.joinCode || generateJoinCode()
          : null;

        // Create session document
        const sessionRef = collection(db, "sessions");
        const newSession = {
          title: sessionData.title,
          description: sessionData.description || "",
          language: sessionData.language || "javascript",
          isPrivate: sessionData.isPrivate || false,
          joinCode: joinCode,
          hostId: user.uid,
          hostName: user.displayName || "Anonymous",
          hostPhotoURL: user.photoURL || "",
          participants: [
            {
              id: user.uid,
              name: user.displayName || "Anonymous",
              photoURL: user.photoURL || "",
              isHost: true,
              joinedAt: serverTimestamp(),
            },
          ],
          status: sessionData.scheduled ? "scheduled" : "active",
          startTime: sessionData.scheduled
            ? new Date(sessionData.scheduledDate).toISOString()
            : new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          maxParticipants: sessionData.maxParticipants || 10,
          duration: sessionData.duration || 60, // in minutes
        };

        const docRef = await addDoc(sessionRef, newSession);
        const sessionId = docRef.id;

        // Add to user's sessions
        const userSessionsRef = doc(db, "userSessions", user.uid);
        const userSessionsSnap = await getDoc(userSessionsRef);

        if (!userSessionsSnap.exists()) {
          // Create new user sessions document
          await setDoc(userSessionsRef, {
            userId: user.uid,
            sessions: [
              {
                sessionId,
                joinedAt: new Date().toISOString(),
                isHost: true,
              },
            ],
          });
        } else {
          // Update existing user sessions document
          await updateDoc(userSessionsRef, {
            sessions: [
              ...userSessionsSnap.data().sessions,
              {
                sessionId,
                joinedAt: new Date().toISOString(),
                isHost: true,
              },
            ],
          });
        }

        // Notify socket server about new session
        if (socket) {
          socket.emit("create-session", {
            sessionId,
            userId: user.uid,
            sessionData: {
              ...newSession,
              id: sessionId,
            },
          });
        }

        // Refresh sessions list
        await fetchSessions();
        setLoading(false);

        return sessionId;
      } catch (err) {
        console.error("Error creating session:", err);
        setError(err.message || "Failed to create session");
        setLoading(false);
        throw err;
      }
    },
    [user, socket, fetchSessions]
  );

  // Join a session
  const joinSession = useCallback(
    async (sessionId, joinCode = null) => {
      if (!user) {
        throw new Error("You must be logged in to join a session");
      }

      setLoading(true);
      setError(null);

      try {
        // Get session data
        const sessionRef = doc(db, "sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          throw new Error("Session not found");
        }

        const sessionData = sessionSnap.data();

        // Check if session is private and validate join code
        if (sessionData.isPrivate && sessionData.hostId !== user.uid) {
          if (!joinCode) {
            throw new Error("Join code is required for private sessions");
          }

          if (joinCode.toUpperCase() !== sessionData.joinCode.toUpperCase()) {
            throw new Error("Invalid join code");
          }
        }

        // Check if user is already a participant
        const currentParticipants = sessionData.participants || [];
        const isExistingParticipant = currentParticipants.some(
          (p) => p.id === user.uid
        );

        // Add user to participants if not already there
        if (!isExistingParticipant) {
          const userToAdd = {
            id: user.uid,
            name: user.displayName || "Anonymous",
            photoURL: user.photoURL || "",
            isHost: sessionData.hostId === user.uid,
            joinedAt: serverTimestamp(),
          };

          // Update session with new participant
          await updateDoc(sessionRef, {
            participants: [...currentParticipants, userToAdd],
            updatedAt: serverTimestamp(),
          });
        }

        // Add to user's sessions if not already there
        const userSessionsRef = doc(db, "userSessions", user.uid);
        const userSessionsSnap = await getDoc(userSessionsRef);

        if (!userSessionsSnap.exists()) {
          // Create new user sessions document
          await setDoc(userSessionsRef, {
            userId: user.uid,
            sessions: [
              {
                sessionId,
                joinedAt: new Date().toISOString(),
                isHost: sessionData.hostId === user.uid,
              },
            ],
          });
        } else {
          const userSessionsData = userSessionsSnap.data();
          const existingSessionIndex = userSessionsData.sessions.findIndex(
            (s) => s.sessionId === sessionId
          );

          if (existingSessionIndex === -1) {
            // Add new session entry
            await updateDoc(userSessionsRef, {
              sessions: [
                ...userSessionsData.sessions,
                {
                  sessionId,
                  joinedAt: new Date().toISOString(),
                  isHost: sessionData.hostId === user.uid,
                },
              ],
            });
          }
        }

        // Refresh sessions list
        await fetchSessions();
        setLoading(false);

        return sessionData;
      } catch (err) {
        console.error("Error joining session:", err);
        setError(err.message || "Failed to join session");
        setLoading(false);
        throw err;
      }
    },
    [user, fetchSessions]
  );

  // Leave a session
  const leaveSession = useCallback(
    async (sessionId) => {
      if (!user || !sessionId) return;

      try {
        // Remove participant from session
        const sessionRef = doc(db, "sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data();
          const participants = sessionData.participants || [];
          const updatedParticipants = participants.filter(
            (p) => p.id !== user.uid
          );

          await updateDoc(sessionRef, {
            participants: updatedParticipants,
            updatedAt: serverTimestamp(),
          });

          // If socket connected, send leave event
          if (socket) {
            socket.emit("leave-session", {
              sessionId,
              userId: user.uid,
            });
          }

          // Refresh session list
          await fetchSessions();
        }
      } catch (err) {
        console.error("Error leaving session:", err);
        setError(err.message || "Failed to leave session");
      }
    },
    [user, socket, fetchSessions]
  );

  // Refresh sessions
  const refreshSessions = () => {
    fetchSessions();
  };

  // Helper function to generate a join code
  const generateJoinCode = () => {
    // Generate a 6-character alphanumeric code
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  return {
    sessions,
    loading,
    error,
    createSession,
    joinSession,
    leaveSession,
    refreshSessions,
  };
};

export default useSessions;
