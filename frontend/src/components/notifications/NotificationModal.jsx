import { memo } from 'react';
import PropTypes from 'prop-types';
import { FaTimes, FaCircle } from 'react-icons/fa';

const NotificationModal = memo(({ isOpen, onClose, type }) => {
  const notifications = type === 'email' ? [
    {
      id: 1,
      sender: 'John Doe',
      subject: 'New collaboration request',
      message: 'Hi! Would you like to collaborate on a project?',
      time: '2 hours ago',
      unread: true
    },
    {
      id: 2,
      sender: 'Jane Smith',
      subject: 'Code review completed',
      message: 'I have finished reviewing your code. Check it out!',
      time: '5 hours ago',
      unread: true
    }
  ] : [
    {
      id: 1,
      title: 'New Session Invite',
      message: 'You have been invited to join a coding session',
      time: '1 hour ago',
      unread: true
    },
    {
      id: 2,
      title: 'Achievement Unlocked',
      message: 'Congratulations! You completed 5 coding challenges',
      time: '3 hours ago',
      unread: false
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notification-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{type === 'email' ? 'Messages' : 'Notifications'}</h3>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-content">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${notification.unread ? 'unread' : ''}`}
            >
              {notification.unread && (
                <FaCircle className="unread-indicator" />
              )}
              <div className="notification-content">
                {type === 'email' ? (
                  <>
                    <div className="notification-header">
                      <strong>{notification.sender}</strong>
                      <span className="notification-time">{notification.time}</span>
                    </div>
                    <div className="notification-subject">{notification.subject}</div>
                    <div className="notification-message">{notification.message}</div>
                  </>
                ) : (
                  <>
                    <div className="notification-header">
                      <strong>{notification.title}</strong>
                      <span className="notification-time">{notification.time}</span>
                    </div>
                    <div className="notification-message">{notification.message}</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

NotificationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  type: PropTypes.oneOf(['email', 'notification']).isRequired
};

NotificationModal.displayName = 'NotificationModal';
export default NotificationModal; 