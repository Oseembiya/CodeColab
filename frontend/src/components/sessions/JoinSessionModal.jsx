import { useState } from 'react';
import PropTypes from 'prop-types';
import { FaTimes } from 'react-icons/fa';

const JoinSessionModal = ({ isOpen, onClose, onJoin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter a session code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onJoin(code.trim());
      setCode('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Join Session</h2>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="sessionCode">Session Code</label>
            <input
              type="text"
              id="sessionCode"
              value={code}
              onChange={(e) => {
                setError('');
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="Enter session code"
              maxLength={6}
              disabled={loading}
              required
            />
            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="cancel-button"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading || !code.trim()}
              className={`join-button ${loading ? 'loading' : ''}`}
            >
              {loading ? '' : 'Join Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

JoinSessionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onJoin: PropTypes.func.isRequired
};

export default JoinSessionModal; 