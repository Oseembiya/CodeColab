import { Link } from 'react-router-dom';
import { FaHome, FaCode, FaSignOutAlt } from 'react-icons/fa';
import SignOut from './signOut';
const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="/logo.ico" alt="CodeColab Logo" className="sidebar-logo" />
        <h2>CodeColab</h2>
      </div>
      
      <div className="sidebar-menu">
        <Link to="/dashboard" className="menu-item">
          <FaHome />
          Dashboard
        </Link>
        
        <Link to="/sessions" className="menu-item">
          <FaCode />
          Sessions
        </Link>
      </div>

      <div className="sidebar-footer">
        <button className="sign-out-button">
          <FaSignOutAlt />
          <SignOut />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
