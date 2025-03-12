import Navigation from '../Navigation';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="container">
      <Navigation />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout; 