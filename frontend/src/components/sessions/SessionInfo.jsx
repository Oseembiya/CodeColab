import { useEffect, useState } from "react";
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

const SessionInfo = ({ session, onLeave, socket }) => {
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

    // Listen for participant count updates
    const handleParticipantUpdate = ({ sessionId, participants, count }) => {
      // Add sessionId check to ensure we only update for the current session
      if (sessionId === session.id) {
        console.log("Received participant update:", { count, participants });
        setParticipantCount(count);
      }
    };

    socket.on("participants-update", handleParticipantUpdate);

    return () => {
      socket.off("participants-update", handleParticipantUpdate);
    };
  }, [socket, session?.id]);

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
    setShowLeaveAlert(false);
    onLeave();
  };

  const handleCancelLeave = () => {
    setShowLeaveAlert(false);
  };

  const handleEndSession = () => {
    setShowEndAlert(true);
  };

  const handleConfirmEndSession = async () => {
    setShowEndAlert(false);
    try {
      const sessionRef = doc(db, "sessions", session.id);

      // First, get the historical metrics for this session to count all participants
      // who ever joined this session, even if they left before it ended
      const userMetricsRef = collection(db, "userMetrics");
      const metricsQuery = query(
        userMetricsRef,
        where("sessionsJoined", "array-contains", session.id)
      );

      let totalHistoricalParticipants = 0;
      try {
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

      await updateDoc(sessionRef, {
        status: SESSION_STATUS.ENDED,
        endedAt: new Date().toISOString(),
        completedBy: user.uid,
        totalParticipants: totalParticipants, // Store the total historical participant count
        participants: [], // Clear active participants list when session is completed
      });

      // Notify other participants the session has ended
      if (socket) {
        socket.emit("session-ended", {
          sessionId: session.id,
          userId: user.uid,
          totalParticipants: totalParticipants,
        });
      }

      onLeave(); // Navigate away after ending
    } catch (err) {
      console.error("Error ending session:", err);
    }
  };

  const handleCancelEndSession = () => {
    setShowEndAlert(false);
  };

  // Check if current user is the session owner
  const isOwner = user && session.owner === user.uid;

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
              Participants: {participantCount}/{session.maxParticipants}
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
  session: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    startTime: PropTypes.string,
    language: PropTypes.string,
    maxParticipants: PropTypes.number,
    participants: PropTypes.array,
    isPrivate: PropTypes.bool,
    joinCode: PropTypes.string,
    owner: PropTypes.string,
  }),
  onLeave: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired,
};

SessionInfo.defaultProps = {
  session: null,
};

export default SessionInfo;
