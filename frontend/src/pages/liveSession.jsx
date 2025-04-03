import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../contexts/SocketContext";
import { useSession } from "../contexts/SessionContext";
import SessionInfo from "../components/sessions/SessionInfo";
import CollaborativeEditor from "../components/editor/CollaborativeEditor";
import Toast from "../components/common/Alert";

const LiveSession = () => {
  // Router hooks
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Context hooks
  const { user } = useAuth();
  const { socket } = useSocket();
  const {
    currentSession,
    joinSession: contextJoinSession,
    leaveSession: contextLeaveSession,
  } = useSession();

  // Local state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionEndedMessage, setSessionEndedMessage] = useState(null);
  const [unsubscribeRef, setUnsubscribeRef] = useState(null);

  // References to prevent duplicate requests
  const requestedInitialCount = useRef(false);

  // User ID - extracted from auth
  const userId = auth.currentUser?.uid;

  // Check authentication and redirect if necessary
  useEffect(() => {
    if (!user) {
      console.log("User not authenticated, redirecting to login");
      navigate("/login");
    }
  }, [user, navigate]);

  // Main effect to initialize and clean up session
  useEffect(() => {
    // Check if user is authenticated
    if (!user) return;

    const joinSession = async () => {
      console.log("Attempting to join session:", sessionId);
      setLoading(true);

      try {
        // Check for stored join info
        const storedJoinInfo = localStorage.getItem("lastJoinedSession");
        let joinCode = null;

        if (storedJoinInfo) {
          try {
            const parsedInfo = JSON.parse(storedJoinInfo);
            if (parsedInfo.id === sessionId) {
              joinCode = parsedInfo.joinCode;
              console.log("Found stored join code for session");
            }
          } catch (parseErr) {
            console.error("Error parsing stored session info:", parseErr);
          }
        }

        // Check if session is scheduled
        const sessionRef = doc(db, "sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          setError("Session not found");
          setLoading(false);
          return;
        }

        const sessionData = sessionSnap.data();
        if (sessionData.status === "scheduled") {
          const scheduledTime = new Date(sessionData.startTime);
          const now = new Date();

          if (scheduledTime > now) {
            const formattedDate = scheduledTime.toLocaleString();
            setError(
              `This session is scheduled for ${formattedDate}. Please join at the scheduled time.`
            );
            setLoading(false);
            return;
          }
        }

        // Join session through context
        await contextJoinSession(sessionId, joinCode);
        console.log("Successfully joined session");

        // Set up real-time listener for session updates
        const unsubscribe = onSnapshot(
          sessionRef,
          (snapshot) => {
            if (snapshot.exists()) {
              setLoading(false);
            } else {
              setError("Session not found");
              setLoading(false);
            }
          },
          (err) => {
            console.error("Error listening to session:", err);
            setError(err.message);
            setLoading(false);
          }
        );

        // Store unsubscribe function
        setUnsubscribeRef(() => unsubscribe);

        // Emit join event to socket
        if (socket && userId) {
          console.log(
            `Emitting join-session event for session ${sessionId}, user ${userId}`
          );
          socket.emit("join-session", {
            sessionId,
            userId,
            username: user?.displayName || "Anonymous",
            photoURL: user?.photoURL,
          });

          // Request participant count once after joining, with a small delay to ensure join completes
          // Don't use repeated setTimeout calls that might stack up
          if (!requestedInitialCount.current) {
            requestedInitialCount.current = true;
            setTimeout(() => {
              if (socket.connected) {
                socket.emit("request-participant-count", { sessionId });
              }
            }, 1000);
          }
        }
      } catch (error) {
        console.error("Error joining session:", error);
        setError(error.message || "Error joining session");
        setLoading(false);
      }
    };

    // Check if already in the correct session
    if (currentSession?.id === sessionId) {
      setLoading(false);
      return;
    }

    joinSession();

    // Clean up function
    return () => {
      console.log("Leaving session:", sessionId);

      try {
        // Clean up socket connection
        if (socket && sessionId && userId) {
          socket.emit("leave-session", { sessionId, userId });
          socket.emit("user-left-session", { sessionId, userId });
        }

        // Clean up Firestore listener
        if (unsubscribeRef) {
          unsubscribeRef();
        }

        // Leave session through context
        contextLeaveSession();
      } catch (err) {
        console.error("Error leaving session:", err);
      }
    };
  }, [
    sessionId,
    user,
    currentSession,
    contextJoinSession,
    contextLeaveSession,
    socket,
    userId,
    unsubscribeRef,
  ]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !sessionId) return;

    // Handle session update event
    const handleSessionUpdate = (updatedSession) => {
      console.log("Session updated:", updatedSession);
      if (updatedSession.id === sessionId) {
        contextJoinSession(updatedSession);
      }
    };

    // Handle session ended event
    const handleSessionEnded = (data) => {
      const {
        sessionId: endedSessionId,
        endedBy,
        endedAt,
        totalParticipants,
      } = data;

      console.log(`Session ${endedSessionId} has been marked as completed`);

      if (endedSessionId === sessionId) {
        // Update session state if currentSession is available
        if (currentSession) {
          contextJoinSession({
            ...currentSession,
            status: "ended",
            endedAt: endedAt,
            totalParticipants:
              totalParticipants || currentSession.participants?.length || 0,
            participants: [], // Clear participants in the frontend state
          });
        }

        const endedByCurrentUser = endedBy === userId;
        const message = endedByCurrentUser
          ? "You have successfully completed this session. Redirecting to sessions page..."
          : "This session has been completed by the host. Redirecting to sessions page...";

        setSessionEndedMessage(message);

        // Redirect after a delay
        setTimeout(() => {
          navigate("/sessions");
        }, 3000);
      }
    };

    // Subscribe to socket events
    socket.on("session-updated", handleSessionUpdate);
    socket.on("session-ended", handleSessionEnded);
    socket.on("user-joined", (userData) =>
      console.log("User joined:", userData)
    );
    socket.on("user-left", (userData) => console.log("User left:", userData));

    // Cleanup on unmount
    return () => {
      socket.off("session-updated", handleSessionUpdate);
      socket.off("session-ended", handleSessionEnded);
      socket.off("user-joined");
      socket.off("user-left");
    };
  }, [socket, sessionId, userId, currentSession, contextJoinSession, navigate]);

  // Handle UI-triggered leave
  const handleLeave = () => {
    if (socket && currentSession) {
      console.log("Starting leave process for session:", sessionId);

      // Clean up socket connection
      socket.emit("leave-session", {
        sessionId,
        userId,
      });

      // Clean up context
      contextLeaveSession();
    }

    // Navigate away
    navigate("/sessions");
  };

  // Render component
  return (
    <>
      {sessionEndedMessage && (
        <Toast
          message={sessionEndedMessage}
          type="success"
          autoClose={true}
          autoCloseTime={3000}
          position="top-center"
        />
      )}

      {error ? (
        <div className="error-container">
          <p>Error: {error}</p>
          <button onClick={() => navigate("/sessions")}>
            Return to Sessions
          </button>
        </div>
      ) : loading ? (
        <div className="session-loading">
          <div className="loading-spinner"></div>
          <p>Loading session...</p>
        </div>
      ) : (
        <div className="collaborative-session">
          <SessionInfo
            session={currentSession}
            onLeave={handleLeave}
            socket={socket}
          />

          <div className="session-tabs">
            <Link to={`/session/${sessionId}`} className="tab active">
              Code Editor
            </Link>
            <Link to={`/session/${sessionId}/whiteboard`} className="tab">
              Whiteboard
            </Link>
          </div>

          <div className="session-content">
            <div className="editor-section">
              <CollaborativeEditor sessionId={sessionId} userId={userId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveSession;
