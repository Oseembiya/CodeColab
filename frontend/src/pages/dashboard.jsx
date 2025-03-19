import { useState } from "react";
import { FaUsers, FaCode, FaQuestionCircle } from "react-icons/fa";

const Dashboard = () => {
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  });

  const tasks = [
    {
      user: "/default-avatar.png",
      task: "Code Review Scheduled",
      type: "Deadline",
    },
    {
      user: "/default-avatar.png",
      task: "Improvement Strategies",
      type: "Planned",
    },
    {
      user: "/default-avatar.png",
      task: "Pair programming session",
      type: "Urgent",
    },
  ];

  const upcomingTasks = [
    {
      id: "Select",
      title: "Backend development",
      details: "7 of 10 tasks, Mr. Smith",
      time: "10:00-11:00",
    },
    {
      id: "Join",
      title: "Frontend optimization",
      details: "5 of 8 tasks, Mr. Brown",
      time: "14:00-15:30",
    },
    {
      id: "Details",
      title: "Code review session",
      details: "3 of 15 reviews, Dev Team",
      time: "09:00-09:30",
    },
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>{greeting}, CodeCollab</h1>
          <p>Explore your coding journey</p>
          <button className="settings-button">Settings</button>
        </div>
      </header>

      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-header">
            <h3>Plan for the next</h3>
            <p>Current Week Status</p>
          </div>
          <div className="collaborators">
            <img src="/default-avatar.png" alt="User 1" loading="lazy" />
            <img src="/default-avatar.png" alt="User 2" loading="lazy" />
            <img src="/default-avatar.png" alt="User 3" loading="lazy" />
            <span>Collaborative</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>Upcoming Project</h3>
            <p>Week 12 Updates</p>
          </div>
          <div className="collaborators">
            <img src="/default-avatar.png" alt="User 1" loading="lazy" />
            <img src="/default-avatar.png" alt="User 2" loading="lazy" />
            <span>Creative</span>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">82%</div>
          <p>Track your progress daily</p>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <FaCode />
            <FaUsers />
          </div>
          <p>Coding queries and solutions</p>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <FaQuestionCircle />
          </div>
          <p>Developer FAQs</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="tasks-section">
          <h2>My Tasks Overview</h2>
          <div className="tasks-list">
            {tasks.map((task, index) => (
              <div key={index} className="task-item">
                <img
                  src={task.user}
                  alt="User"
                  className="task-user"
                  loading="lazy"
                  crossOrigin="anonymous"
                />
                <div className="task-info">
                  <span className="task-name">{task.task}</span>
                </div>
                <span className={`task-type ${task.type.toLowerCase()}`}>
                  {task.type}
                </span>
              </div>
            ))}
            <button className="view-all">View all</button>
          </div>
        </div>

        <div className="calendar-section">
          <h2>December Tasks Overview</h2>
          <div className="task-tags">
            <span className="tag">code 2</span>
            <span className="tag">debug 3</span>
            <span className="tag">refactor 4</span>
            <span className="tag">testing 5</span>
            <span className="tag">deploy 6</span>
            <span className="tag">meeting 7</span>
            <span className="tag">training 8</span>
          </div>

          <div className="upcoming-tasks">
            <h3>Upcoming tasks and events</h3>
            {upcomingTasks.map((task, index) => (
              <div key={index} className="upcoming-task-item">
                <div className="task-id">{task.id}</div>
                <div className="task-content">
                  <h4>{task.title}</h4>
                  <p>{task.details}</p>
                </div>
                <div className="task-time">{task.time}</div>
              </div>
            ))}
            <button className="view-schedule">View schedule</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
