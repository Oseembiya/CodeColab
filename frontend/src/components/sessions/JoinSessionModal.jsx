import { useState } from "react";
import PropTypes from "prop-types";
import { FaTimes } from "react-icons/fa";

const JoinSessionModal = ({
  isOpen,
  onClose,
  onJoin,
  error: parentError,
  sessionId,
}) => {
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!code.trim()) {
      setLocalError("Please enter a session code");
      return;
    }

    setLoading(true);
    setLocalError("");

    try {
      await onJoin(code.trim().toUpperCase());
      setCode("");
    } catch (err) {
      console.error("Join session error:", err);
      setLocalError(err.message || "Failed to join session");
    } finally {
      setLoading(false);
    }
  };

  // Reset form when modal closes
  const handleClose = () => {
    setCode("");
    setLocalError("");
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{sessionId ? "Join Private Session" : "Join by Code"}</h2>
          <button className="close-button" onClick={handleClose}>
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
                setLocalError("");
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="Enter 6-digit code"
              maxLength={6}
              disabled={loading}
              required
            />
            {(localError || parentError) && (
              <div className="error-message">{localError || parentError}</div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className={`join-button ${loading ? "loading" : ""}`}
            >
              {loading ? "Joining..." : "Join Session"}
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
  onJoin: PropTypes.func.isRequired,
  error: PropTypes.string,
  sessionId: PropTypes.string,
};

export default JoinSessionModal;
