import Sidebar from '../component/sidebar';
import MonacoEditor from '../component/codeEditor';
import Navbar from '../component/navbar';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
      <Navbar />
        <MonacoEditor />
      </div>
    </div>
  );
};

export default Dashboard;