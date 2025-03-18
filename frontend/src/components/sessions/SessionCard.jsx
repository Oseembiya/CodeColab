import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  FaClock,
  FaUsers,
  FaCode,
  FaLock,
  FaLockOpen,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { useSocket } from "../../contexts/SocketContext";

const SessionCard = ({ session, isOwner, onJoin, view }) => {
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

      // Listen for user left events
      socket.on("user-left-session", ({ sessionId }) => {
        if (sessionId === session.id) {
          // Update participant count
          setParticipantCount((prev) => Math.max(0, prev - 1));
        }
      });

      // Cleanup function
      return () => {
        socket.off("participants-update", updateHandler);
        socket.off("user-left-session");
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

  return (
    <div className={`session-card ${view}`}>
      {view === "grid" ? (
        // Grid View Layout
        <>
          <span
            className={`status-badge ${
              session.status === "active" ? "green" : ""
            }`}
          >
            {session.status}
          </span>

          <h3>{session.title}</h3>

          {session.description && (
            <p className="session-description">{session.description}</p>
          )}

          <div className="session-details">
            <div className="detail-item">
              <FaClock />
              <span>{formatDate(session.startTime || session.createdAt)}</span>
            </div>
            <div className="detail-item">
              <FaUsers />
              <span>
                {participantCount}/{maxParticipants}
              </span>
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

          <button
            onClick={() => onJoin(session.id)}
            className="join-button"
            disabled={participantCount >= maxParticipants}
          >
            {participantCount >= maxParticipants
              ? "Session Full"
              : "Join Session"}
          </button>
        </>
      ) : (
        // List View Layout
        <>
          <div className="title-area">
            <h3>
              {session.title}
              <span
                className={`status-badge ${
                  session.status === "active" ? "green" : ""
                }`}
              >
                {session.status}
              </span>
            </h3>
            {session.description && (
              <p className="session-description">{session.description}</p>
            )}
          </div>

          <div className="session-details">
            <div className="detail-item">
              <FaClock />
              <span>{formatDate(session.startTime || session.createdAt)}</span>
            </div>
            <div className="detail-item">
              <FaCode />
              <span>{displayLanguage}</span>
            </div>
          </div>

          <div className="session-details">
            <div className="detail-item">
              <FaUsers />
              <span>
                {participantCount}/{maxParticipants}
              </span>
            </div>
            <div className="detail-item">
              {isPrivate ? <FaLock /> : <FaLockOpen />}
              <span>{isPrivate ? "Private" : "Public"}</span>
            </div>
          </div>

          <button
            onClick={() => onJoin(session.id)}
            className="join-button"
            disabled={participantCount >= maxParticipants}
          >
            {participantCount >= maxParticipants ? "Full" : "Join"}
          </button>
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
  isOwner: PropTypes.bool.isRequired,
  onJoin: PropTypes.func.isRequired,
  view: PropTypes.oneOf(["grid", "list"]).isRequired,
};

export default SessionCard;
