import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { db } from "../firebaseConfig";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "./SocketContext";
import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [currentSession, setCurrentSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { socket } = useSocket();

  // Clear session state when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentSession(null);
    }
  }, [user]);

  // Create a new session
  const createSession = useCallback(
    async (sessionData) => {
      if (!user) {
        throw new Error("You must be logged in to create a session");
      }

      setIsLoading(true);
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

        // Set the current session
        const createdSession = {
          ...newSession,
          id: sessionId,
          participants: newSession.participants,
        };

        setCurrentSession(createdSession);

        // Notify socket server about the new session
        if (socket) {
          socket.emit("create-session", {
            sessionId,
            userId: user.uid,
            sessionData: createdSession,
          });
        }

        // Add to user's sessions
        await addSessionToUser(sessionId, user.uid, true);

        setIsLoading(false);
        return sessionId;
      } catch (err) {
        console.error("Error creating session:", err);
        setError(err.message || "Failed to create session");
        setIsLoading(false);
        throw err;
      }
    },
    [user, socket]
  );

  // Join an existing session
  const joinSession = useCallback(
    async (sessionId, joinCode = null) => {
      if (!user) {
        throw new Error("You must be logged in to join a session");
      }

      setIsLoading(true);
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

        // Check if session has reached max participants
        const currentParticipants = sessionData.participants || [];
        const participantCount = currentParticipants.length;

        if (
          participantCount >= sessionData.maxParticipants &&
          !currentParticipants.some((p) => p.id === user.uid) &&
          sessionData.hostId !== user.uid
        ) {
          throw new Error("Session has reached maximum capacity");
        }

        // Check if user is already a participant
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
            participants: arrayUnion(userToAdd),
            updatedAt: serverTimestamp(),
          });

          // Add to user's sessions
          await addSessionToUser(sessionId, user.uid, false);
        }

        // Get updated session
        const updatedSessionSnap = await getDoc(sessionRef);
        const updatedSession = {
          ...updatedSessionSnap.data(),
          id: sessionId,
        };

        setCurrentSession(updatedSession);

        // Notify socket server about joining the session
        if (socket) {
          socket.emit("join-session", {
            sessionId,
            userId: user.uid,
            username: user.displayName || "Anonymous",
            photoURL: user.photoURL || "",
          });
        }

        setIsLoading(false);
        return updatedSession;
      } catch (err) {
        console.error("Error joining session:", err);
        setError(err.message || "Failed to join session");
        setIsLoading(false);
        throw err;
      }
    },
    [user, socket]
  );

  // Leave the current session
  const leaveSession = useCallback(async () => {
    if (!currentSession || !user) return;

    try {
      // Remove user from session participants
      const sessionRef = doc(db, "sessions", currentSession.id);

      await updateDoc(sessionRef, {
        participants: arrayRemove({
          id: user.uid,
          name: user.displayName || "Anonymous",
          photoURL: user.photoURL || "",
          isHost: currentSession.hostId === user.uid,
          joinedAt: serverTimestamp(),
        }),
        updatedAt: serverTimestamp(),
      });

      // Notify socket server
      if (socket) {
        socket.emit("leave-session", {
          sessionId: currentSession.id,
          userId: user.uid,
        });
      }

      // Clear current session
      setCurrentSession(null);
    } catch (err) {
      console.error("Error leaving session:", err);
      setError(err.message || "Failed to leave session");
    }
  }, [currentSession, user, socket]);

  // End session (host only)
  const endSession = useCallback(
    async (sessionId = null) => {
      const targetSessionId = sessionId || currentSession?.id;

      if (!targetSessionId || !user) {
        return false;
      }

      try {
        const sessionRef = doc(db, "sessions", targetSessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          throw new Error("Session not found");
        }

        const sessionData = sessionSnap.data();

        // Check if user is the host
        if (sessionData.hostId !== user.uid) {
          throw new Error("Only the host can end the session");
        }

        // Update session status
        await updateDoc(sessionRef, {
          status: "ended",
          endedAt: new Date().toISOString(),
          endedBy: user.uid,
          updatedAt: serverTimestamp(),
        });

        // Notify socket server
        if (socket) {
          socket.emit("end-session", {
            sessionId: targetSessionId,
            userId: user.uid,
            endedAt: new Date().toISOString(),
          });
        }

        // Update local state if this is the current session
        if (currentSession?.id === targetSessionId) {
          setCurrentSession({
            ...currentSession,
            status: "ended",
            endedAt: new Date().toISOString(),
            endedBy: user.uid,
          });
        }

        return true;
      } catch (err) {
        console.error("Error ending session:", err);
        setError(err.message || "Failed to end session");
        return false;
      }
    },
    [currentSession, user, socket]
  );

  // Helper function to add session to user's session list
  const addSessionToUser = async (sessionId, userId, isHost) => {
    try {
      const userSessionsRef = doc(db, "userSessions", userId);
      const userSessionsSnap = await getDoc(userSessionsRef);

      if (!userSessionsSnap.exists()) {
        // Create new user sessions document
        await setDoc(userSessionsRef, {
          userId,
          sessions: [
            {
              sessionId,
              joinedAt: new Date().toISOString(),
              isHost,
            },
          ],
        });
      } else {
        // Update existing user sessions document
        const sessionsData = userSessionsSnap.data();
        const existingSessionIndex = sessionsData.sessions.findIndex(
          (s) => s.sessionId === sessionId
        );

        if (existingSessionIndex === -1) {
          // Add new session entry
          await updateDoc(userSessionsRef, {
            sessions: arrayUnion({
              sessionId,
              joinedAt: new Date().toISOString(),
              isHost,
            }),
          });
        }
      }
    } catch (err) {
      console.error("Error adding session to user data:", err);
    }
  };

  // Helper function to generate a unique join code
  const generateJoinCode = () => {
    // Generate a 6-character alphanumeric code
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Clear the active session state
  const clearActiveSession = useCallback(() => {
    console.log("Clearing active session state");
    setCurrentSession(null);
    setError(null);
    return true;
  }, []);

  const contextValue = {
    currentSession,
    isLoading,
    error,
    createSession,
    joinSession,
    leaveSession,
    endSession,
    clearActiveSession,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export default SessionContext;
