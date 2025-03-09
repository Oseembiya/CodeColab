import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaCode, 
  FaSignOutAlt, 
  FaBell, 
  FaEnvelope, 
  FaTimes,
  FaUsers
} from 'react-icons/fa';
import { memo, useState } from 'react';
import { auth } from '../firebaseConfig';
import NotificationModal from './notifications/NotificationModal';
import { useSession } from '../contexts/SessionContext';

const Navigation = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const { activeSession } = useSession();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      <div 
        className={`sidebar ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} 
        role="navigation" 
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.ico" alt="CodeColab Logo" className="sidebar-logo" />
            <h2>CodeColab</h2>
          </div>
          <button 
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="sidebar-menu">
          <Link 
            to="/dashboard" 
            className={`menu-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            <FaHome />
            <span>Dashboard</span>
          </Link>
          
          <Link 
            to="/dashboard/editor" 
            className={`menu-item ${location.pathname === '/dashboard/editor' ? 'active' : ''}`}
          >
            <FaCode />
            <span>Code Editor</span>
          </Link>

          <Link 
            to="/dashboard/sessions" 
            className={`menu-item ${location.pathname === '/dashboard/sessions' ? 'active' : ''}`}
          >
            <FaUsers />
            <span>Collaborative Sessions</span>
          </Link>
        </div>

        <div className="sidebar-footer">
          <button onClick={handleSignOut} className="sign-out-link">
            <FaSignOutAlt />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <nav className={`navbar ${!isSidebarOpen ? 'navbar-expanded' : ''}`}>
        <button 
          className="hamburger-menu"
          onClick={() => setSidebarOpen(!isSidebarOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className="navbar-profile">
          <div className="navbar-icons">
            <button 
              onClick={() => setShowNotifications(true)}
              aria-label="Show notifications"
              data-count="3"
            >
              <FaBell />
            </button>
            <button 
              onClick={() => setShowMessages(true)}
              aria-label="Show messages"
              data-count="2"
            >
              <FaEnvelope />
            </button>
          </div>
          <button 
            className="user-profile-section"
            onClick={() => navigate('/dashboard/profile')}
            aria-label="View profile"
          >
            <img 
              src={user?.photoURL || "/default-avatar.png"} 
              alt="Profile" 
              className="user-avatar" 
            />
          </button>
        </div>

        {activeSession && (
          <div className="active-session-indicator">
            <span className="session-status">Active Session</span>
            <span className="session-name">{activeSession.title}</span>
          </div>
        )}
      </nav>

      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <NotificationModal 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        type="notification"
      />

      <NotificationModal 
        isOpen={showMessages}
        onClose={() => setShowMessages(false)}
        type="email"
      />
    </>
  );
});

Navigation.displayName = 'Navigation';
export default Navigation; 