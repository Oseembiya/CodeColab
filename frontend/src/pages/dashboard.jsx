;
import Sidebar from '../component/sidebar';
import MonacoEditor from '../component/codeEditor';
import Navbar from '../component/navbar';


const Dashboard = () => {
  return (
    <div className="container">
      <Sidebar className="sidebar" />
      <Navbar className="navbar" />
      <div className="main-content">
        <MonacoEditor />
      </div>
    </div>
  );
};

export default Dashboard;