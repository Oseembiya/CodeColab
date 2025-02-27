import { Link } from 'react-router-dom';
import UserProfile from './userProfile';
import SignOut from './signOut';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>CodeColab</h2>
      </div>
      
      <div className="sidebar-menu">
        <Link to="/dashboard" className="menu-item">
          <i className="fas fa-home"></i>
          Dashboard
        </Link>
        
        <Link to="/sessions" className="menu-item">
          <i className="fas fa-code"></i>
          Sessions
        </Link>
      </div>

      <div className="user-profile">
        <UserProfile />
        <SignOut />
      </div>
    </div>
  );
};

export default Sidebar;
