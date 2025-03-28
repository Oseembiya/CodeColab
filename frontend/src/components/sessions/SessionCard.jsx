import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FaClock, FaUsers, FaCode, FaLock, FaLockOpen } from "react-icons/fa";
import { useSocket } from "../../contexts/SocketContext";

const SessionCard = ({ session, onJoin, view }) => {
  const [participantCount, setParticipantCount] = useState(
    session.participants?.length || 0
  );
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Only proceed if socket is connected and session is active
    if (!socket || !isConnected || session.status !== "active") return;

    try {
      // Create a unique room identifier for observation
      const observerRoom = `observe:${session.id}`;

      // Join the observer room instead of the main session
      socket.emit("observe-session", {
        sessionId: session.id,
        observerRoom,
      });

      // Listen for participant updates only for this session
      const updateHandler = ({ sessionId, count }) => {
        if (sessionId === session.id) {
          setParticipantCount(count);
        }
      };

      socket.on("participants-update", updateHandler);

      // Enhanced user-left-session handler
      const userLeftHandler = ({ sessionId }) => {
        if (sessionId === session.id) {
          // Request a fresh participant count rather than decrementing
          socket.emit("request-participant-count", { sessionId: session.id });
        }
      };

      socket.on("user-left-session", userLeftHandler);

      // Cleanup function
      return () => {
        socket.off("participants-update", updateHandler);
        socket.off("user-left-session", userLeftHandler);
        socket.emit("leave-observer", {
          sessionId: session.id,
          observerRoom,
        });
      };
    } catch (error) {
      console.error("Socket operation error:", error);
    }
  }, [socket, isConnected, session.id, session.status]);

  const formatDate = (dateString) => {
    if (!dateString) return "Date not available";
    try {
      const date =
        typeof dateString === "object" ? dateString : new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "active":
        return "status-badge green";
      case "scheduled":
        return "status-badge blue";
      case "ended":
        return "status-badge red";
      default:
        return "status-badge gray";
    }
  };

  // Ensure maxParticipants is a number
  const maxParticipants = Number(session.maxParticipants) || 0;

  // Add boolean conversion for isPrivate
  const isPrivate = Boolean(session.isPrivate);

  // Add default language handling
  const displayLanguage = session.language || "javascript";

  const displayParticipantCount = () => {
    if (session.status === "scheduled") {
      // For scheduled sessions, show "0/X" or special message
      return `0/${maxParticipants}`;
    } else if (session.status === "ended") {
      // For ended sessions, use the new totalParticipants field if available
      const totalParticipants =
        session.totalParticipants || session.participants?.length || 0;
      return `${totalParticipants} Participated`;
    } else {
      // For active sessions, show actual count
      return `${participantCount}/${maxParticipants}`;
    }
  };

  // Determine join button text and disabled state based on session status
  const getJoinButtonProps = () => {
    if (session.status === "ended") {
      return {
        text: "Completed",
        disabled: true,
      };
    } else if (session.status === "scheduled") {
      const scheduledTime = new Date(session.startTime);
      const now = new Date();
      const isInFuture = scheduledTime > now;

      return {
        text: isInFuture ? "Scheduled" : "Join Session",
        disabled: isInFuture,
      };
    } else {
      return {
        text:
          participantCount >= maxParticipants ? "Session Full" : "Join Session",
        disabled: participantCount >= maxParticipants,
      };
    }
  };

  const joinButtonProps = getJoinButtonProps();
  const statusBadge = (
    <span className={getStatusClass(session.status)}>{session.status}</span>
  );

  // Common session details that appear in both views
  const renderSessionDetails = (isFullDetails = true) => (
    <div className="session-details">
      <div className="detail-item">
        <FaClock />
        <span>{formatDate(session.startTime || session.createdAt)}</span>
      </div>
      {isFullDetails && (
        <>
          <div className="detail-item">
            <FaUsers />
            <span>{displayParticipantCount()}</span>
          </div>
          <div className="detail-item">
            <FaCode />
            <span>{displayLanguage}</span>
          </div>
          <div className="detail-item">
            {isPrivate ? <FaLock /> : <FaLockOpen />}
            <span>{isPrivate ? "Private" : "Public"}</span>
          </div>
        </>
      )}
    </div>
  );

  // Join button that appears in both views
  const renderJoinButton = () => (
    <button
      onClick={() => onJoin(session.id)}
      className="join-button"
      disabled={joinButtonProps.disabled}
    >
      {joinButtonProps.text}
    </button>
  );

  return (
    <div className={`session-card ${view}`}>
      {view === "grid" ? (
        // Grid View Layout
        <>
          {statusBadge}
          <h3>{session.title}</h3>
          {session.description && (
            <p className="session-description">{session.description}</p>
          )}
          {renderSessionDetails(true)}
          {renderJoinButton()}
        </>
      ) : (
        // List View Layout
        <>
          <div className="title-area">
            <h3>
              {session.title}
              {statusBadge}
            </h3>
            {session.description && (
              <p className="session-description">{session.description}</p>
            )}
          </div>
          {renderSessionDetails(false)}
          <div className="session-details">
            <div className="detail-item">
              <FaUsers />
              <span>{displayParticipantCount()}</span>
            </div>
            <div className="detail-item">
              <FaCode />
              <span>{displayLanguage}</span>
            </div>
            <div className="detail-item">
              {isPrivate ? <FaLock /> : <FaLockOpen />}
              <span>{isPrivate ? "Private" : "Public"}</span>
            </div>
          </div>
          {renderJoinButton()}
        </>
      )}
    </div>
  );
};

SessionCard.propTypes = {
  session: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    status: PropTypes.string.isRequired,
    startTime: PropTypes.string,
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    language: PropTypes.string,
    maxParticipants: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
      .isRequired,
    participants: PropTypes.array,
    isPrivate: PropTypes.oneOfType([PropTypes.bool, PropTypes.string])
      .isRequired, // Allow both boolean and string
  }).isRequired,
  onJoin: PropTypes.func.isRequired,
  view: PropTypes.oneOf(["grid", "list"]).isRequired,
};

export default SessionCard;
