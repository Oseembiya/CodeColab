import { useState } from 'react';
import PropTypes from 'prop-types';
import { FaTimes } from 'react-icons/fa';

const JoinSessionModal = ({ onClose, onJoin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter a join code');
      return;
    }
    onJoin(code.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Join Session</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="joinCode">Enter Session Code</label>
            <input
              type="text"
              id="joinCode"
              value={code}
              onChange={(e) => {
                setError('');
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
            />
            {error && <span className="error">{error}</span>}
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Join Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

JoinSessionModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onJoin: PropTypes.func.isRequired
};

export default JoinSessionModal; 