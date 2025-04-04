import PropTypes from "prop-types";
import { FaExclamationTriangle } from "react-icons/fa";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../hooks/useAuth";

const AlertDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  sessionId,
  title = "Leave Session",
  message = "Are you sure you want to leave this session?",
  confirmText = "Leave",
  cancelText = "Cancel",
}) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const handleConfirm = () => {
    // If this is a leave session dialog and we have socket & sessionId,
    // emit the appropriate events
    if (socket && sessionId && title.toLowerCase().includes("leave")) {
      console.log(`Emitting leave events for session ${sessionId}`);

      // First emit leave-session
      socket.emit("leave-session", {
        sessionId,
        userId: user?.uid,
      });

      // Then emit user-left-session for cleanup
      socket.emit("user-left-session", {
        sessionId,
        userId: user?.uid,
      });
    }

    onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div className="alert-overlay">
      <div className="alert-dialog">
        <div className="alert-icon">
          <FaExclamationTriangle />
        </div>
        <div className="alert-content">
          <h3>{title}</h3>
          <p>{message}</p>
        </div>
        <div className="alert-actions">
          <button className="alert-button cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="alert-button confirm" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

AlertDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  sessionId: PropTypes.string,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
};

export default AlertDialog;
