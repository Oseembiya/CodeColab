import { useState } from 'react';
import Sidebar from '../component/sidebar';
import MonacoEditor from '../component/codeEditor';
import Navbar from '../component/navbar';
import Profile from './profile';

const Dashboard = () => {
  const [showProfile, setShowProfile] = useState(false);
  const toggleProfile = () => {
    setShowProfile(!showProfile);
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Navbar onProfileClick={toggleProfile} />
      <div className="main-content">
        {showProfile ? <Profile /> : <MonacoEditor />}
      </div>
    </div>
  );
};

export default Dashboard;