import PropTypes from 'prop-types';
import { FaClock, FaUsers, FaCode, FaLock, FaLockOpen, FaEdit, FaTrash } from 'react-icons/fa';

const SessionCard = ({ session, isOwner, onJoin, onEdit, onDelete, view }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'status-badge green';
      case 'scheduled': return 'status-badge blue';
      default: return 'status-badge gray';
    }
  };

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
          <span>{formatDate(session.startTime)}</span>
        </div>
        <div className="detail-item">
          <FaUsers />
          <span>{session.participants?.length || 0}/{session.maxParticipants}</span>
        </div>
        <div className="detail-item">
          <FaCode />
          <span>{session.language}</span>
        </div>
        <div className="detail-item">
          {session.isPrivate ? <FaLock /> : <FaLockOpen />}
          <span>{session.isPrivate ? 'Private' : 'Public'}</span>
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
          <button onClick={() => onJoin(session.id)} className="join-button">
            Join Session
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
    startTime: PropTypes.string.isRequired,
    language: PropTypes.string.isRequired,
    maxParticipants: PropTypes.number.isRequired,
    participants: PropTypes.array,
    isPrivate: PropTypes.bool.isRequired
  }).isRequired,
  isOwner: PropTypes.bool.isRequired,
  onJoin: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  view: PropTypes.oneOf(['grid', 'list']).isRequired
};

export default SessionCard; 