import { useNavigate, useLocation } from 'react-router-dom';
import { FaBell, FaBars } from 'react-icons/fa';
import { auth } from '../../firebaseConfig';
import { useSession } from '../../contexts/SessionContext';

const Navbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  const { activeSession } = useSession();

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button 
          className="hamburger-button mobile-only"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <FaBars />
        </button>
        {activeSession && location.pathname.includes('/sessions/') && (
          <div className="active-session-indicator">
            <span className="session-status">Live Session:</span>
            <span className="session-name">{activeSession.title}</span>
          </div>
        )}
      </div>

      <div className="navbar-profile">
        <div className="navbar-icons">
          <button 
            aria-label="Show notifications"
            data-count="3"
          >
            <FaBell />
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
    </nav>
  );
};

export default Navbar; 