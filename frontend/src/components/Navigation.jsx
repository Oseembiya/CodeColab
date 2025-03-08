import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaCode, 
  FaLaptopCode, 
  FaSignOutAlt, 
  FaSearch, 
  FaBell, 
  FaEnvelope, 
  FaTimes 
} from 'react-icons/fa';
import { memo, useState } from 'react';
import { auth } from '../firebaseConfig';
import NotificationModal from './notifications/NotificationModal';

const Navigation = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  const toggleSearch = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  return (
    <>
      {/* Sidebar */}
      <div 
        className={`sidebar ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} 
        role="navigation" 
        aria-label="Main navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.ico" alt="CodeColab Logo" className="sidebar-logo" />
            <h2 id="site-title">CodeColab</h2>
          </div>
          <button 
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <FaTimes size={24} />
          </button>
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
      <nav className={`navbar ${!isSidebarOpen ? 'navbar-expanded' : ''}`} role="navigation" aria-label="Secondary navigation">
        <button 
          className="hamburger-menu"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Desktop Search */}
        <div className="search-container desktop-search">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="search-input"
          />
        </div>

        {/* Mobile Search Icon */}
        <button 
          className="mobile-search-icon"
          onClick={toggleSearch}
          aria-label="Open search"
        >
          <FaSearch />
        </button>

        <div className="navbar-profile">
          <div className="navbar-icons">
            <button 
              className="notification-button"
              onClick={() => setShowNotifications(true)}
              aria-label="Show notifications"
            >
              <FaBell />
              <span className="notification-badge">2</span>
            </button>
            <button 
              className="notification-button"
              onClick={() => setShowMessages(true)}
              aria-label="Show messages"
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

      {/* Add overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Mobile Search Overlay */}
      <div className={`search-overlay ${isSearchOpen ? 'search-open' : ''}`}>
        <div className="search-header">
          <button 
            className="search-close"
            onClick={() => setIsSearchOpen(false)}
            aria-label="Close search"
          >
            <FaTimes />
          </button>
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="search-input"
              autoFocus
            />
          </div>
        </div>
      </div>

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