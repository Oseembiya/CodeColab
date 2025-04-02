import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { db } from "../firebaseConfig";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

// Create context outside of the provider function
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  // State
  const [currentSession, setCurrentSession] = useState(null);

  // Hooks
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Define getSessionData first since it's a simple function that doesn't depend on other functions
  const getSessionData = useCallback(async (sessionId) => {
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error("Session not found");
      }

      return {
        id: sessionSnap.id,
        ...sessionSnap.data(),
      };
    } catch (error) {
      console.error("Error fetching session data:", error);
      throw new Error("Failed to fetch session data");
    }
  }, []);

  // Define clear session first since it's simpler and doesn't depend on other methods
  const clearActiveSession = useCallback(() => {
    setCurrentSession(null);
    localStorage.removeItem("activeSession");
  }, []);

  // Leave session depends on currentSession and socket
  const leaveSession = useCallback(() => {
    if (currentSession && socket) {
      try {
        console.log(`Leaving session ${currentSession.id}`);

        // Save the session ID before clearing state
        const sessionId = currentSession.id;

        // Clear UI state first to prevent state updates after unmounting
        setCurrentSession(null);
        localStorage.removeItem("activeSession");

        // Then emit leave event to socket server
        socket.emit("leave-session", {
          sessionId,
          userId: user?.uid,
        });

        console.log("Session context cleared successfully");
      } catch (error) {
        console.error("Error leaving session:", error);
        // Still clear local state even if there was an error
        setCurrentSession(null);
        localStorage.removeItem("activeSession");
      }
    }
  }, [currentSession, socket, user?.uid]);

  // Now define other more complex methods
  const joinSession = useCallback(
    async (sessionId, joinCode) => {
      console.log("Starting join with:", { sessionId, joinCode });

      try {
        if (!user) {
          throw new Error("User must be authenticated to join a session");
        }

        // Check if already in session
        if (currentSession?.id === sessionId) {
          console.log("Already in session, returning active session");
          return currentSession;
        }

        // Get session data from Firestore
        const sessionRef = doc(db, "sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          throw new Error("Session not found");
        }

        const sessionData = {
          id: sessionSnap.id,
          ...sessionSnap.data(),
        };

        // Validate join code ONLY for private sessions
        if (sessionData.isPrivate) {
          if (!joinCode) {
            throw new Error("Join code required for private session");
          }
          if (sessionData.joinCode !== joinCode) {
            throw new Error("Invalid join code");
          }
        }

        // Check if this is a scheduled session in the future
        if (sessionData.status === "scheduled") {
          const scheduledTime = new Date(sessionData.startTime);
          const now = new Date();

          if (scheduledTime > now) {
            const formattedDate = scheduledTime.toLocaleString();
            throw new Error(
              `This session is scheduled for ${formattedDate}. Please join at the scheduled time.`
            );
          }
        }

        // Validate session status (after checking scheduled time)
        if (
          sessionData.status !== "active" &&
          sessionData.status !== "scheduled"
        ) {
          throw new Error("Session is not active");
        }

        // Check if session is full
        if (
          sessionData.participants &&
          sessionData.participants.length >= sessionData.maxParticipants
        ) {
          throw new Error("Session is full");
        }

        // Join socket room
        if (socket) {
          socket.emit("join-session", {
            sessionId,
            userId: user.uid,
            username: user.displayName || "Anonymous",
            photoURL: user.photoURL,
          });
        }

        // Update current session
        const updatedSession = {
          ...sessionData,
          joinCode,
        };

        setCurrentSession(updatedSession);
        return updatedSession;
      } catch (error) {
        console.error("Join session error:", error);
        throw error;
      }
    },
    [currentSession, socket, user]
  );

  const createSession = useCallback(
    async (sessionData) => {
      try {
        if (!user) {
          throw new Error("User must be authenticated to create a session");
        }

        // Add participants array only for active sessions, not scheduled ones
        const participants =
          sessionData.status === "scheduled" ? [] : [user.uid];

        const sessionToCreate = {
          ...sessionData,
          createdAt: new Date().toISOString(),
          status: sessionData.status || "active",
          participants: participants, // Only add creator for active sessions
          owner: user.uid,
        };

        console.log("Creating session with status:", sessionToCreate.status);
        console.log("Start time:", sessionToCreate.startTime);

        const docRef = await addDoc(
          collection(db, "sessions"),
          sessionToCreate
        );

        // Create the complete session object
        const createdSession = {
          id: docRef.id,
          ...sessionToCreate,
        };

        // Only set as current session if it's active now
        if (sessionToCreate.status === "active") {
          setCurrentSession(createdSession);
          localStorage.setItem("activeSession", JSON.stringify(createdSession));
        }

        return docRef.id;
      } catch (error) {
        console.error("Error creating session:", error);
        throw error;
      }
    },
    [user]
  );

  // Listen for socket events
  useEffect(() => {
    if (socket) {
      // Listen for session timeout warning
      socket.on("session-ending-soon", ({ timeLeft }) => {
        // Create and show a Toast notification
        const warningToast = document.createElement("div");
        warningToast.className =
          "status-message-container warning position-top-right";
        warningToast.innerHTML = `
          <div class="status-message-content">
            <div class="status-icon"><i class="fa fa-exclamation-circle"></i></div>
            <p>This session will end in ${timeLeft} minutes due to the 30-minute limit.</p>
            <button class="close-message" aria-label="Close alert">×</button>
          </div>
        `;
        document.body.appendChild(warningToast);

        // Remove after 5 seconds
        setTimeout(() => {
          warningToast.classList.add("fade-out");
          setTimeout(() => {
            if (warningToast.parentNode) {
              warningToast.parentNode.removeChild(warningToast);
            }
          }, 300);
        }, 5000);
      });

      // Listen for session timeout end
      socket.on("session-ended", ({ reason }) => {
        // Create and show a Toast notification
        const infoToast = document.createElement("div");
        infoToast.className =
          "status-message-container info position-top-right";
        infoToast.innerHTML = `
          <div class="status-message-content">
            <div class="status-icon"><i class="fa fa-info-circle"></i></div>
            <p>${reason}</p>
            <button class="close-message" aria-label="Close alert">×</button>
          </div>
        `;
        document.body.appendChild(infoToast);

        // Navigate user back to dashboard or home
        navigate("/dashboard");
      });

      return () => {
        socket.off("session-ending-soon");
        socket.off("session-ended");
      };
    }
  }, [socket, navigate]);

  // Create the context value object only after all functions are defined
  const value = {
    currentSession,
    createSession,
    joinSession,
    clearActiveSession,
    leaveSession,
    getSessionData,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export default SessionContext;
