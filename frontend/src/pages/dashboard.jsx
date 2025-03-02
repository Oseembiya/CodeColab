import Sidebar from '../component/sidebar';
import Navbar from '../component/navbar';
import { Outlet } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="container">
      <Sidebar />
      <Navbar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;