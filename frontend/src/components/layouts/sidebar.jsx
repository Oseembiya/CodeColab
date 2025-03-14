import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaCode, 
  FaSignOutAlt, 
  FaTimes,
  FaUsers,
  FaPencilAlt
} from 'react-icons/fa';
import { memo } from 'react';
import { auth } from '../../firebaseConfig';
import { useSession } from '../../contexts/SessionContext';

const Sidebar = memo(({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearActiveSession } = useSession();

  const handleSignOut = async () => {
    try {
      clearActiveSession();
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      <div 
        className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} 
        role="navigation" 
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.ico" alt="CodeColab Logo" className="sidebar-logo" />
            <h2>CodeColab</h2>
          </div>
          <button 
            className="sidebar-close-btn"
            onClick={onClose}
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

          <Link 
            to="/dashboard/whiteboard" 
            className={`menu-item ${location.pathname === '/dashboard/whiteboard' ? 'active' : ''}`}
          >
            <FaPencilAlt />
            <span>Whiteboard</span>
          </Link>
        </div>

        <div className="sidebar-footer">
          <button onClick={handleSignOut} className="sign-out-link">
            <FaSignOutAlt />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onClose}
        />
      )}
    </>
  );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar; 