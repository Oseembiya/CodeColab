import { useState } from "react";
import PropTypes from "prop-types";
import { FaClock, FaUsers, FaCode, FaLock, FaLockOpen } from "react-icons/fa";
import { useParticipantCount } from "../../hooks/useParticipantCount";

const SessionCard = ({ session, onJoin, view, isOwner }) => {
  // Use the simplified hook - just pass sessionId and observer flag
  const participantCount = useParticipantCount(session.id, true);

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

  // Add boolean conversion for isPrivate
  const isPrivate = Boolean(session.isPrivate);

  // Add default language handling
  const displayLanguage = session.language || "javascript";

  // Ensure maxParticipants is a number
  const maxParticipants = Number(session.maxParticipants) || 10;

  const displayParticipantCount = () => {
    // Use reliable defaults in case of missing data
    if (!session) return "0/10";

    if (session.status === "scheduled") {
      // For scheduled sessions, show "0/X" or special message
      return `0/${maxParticipants > 0 ? maxParticipants : 10}`;
    } else if (session.status === "ended") {
      // For ended sessions, use the totalParticipants field if available
      const totalParticipants =
        session.totalParticipants ||
        (Array.isArray(session.participants) ? session.participants.length : 0);
      return `${totalParticipants} Participated`;
    } else {
      // For active sessions, use current count or participants array length
      return `${
        participantCount ||
        (Array.isArray(session.participants) ? session.participants.length : 0)
      }/${maxParticipants > 0 ? maxParticipants : 10}`;
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
    status: PropTypes.string,
    startTime: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    language: PropTypes.string,
    maxParticipants: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    participants: PropTypes.array,
    hostId: PropTypes.string,
    isPrivate: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    totalParticipants: PropTypes.number,
  }).isRequired,
  onJoin: PropTypes.func.isRequired,
  view: PropTypes.oneOf(["grid", "list"]).isRequired,
  isOwner: PropTypes.bool,
};

export default SessionCard;
