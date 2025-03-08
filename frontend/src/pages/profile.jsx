import { useState } from "react";
import { auth } from "../firebaseConfig";
import { updateProfile, updatePassword } from "firebase/auth";
import { 
  FaUser, FaEdit, FaKey, FaUserCircle, 
  FaCode, FaHistory, FaStar, FaCog,
  FaGithub, FaLinkedin, FaTwitter, FaGlobe,
  FaUsers
} from "react-icons/fa";

const Profile = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    // Personal Info
    displayName: auth.currentUser?.displayName || "",
    bio: "",
    location: "",
    occupation: "",
    website: "",
    
    // Social Links
    github: "",
    linkedin: "",
    twitter: "",
    
    // Preferences
    theme: "light",
    emailNotifications: true,
    codeEditor: "vscode",
    language: "javascript",
    
    // Security
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Mock data for statistics and activity
  const statistics = {
    totalSessions: 25,
    hoursSpent: 48,
    linesOfCode: 3240,
    collaborations: 12
  };

  const recentActivity = [
    { id: 1, type: 'session', title: 'JavaScript Debugging Session', date: '2024-03-08' },
    { id: 2, type: 'achievement', title: 'Completed 10 Sessions', date: '2024-03-07' },
    { id: 3, type: 'collaboration', title: 'Python Project Collab', date: '2024-03-06' }
  ];

  const skills = [
    { name: 'JavaScript', level: 90 },
    { name: 'Python', level: 75 },
    { name: 'React', level: 85 },
    { name: 'Node.js', level: 80 }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleProfileUpdate = async () => {
    try {
      setError("");
      setSuccess("");
      
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: formData.displayName,
        });
        setSuccess("Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (err) {
      setError("Failed to update profile: " + err.message);
    }
  };

  const handlePasswordUpdate = async () => {
    try {
      setError("");
      setSuccess("");

      if (formData.newPassword !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, formData.newPassword);
        setSuccess("Password updated successfully!");
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
      }
    } catch (err) {
      setError("Failed to update password: " + err.message);
    }
  };

  return (
    <div className="profile-main-content">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Profile Settings</h1>
          <button 
            className="edit-button"
            onClick={() => setIsEditing(!isEditing)}
          >
            <FaEdit /> {isEditing ? "Cancel Editing" : "Edit Profile"}
          </button>
        </div>

        {(error || success) && (
          <div className={`status-message ${error ? 'error' : 'success'}`}>
            {error || success}
          </div>
        )}

        <div className="profile-section">
          <div className="profile-overview">
            <div className="profile-avatar">
              <img 
                src={auth.currentUser?.photoURL || "/default-avatar.png"} 
                alt="Profile" 
                className="avatar-large"
              />
              <button type="button" className="avatar-icon">
                <FaUser />
              </button>
            </div>
            <div className="profile-stats">
              {Object.entries(statistics).map(([key, value]) => (
                <div key={key} className="stat-item">
                  <span className="stat-value">{value}</span>
                  <span className="stat-label">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-tabs">
            <button
              className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              <FaUserCircle /> Personal Info
            </button>
            <button
              className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <FaHistory /> Activity
            </button>
            <button
              className={`tab-button ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              <FaCode /> Skills
            </button>
            <button
              className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <FaCog /> Settings
            </button>
          </div>

          <div className="profile-content">
            {activeTab === 'personal' && (
              <form className="profile-form" onSubmit={(e) => {
                e.preventDefault();
                handleProfileUpdate();
              }}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="displayName">Display Name</label>
                    <input
                      type="text"
                      id="displayName"
                      name="displayName"
                      value={formData.displayName}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="occupation">Occupation</label>
                    <input
                      type="text"
                      id="occupation"
                      name="occupation"
                      value={formData.occupation}
                      onChange={handleChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows="3"
                    value={formData.bio}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>

                <div className="social-links">
                  <h3>Social Links</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="github">
                        <FaGithub /> GitHub
                      </label>
                      <input
                        type="url"
                        id="github"
                        name="github"
                        value={formData.github}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="linkedin">
                        <FaLinkedin /> LinkedIn
                      </label>
                      <input
                        type="url"
                        id="linkedin"
                        name="linkedin"
                        value={formData.linkedin}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}

            {activeTab === 'activity' && (
              <div className="activity-section">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {recentActivity.map(activity => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon">
                        {activity.type === 'session' && <FaCode />}
                        {activity.type === 'achievement' && <FaStar />}
                        {activity.type === 'collaboration' && <FaUsers />}
                      </div>
                      <div className="activity-details">
                        <span className="activity-title">{activity.title}</span>
                        <span className="activity-date">{activity.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="skills-section">
                <h3>Programming Skills</h3>
                <div className="skills-list">
                  {skills.map(skill => (
                    <div key={skill.name} className="skill-item">
                      <div className="skill-header">
                        <span className="skill-name">{skill.name}</span>
                        <span className="skill-level">{skill.level}%</span>
                      </div>
                      <div className="skill-bar">
                        <div 
                          className="skill-progress" 
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="settings-section">
                <h3>Preferences</h3>
                <form className="profile-form" onSubmit={(e) => {
                  e.preventDefault();
                  handleProfileUpdate();
                }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="theme">Theme</label>
                      <select
                        id="theme"
                        name="theme"
                        value={formData.theme}
                        onChange={handleChange}
                        disabled={!isEditing}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="codeEditor">Preferred Editor</label>
                      <select
                        id="codeEditor"
                        name="codeEditor"
                        value={formData.codeEditor}
                        onChange={handleChange}
                        disabled={!isEditing}
                      >
                        <option value="vscode">VS Code</option>
                        <option value="sublime">Sublime Text</option>
                        <option value="atom">Atom</option>
                      </select>
                    </div>
                  </div>

                  <div className="notification-settings">
                    <h3>Notification Settings</h3>
                    <div className="checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          name="emailNotifications"
                          checked={formData.emailNotifications}
                          onChange={handleChange}
                          disabled={!isEditing}
                        />
                        <span>Email Notifications</span>
                      </label>
                    </div>
                  </div>

                  {isEditing && (
                    <button type="submit" className="submit-button">
                      Save Changes
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 