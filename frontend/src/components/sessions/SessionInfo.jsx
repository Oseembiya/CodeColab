import PropTypes from 'prop-types';
import { FaClock, FaUsers, FaCode, FaLock, FaLockOpen } from 'react-icons/fa';

const SessionInfo = ({ session, onLeave }) => {
  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave this session?')) {
      onLeave();
    }
  };

  return (
    <div className="session-info">
      <div className="session-info-header">
        <h2>{session.title}</h2>
        {session.isPrivate ? <FaLock /> : <FaLockOpen />}
        <button 
          className="leave-button"
          onClick={handleLeave}
        >
          Leave Session
        </button>
      </div>
      
      <div className="session-meta">
        <div className="meta-item">
          <FaClock />
          <span>Started: {new Date(session.startTime).toLocaleString()}</span>
        </div>
        <div className="meta-item">
          <FaUsers />
          <span>Participants: {session.participants?.length || 0}/{session.maxParticipants}</span>
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
    </div>
  );
};

SessionInfo.propTypes = {
  session: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    startTime: PropTypes.string.isRequired,
    language: PropTypes.string.isRequired,
    maxParticipants: PropTypes.number.isRequired,
    participants: PropTypes.array,
    isPrivate: PropTypes.bool,
    joinCode: PropTypes.string
  }).isRequired,
  onLeave: PropTypes.func.isRequired
};

export default SessionInfo; 