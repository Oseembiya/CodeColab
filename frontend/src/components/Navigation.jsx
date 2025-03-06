import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaCode, FaLaptopCode, FaSignOutAlt, FaSearch, FaBell, FaEnvelope } from 'react-icons/fa';
import { memo } from 'react';
import { auth } from '../firebaseConfig';

const Navigation = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;

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
      {/* Sidebar */}
      <div className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-header">
          <img src="/logo.ico" alt="CodeColab Logo" className="sidebar-logo" />
          <h2 id="site-title">CodeColab</h2>
        </div>
        
        <div className="sidebar-menu">
          <Link 
            to="/dashboard" 
            className={`menu-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
            aria-label="Go to Dashboard"
            aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
          >
            <FaHome aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          
          <Link 
            to="/dashboard/sessions" 
            className={`menu-item ${location.pathname === '/dashboard/sessions' ? 'active' : ''}`}
            aria-label="Go to Sessions"
            aria-current={location.pathname === '/dashboard/sessions' ? 'page' : undefined}
          >
            <FaCode aria-hidden="true" />
            <span>Sessions</span>
          </Link>
          
          <Link 
            to="/dashboard/codeEditor" 
            className={`menu-item ${location.pathname === '/dashboard/codeEditor' ? 'active' : ''}`}
            aria-label="Go to Code Editor"
            aria-current={location.pathname === '/dashboard/codeEditor' ? 'page' : undefined}
          >
            <FaLaptopCode aria-hidden="true" />
            <span>Code Editor</span>
          </Link>
        </div>

        <div className="sidebar-footer">
          <button 
            onClick={handleSignOut} 
            className="sign-out-link"
            aria-label="Sign out of your account"
          >
            <FaSignOutAlt aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Navbar */}
      <nav className="navbar" role="navigation" aria-label="Secondary navigation">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="search-input"
          />
        </div>

        <div className="navbar-profile">
          <div className="navbar-icons">
            <button 
              className="notification-button"
              onClick={() => console.log('Notifications clicked')}
            >
              <FaBell />
              <span className="notification-badge">2</span>
            </button>
            <button 
              className="notification-button"
              onClick={() => console.log('Messages clicked')}
            >
              <FaEnvelope />
              <span className="notification-badge">3</span>
            </button>
          </div>
          <button 
            className="user-profile-section"
            onClick={() => navigate('/dashboard/profile')}
            aria-label="View profile"
          >
            <div className="user-info">
              <img 
                src={user?.photoURL || "/default-avatar.png"} 
                alt={`${user?.displayName || 'User'}'s profile picture`}
                className="user-avatar" 
              />
            </div>
          </button>
        </div>
      </nav>
    </>
  );
});

Navigation.displayName = 'Navigation';
export default Navigation; 