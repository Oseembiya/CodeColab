import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FaClock, FaUsers, FaCode, FaLock, FaLockOpen, FaChevronUp } from 'react-icons/fa';
import AlertDialog from '../notifications/AlertDialog';

const SessionInfo = ({ session, onLeave, socket }) => {
  const [participantCount, setParticipantCount] = useState(0);
  const [isHidden, setIsHidden] = useState(false);
  const [showLeaveAlert, setShowLeaveAlert] = useState(false);

  useEffect(() => {
    if (!socket || !session?.id) return;

    // Set initial count from session
    setParticipantCount(session.participants?.length || 0);

    // Listen for participant count updates
    const handleParticipantUpdate = ({ participants, count }) => {
      console.log('Received participant update:', { count, participants });
      setParticipantCount(count);
    };

    socket.on('participants-update', handleParticipantUpdate);

    return () => {
      socket.off('participants-update', handleParticipantUpdate);
    };
  }, [socket, session?.id]);

  if (!session || !session.title) {
    return (
      <div className="session-info loading">
        <p>Loading session information...</p>
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

  return (
    <>
      <div className={`session-info ${isHidden ? 'hidden' : ''}`}>
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
            <span>Participants: {participantCount}/{session.maxParticipants}</span>
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
    joinCode: PropTypes.string
  }),
  onLeave: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired
};

SessionInfo.defaultProps = {
  session: null
};

export default SessionInfo; 