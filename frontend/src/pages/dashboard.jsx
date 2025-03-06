import Navigation from '../components/Navigation';
import { Outlet } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="container">
      <Navigation />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;