import { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import {
  FaClock,
  FaUsers,
  FaCode,
  FaLock,
  FaLockOpen,
  FaChevronUp,
  FaStop,
} from "react-icons/fa";
import AlertDialog from "../notifications/AlertDialog";
import { useAuth } from "../../hooks/useAuth";

import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { SESSION_STATUS } from "../../config/constants";

const SessionInfo = ({ session = null, onLeave = () => {}, socket = null }) => {
  const [participantCount, setParticipantCount] = useState(0);
  const [isHidden, setIsHidden] = useState(true);
  const [showLeaveAlert, setShowLeaveAlert] = useState(false);
  const [showEndAlert, setShowEndAlert] = useState(false);
  const { user } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (!socket || !session?.id) return;

    // Set initial count from session
    setParticipantCount(session.participants?.length || 0);

    // Avoid frequent polling - create refs for timing control
    const lastRequestTime = useRef(0);
    const requestTimeoutRef = useRef(null);

    // Request accurate participant count from server only once on mount
    socket.emit("request-participant-count", { sessionId: session.id });

    // Listen for participant count updates
    const handleParticipantUpdate = ({ sessionId, participants, count }) => {
      // Add sessionId check to ensure we only update for the current session
      if (sessionId === session.id) {
        console.log("Received participant update:", { count, participants });
        // Validate count (prevent negative or unreasonably large values)
        const validCount =
          typeof count === "number"
            ? Math.min(Math.max(0, count), session.maxParticipants)
            : participants?.length || 0;

        setParticipantCount(validCount);
      }
    };

    socket.on("participants-update", handleParticipantUpdate);

    // Set up a periodic refresh of the participant count - but limit to no more than once every 30 seconds
    const refreshInterval = setInterval(() => {
      const now = Date.now();
      // Only request if it's been at least 30 seconds since the last request
      if (now - lastRequestTime.current > 30000) {
        lastRequestTime.current = now;
        if (socket.connected) {
          socket.emit("request-participant-count", { sessionId: session.id });
        }
      }
    }, 60000); // Check every 60 seconds

    return () => {
      socket.off("participants-update", handleParticipantUpdate);
      clearInterval(refreshInterval);
      if (requestTimeoutRef.current) {
        clearTimeout(requestTimeoutRef.current);
      }
    };
  }, [socket, session?.id, session?.maxParticipants]);

  useEffect(() => {
    // If we have a session already, clear any timeout
    if (session?.id) {
      setLoadingTimeout(false);
      return;
    }

    // Set a timeout for the loading state
    const timeout = setTimeout(() => {
      setLoadingTimeout(true);
    }, 3000); // 3 seconds is reasonable

    return () => clearTimeout(timeout);
  }, [session]);

  if (!session || !session.title) {
    return (
      <div className="session-info loading">
        {loadingTimeout ? (
          <div className="status-message warning">
            <p>
              Session information taking longer than expected. Please try
              refreshing if this persists.
            </p>
          </div>
        ) : (
          <div className="loading-message">Loading session information...</div>
        )}
      </div>
    );
  }

  const handleLeave = () => {
    setShowLeaveAlert(true);
  };

  const handleConfirmLeave = () => {
    try {
      setShowLeaveAlert(false);

      // Notify socket server that user is leaving
      if (socket) {
        socket.emit("leave-session", {
          sessionId: session.id,
          userId: user?.uid,
        });

        console.log(`Sent leave-session event for session ${session.id}`);
      }

      // Call the parent component's onLeave handler
      onLeave();
    } catch (error) {
      console.error("Error leaving session:", error);
      // Still call onLeave to ensure UI state is cleared
      onLeave();
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveAlert(false);
  };

  const handleEndSession = () => {
    // Double-check that the user is the owner before allowing session to be ended
    if (!isOwner) {
      console.error("Only the host can end the session");
      return;
    }

    setShowEndAlert(true);
  };

  const handleConfirmEndSession = async () => {
    setShowEndAlert(false);
    try {
      // Verify once more that the user is the owner
      if (!isOwner) {
        console.error("Only the host can end the session");
        return;
      }

      const sessionRef = doc(db, "sessions", session.id);

      // First, get the historical metrics for this session to count all participants
      // who ever joined this session, even if they left before it ended
      let totalHistoricalParticipants = 0;

      try {
        const userMetricsRef = collection(db, "userMetrics");
        const metricsQuery = query(
          userMetricsRef,
          where("sessionsJoined", "array-contains", session.id)
        );
        const metricsSnapshot = await getDocs(metricsQuery);

        // Count the unique users who joined this session based on metrics
        const uniqueParticipantIds = new Set();

        metricsSnapshot.forEach((doc) => {
          uniqueParticipantIds.add(doc.id); // Add user ID to the set
        });

        totalHistoricalParticipants = uniqueParticipantIds.size;
        console.log(
          `Found ${totalHistoricalParticipants} historical participants for session ${session.id}`
        );
      } catch (metricsError) {
        console.error("Error fetching historical participants:", metricsError);
        // Fallback to current participants if metrics query fails
        totalHistoricalParticipants = session.participants?.length || 0;
      }

      // Use the historical count, but ensure it's at least as large as current participants
      const currentParticipants = session.participants?.length || 0;
      const totalParticipants = Math.max(
        totalHistoricalParticipants,
        currentParticipants
      );

      // Update Firestore document
      await updateDoc(sessionRef, {
        status: SESSION_STATUS.ENDED,
        endedAt: new Date().toISOString(),
        completedBy: user.uid,
        totalParticipants: totalParticipants, // Store the total historical participant count
        participants: [], // Clear active participants list when session is completed
      });

      console.log(`Updated Firestore session ${session.id} to ENDED status`);

      // Notify other participants the session has ended
      if (socket) {
        socket.emit("session-ended", {
          sessionId: session.id,
          userId: user.uid,
          totalParticipants: totalParticipants,
        });

        console.log(`Sent session-ended event for session ${session.id}`);
      }

      // Navigate away after ending
      onLeave();
    } catch (err) {
      console.error("Error ending session:", err);
      // Still try to exit the session even if there was an error
      if (socket) {
        socket.emit("session-ended", {
          sessionId: session.id,
          userId: user.uid,
        });
      }

      // Always navigate away from the session page
      onLeave();
    }
  };

  const handleCancelEndSession = () => {
    setShowEndAlert(false);
  };

  // Check if current user is the session owner
  const isOwner = user && session.hostId === user.uid;

  return (
    <>
      <div className={`session-info ${isHidden ? "hidden" : ""}`}>
        <div className="session-info-header">
          <h2>{session.title}</h2>
          {session.isPrivate ? <FaLock /> : <FaLockOpen />}
          <div className="session-actions">
            {isOwner ? (
              <button
                className="end-session-button"
                onClick={handleEndSession}
                title="Complete this session for all participants"
              >
                <FaStop /> Complete Session
              </button>
            ) : (
              <button className="leave-button" onClick={handleLeave}>
                Leave
              </button>
            )}
          </div>
        </div>

        <div className="session-meta">
          <div className="meta-item">
            <FaClock />
            <span>Started: {new Date(session.startTime).toLocaleString()}</span>
          </div>
          <div className="meta-item">
            <FaUsers />
            <span>
              Participants: {participantCount}/{session.maxParticipants || 10}
            </span>
          </div>
          <div className="meta-item">
            <FaCode />
            <span>Language: {session.language}</span>
          </div>
        </div>

        {session.description && (
          <p className="session-description">{session.description}</p>
        )}

        {session.isPrivate && session.joinCode && (
          <div className="session-join-code">
            Join Code: <span>{session.joinCode}</span>
          </div>
        )}

        <button
          className="session-info-toggle"
          onClick={() => setIsHidden(!isHidden)}
        >
          <FaChevronUp />
        </button>
      </div>

      <AlertDialog
        isOpen={showLeaveAlert}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
        title="Leave Session"
        message="Are you sure you want to leave this session?"
        confirmText="Leave"
        cancelText="Cancel"
        sessionId={session?.id}
      />

      <AlertDialog
        isOpen={showEndAlert}
        onConfirm={handleConfirmEndSession}
        onCancel={handleCancelEndSession}
        title="Complete Session"
        message="Are you sure you want to end this session ?"
        confirmText="Complete Session"
        cancelText="Cancel"
        sessionId={session?.id}
      />
    </>
  );
};

SessionInfo.propTypes = {
  session: PropTypes.object,
  onLeave: PropTypes.func,
  socket: PropTypes.object,
};

export default SessionInfo;
