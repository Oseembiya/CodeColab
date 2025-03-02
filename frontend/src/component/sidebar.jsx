import { Link } from 'react-router-dom';
import { FaHome, FaCode,  } from 'react-icons/fa';
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
          <span>Dashboard</span>
        </Link>
        
        <Link to="/sessions" className="menu-item">
          <FaCode />
          <span>Sessions</span>
        </Link>
      </div>

      <div className="sidebar-footer">
        <SignOut />
      </div>
    </div>
  );
};

export default Sidebar;
