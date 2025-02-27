import Sidebar from '../component/sidebar';
import MonacoEditor from '../component/codeEditor';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <MonacoEditor />
      </div>
    </div>
  );
};

export default Dashboard;