import PropTypes from 'prop-types';
import { FaClock, FaUsers, FaCode, FaLock, FaLockOpen } from 'react-icons/fa';

const SessionInfo = ({ session, onLeave }) => {
  if (!session || !session.title) {
    return (
      <div className="session-info loading">
        <p>Loading session information...</p>
      </div>
    );
  }

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
          Leave
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
    title: PropTypes.string,
    description: PropTypes.string,
    startTime: PropTypes.string,
    language: PropTypes.string,
    maxParticipants: PropTypes.number,
    participants: PropTypes.array,
    isPrivate: PropTypes.bool,
    joinCode: PropTypes.string
  }),
  onLeave: PropTypes.func.isRequired
};

SessionInfo.defaultProps = {
  session: null
};

export default SessionInfo; 