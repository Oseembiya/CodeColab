import { useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { FaTimes } from 'react-icons/fa';

const generateJoinCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from(
    { length: 6 },
    () => characters.charAt(Math.floor(Math.random() * characters.length))
  ).join('');
};

const CreateSessionModal = ({ onClose, onSubmit }) => {
  const joinCodeRef = useRef('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    language: 'javascript',
    maxParticipants: 4,
    isPrivate: false,
    startNow: true,
    joinCode: '',
    scheduledDate: '',
    scheduledTime: ''
  });

  const languages = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'cpp', name: 'C++' },
    { id: 'csharp', name: 'C#' }
  ];

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      if (name === 'isPrivate') {
        const newIsPrivate = type === 'checkbox' ? checked : value;
        
        if (newIsPrivate) {
          if (!joinCodeRef.current) {
            joinCodeRef.current = generateJoinCode();
            console.log('Generated Join Code:', joinCodeRef.current);
          }
          return {
            ...prev,
            isPrivate: true,
            joinCode: joinCodeRef.current
          };
        } else {
          joinCodeRef.current = '';
          return {
            ...prev,
            isPrivate: false,
            joinCode: ''
          };
        }
      }
      
      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleClose = () => {
    joinCodeRef.current = '';
    onClose();
  };

  return (
    <div className="create-session-modal">
      <div className="create-session-content">
        <div className="create-session-header">
          <h2>Create New Session</h2>
          <button className="close-button" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="create-session-form">
          <div className="form-columns">
            <div className="form-column">
              <div className="form-group">
                <label htmlFor="title">Session Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  maxLength={50}
                  placeholder="Enter session title"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={200}
                  placeholder="Describe your session"
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="language">Programming Language</label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                  >
                    {languages.map(lang => (
                      <option key={lang.id} value={lang.id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="maxParticipants">Max Participants</label>
                  <input
                    type="number"
                    id="maxParticipants"
                    name="maxParticipants"
                    value={formData.maxParticipants}
                    onChange={handleChange}
                    min={2}
                    max={10}
                  />
                </div>
              </div>
            </div>

            <div className="form-column">
              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isPrivate"
                    checked={formData.isPrivate}
                    onChange={handleChange}
                  />
                  <span className="checkbox-text">Make Session Private</span>
                </label>
              </div>

              <div className="form-group radio-group">
                <label>Session Start</label>
                <div className="radio-options">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="startNow"
                      checked={formData.startNow}
                      onChange={() => setFormData(prev => ({ ...prev, startNow: true }))}
                    />
                    <span>Start Now</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="startNow"
                      checked={!formData.startNow}
                      onChange={() => setFormData(prev => ({ ...prev, startNow: false }))}
                    />
                    <span>Schedule Later</span>
                  </label>
                </div>
              </div>

              {!formData.startNow && (
                <div className="form-group schedule-inputs">
                  <div className="schedule-row">
                    <div className="form-group">
                      <label htmlFor="scheduledDate">Date</label>
                      <input
                        type="date"
                        id="scheduledDate"
                        name="scheduledDate"
                        value={formData.scheduledDate}
                        onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="scheduledTime">Time</label>
                      <input
                        type="time"
                        id="scheduledTime"
                        name="scheduledTime"
                        value={formData.scheduledTime}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.isPrivate && (
                <div className="form-group join-code-group">
                  <label htmlFor="joinCode">Join Code</label>
                  <input
                    type="text"
                    id="joinCode"
                    value={formData.joinCode}
                    readOnly
                    className="join-code"
                  />
                  <small>Share this code with participants to join the session</small>
                </div>
              )}
            </div>
          </div>

          <div className="create-session-footer">
            <button type="button" className="cancel-button" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CreateSessionModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export default CreateSessionModal; 