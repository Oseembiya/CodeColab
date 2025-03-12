import PropTypes from 'prop-types';
import { FaExclamationTriangle } from 'react-icons/fa';

const AlertDialog = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="alert-overlay">
      <div className="alert-dialog">
        <div className="alert-icon">
          <FaExclamationTriangle />
        </div>
        <div className="alert-content">
          <h3>Leave Session</h3>
          <p>Are you sure you want to leave this session?</p>
        </div>
        <div className="alert-actions">
          <button className="alert-button cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="alert-button confirm" onClick={onConfirm}>
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

AlertDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default AlertDialog;