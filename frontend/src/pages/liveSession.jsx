import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSession } from "../contexts/SessionContext";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../contexts/SocketContext";
import { db, auth } from "../firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import SessionInfo from "../components/sessions/SessionInfo";
import CollaborativeEditor from "../components/editor/CollaborativeEditor";
import VideoChat from "../components/communications/VideoChat";

const CollaborativeSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { currentSession, joinSession, leaveSession } = useSession();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      navigate("/login");
      return;
    }

    // No need to emit join-session here, it's already handled in joinSession() function
    // if (socket) {
    //   socket.emit("join-session", {
    //     sessionId,
    //     userId,
    //     username: auth.currentUser?.displayName || "Anonymous",
    //     photoURL: auth.currentUser?.photoURL,
    //   });
    // }

    return () => {
      if (socket) {
        socket.emit("leave-session", { sessionId, userId });
      }
    };
  }, [sessionId, user, socket]);

  const initSession = async () => {
    try {
      // Try to get stored join info
      const storedJoinInfo = localStorage.getItem("lastJoinedSession");
      let joinCode = null;

      if (storedJoinInfo) {
        const { id, joinCode: storedCode } = JSON.parse(storedJoinInfo);
        if (id === sessionId) {
          joinCode = storedCode;
        }
      }

      await joinSession(sessionId, joinCode);
    } catch (error) {
      console.error("Error joining session:", error);
      setError(error.message);
      navigate("/dashboard/sessions");
    }
  };

  useEffect(() => {
    if (!currentSession || currentSession.id !== sessionId) {
      initSession();
    }

    return () => {
      if (socket && sessionId) {
        // Make sure to notify both regular session and observers
        socket.emit("leave-session", { sessionId, userId });
        socket.emit("user-left-session", { sessionId, userId });
      }
      leaveSession();
    };
  }, [sessionId]);

  useEffect(() => {
    setLoading(true);
    let unsubscribe;

    const initializeSession = async () => {
      try {
        // First, try to use currentSession if it matches current sessionId
        if (currentSession && currentSession.id === sessionId) {
          setSessionData(currentSession);
          setLoading(false);
        }

        // Set up real-time listener for session updates
        const sessionRef = doc(db, "sessions", sessionId);
        unsubscribe = onSnapshot(
          sessionRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = { id: snapshot.id, ...snapshot.data() };
              setSessionData(data);
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
      } catch (err) {
        console.error("Error initializing session:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializeSession();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      leaveSession();
    };
  }, [sessionId, currentSession]);

  const handleLeave = () => {
    if (socket && currentSession) {
      console.log("Starting leave process for session:", sessionId);

      // Create a promise that will resolve after leave events are sent
      const leavePromise = new Promise((resolve) => {
        // First leave the session
        socket.emit("leave-session", {
          sessionId,
          userId,
        });

        // Then leave video chat
        socket.emit("leave-video", {
          sessionId,
          userId,
        });

        // Allow a small delay for events to be processed
        setTimeout(() => {
          leaveSession(); // Clean up via context
          resolve();
        }, 150);
      });

      // Navigate after the leave promise resolves
      leavePromise.then(() => {
        console.log("Leave process completed, navigating away");
        navigate("/dashboard/sessions");
      });
    } else {
      // If no socket or session, just navigate
      navigate("/dashboard/sessions");
    }
  };

  const CheckScheduledSession = () => {
    useEffect(() => {
      const verifySessionStatus = async () => {
        try {
          const sessionRef = doc(db, "sessions", sessionId);
          const sessionSnap = await getDoc(sessionRef);

          if (!sessionSnap.exists()) {
            setError("Session not found");
            return;
          }

          const data = sessionSnap.data();
          console.log("Session data:", data);

          if (data.status === "scheduled") {
            // IMPORTANT: Parse dates and compare properly
            const scheduledTime = new Date(data.startTime);
            const now = new Date();

            console.log("Scheduled time:", scheduledTime);
            console.log("Current time:", now);
            console.log("Is scheduled for future:", scheduledTime > now);

            if (scheduledTime > now) {
              const formattedDate = scheduledTime.toLocaleString();
              setError(
                `This session is scheduled for ${formattedDate}. Please join at the scheduled time.`
              );
              setLoading(false);
            }
          }
        } catch (err) {
          console.error("Error checking session:", err);
          setError(err.message || "Failed to verify session status");
        }
      };

      verifySessionStatus();
    }, [sessionId]);

    return null;
  };

  return (
    <>
      <CheckScheduledSession />

      {error ? (
        <div className="error-container">
          <p>Error: {error}</p>
          <button onClick={() => navigate("/dashboard/sessions")}>
            Return to Sessions
          </button>
        </div>
      ) : loading ? (
        <div>Loading session...</div>
      ) : (
        <div className="collaborative-session">
          <SessionInfo
            session={currentSession}
            onLeave={handleLeave}
            socket={socket}
          />

          <div className="session-tabs">
            <Link to={`/dashboard/sessions/${sessionId}`} className="tab">
              Code Editor
            </Link>
            <Link
              to={`/dashboard/sessions/${sessionId}/whiteboard`}
              className="tab"
            >
              Whiteboard
            </Link>
          </div>

          <div className="session-content">
            <div className="editor-section">
              <CollaborativeEditor sessionId={sessionId} userId={userId} />
              <VideoChat sessionId={sessionId} userId={userId} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CollaborativeSession;
