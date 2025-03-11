import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaClock, FaUsers, FaCode, FaLock, FaLockOpen, FaEdit, FaTrash } from 'react-icons/fa';
import { io } from 'socket.io-client';

const SessionCard = ({ session, isOwner, onJoin, onEdit, onDelete, view }) => {
  const [participantCount, setParticipantCount] = useState(session.participants?.length || 0);
  
  useEffect(() => {
    // Only connect to socket if session is active
    if (session.status !== 'active') return;

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket']
    });

    // Join the session room as an observer
    socket.emit('observe-session', { sessionId: session.id });

    // Listen for participant updates
    socket.on('participants-update', ({ count }) => {
      setParticipantCount(count);
    });

    return () => {
      socket.disconnect();
    };
  }, [session.id, session.status]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    try {
      const date = typeof dateString === 'object' ? dateString : new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'status-badge green';
      case 'scheduled': return 'status-badge blue';
      default: return 'status-badge gray';
    }
  };

  // Ensure maxParticipants is a number
  const maxParticipants = Number(session.maxParticipants) || 0;

  // Add boolean conversion for isPrivate
  const isPrivate = Boolean(session.isPrivate);

  // Add default language handling
  const displayLanguage = session.language || 'javascript';

  return (
    <div className={`session-card ${view}`}>
      <div className="session-header">
        <h3>{session.title}</h3>
        <span className={getStatusClass(session.status)}>
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </span>
      </div>

      <p className="session-description">{session.description}</p>

      <div className="session-details">
        <div className="detail-item">
          <FaClock />
          <span>{formatDate(session.startTime || session.createdAt)}</span>
        </div>
        <div className="detail-item">
          <FaUsers />
          <span>{participantCount}/{maxParticipants}</span>
        </div>
        <div className="detail-item">
          <FaCode />
          <span>{displayLanguage}</span>
        </div>
        <div className="detail-item">
          {isPrivate ? <FaLock /> : <FaLockOpen />}
          <span>{isPrivate ? 'Private' : 'Public'}</span>
        </div>
      </div>

      <div className="session-actions">
        {isOwner ? (
          <>
            <button onClick={() => onEdit(session)} className="edit-button">
              <FaEdit /> Edit
            </button>
            <button onClick={() => onDelete(session.id)} className="delete-button">
              <FaTrash /> Delete
            </button>
          </>
        ) : (
          <button 
            onClick={() => onJoin(session.id)} 
            className="join-button"
            disabled={participantCount >= maxParticipants}
          >
            {participantCount >= maxParticipants ? 'Session Full' : 'Join Session'}
          </button>
        )}
      </div>
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
    maxParticipants: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    participants: PropTypes.array,
    isPrivate: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]).isRequired // Allow both boolean and string
  }).isRequired,
  isOwner: PropTypes.bool.isRequired,
  onJoin: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  view: PropTypes.oneOf(['grid', 'list']).isRequired
};

export default SessionCard; 