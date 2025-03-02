import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaCode, FaLaptopCode } from 'react-icons/fa';
import SignOut from './signOut';

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="/logo.ico" alt="CodeColab Logo" className="sidebar-logo" />
        <h2>CodeColab</h2>
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
          to="/dashboard/sessions" 
          className={`menu-item ${location.pathname === '/dashboard/sessions' ? 'active' : ''}`}
        >
          <FaCode />
          <span>Sessions</span>
        </Link>
        <Link 
          to="/dashboard/codeEditor" 
          className={`menu-item ${location.pathname === '/dashboard/codeEditor' ? 'active' : ''}`}
        >
          <FaLaptopCode />
          <span>Code Editor</span>
        </Link>
      </div>

      <div className="sidebar-footer">
        <SignOut />
      </div>
    </div>
  );
};

export default Sidebar;
