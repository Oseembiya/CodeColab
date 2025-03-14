import { useState, useEffect } from "react";
import { auth, storage } from "../firebaseConfig";
import { updateProfile, updatePassword } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { 
  FaUser, FaEdit, FaKey, FaUserCircle, 
  FaCode, FaHistory, FaStar, FaCog,
  FaGithub, FaLinkedin, FaTwitter, FaGlobe,
  FaUsers, FaCheck, FaTimes, FaExclamationCircle, FaCheckCircle,
  FaCamera
} from "react-icons/fa";
import { v4 as uuidv4 } from 'uuid';

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
    confirmPassword: "",
    timestamp: null
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

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(null);

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
        
        // Add fade-out animation before removing
        setTimeout(() => {
          const messageContainer = document.querySelector('.status-message-container');
          if (messageContainer) {
            messageContainer.classList.add('fade-out');
            setTimeout(() => {
              setSuccess("");
            }, 300); // Match the animation duration
          }
        }, 2700); // Start fade-out before the message is removed
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

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      setPhotoError(null);
      setError("");

      // Create unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${auth.currentUser.uid}-${uuidv4()}.${fileExtension}`;
      
      // Create storage reference
      const storageRef = ref(storage, `profile-photos/${fileName}`);
      
      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const photoURL = await getDownloadURL(storageRef);
      
      // Update user profile
      await updateProfile(auth.currentUser, { photoURL });
      
      setSuccess("Profile photo updated successfully!");
      
      // Force a re-render of the profile image
      setFormData(prev => ({ ...prev, timestamp: Date.now() }));

    } catch (error) {
      console.error('Error uploading photo:', error);
      setPhotoError('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const renderProfileAvatar = () => (
    <div className="profile-avatar">
      {auth.currentUser?.photoURL ? (
        <img 
          src={`${auth.currentUser.photoURL}?t=${formData.timestamp || ''}`}
          alt="Profile"
          className="avatar-large"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/default-avatar.png";
          }}
        />
      ) : (
        <FaUserCircle className="avatar-icon" />
      )}
      
      {isEditing && (
        <label className="avatar-icon" htmlFor="photo-upload">
          <input
            type="file"
            id="photo-upload"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
            className="hidden"
          />
          <FaCamera />
        </label>
      )}
    </div>
  );

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
          <div className={`status-message-container ${error ? 'error' : 'success'}`}>
            <div className="status-message-content">
              <div className="status-icon">
                {error ? <FaExclamationCircle /> : <FaCheckCircle />}
              </div>
              <p>{error || success}</p>
              <button 
                className="close-message" 
                onClick={() => {
                  const messageContainer = document.querySelector('.status-message-container');
                  messageContainer.classList.add('fade-out');
                  setTimeout(() => {
                    error ? setError("") : setSuccess("");
                  }, 300);
                }}
              >
                <FaTimes />
              </button>
            </div>
          </div>
        )}

        <div className="profile-section">
          <div className="profile-overview">
            {renderProfileAvatar()}
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
                        <FaGithub /> GitHub Profile URL
                      </label>
                      <input
                        type="url"
                        id="github"
                        name="github"
                        placeholder="https://github.com/yourusername"
                        value={formData.github}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="linkedin">
                        <FaLinkedin /> LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        id="linkedin"
                        name="linkedin"
                        placeholder="https://linkedin.com/in/yourusername"
                        value={formData.linkedin}
                        onChange={handleChange}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                </div>

                <div className="personal-links">
                  <div className="section-header">
                    <h3>Professional Links</h3>
                  </div>
                  <div className="links-grid">
                    {formData.github ? (
                      <a 
                        href={formData.github}
                        className="link-item"
                        data-type="github"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="link-icon">
                          <FaGithub />
                        </div>
                        <div className="link-content">
                          <div className="link-title">GitHub</div>
                          <div className="link-url">{formData.github}</div>
                        </div>
                      </a>
                    ) : (
                      <div className="link-item" data-type="github">
                        <div className="link-icon">
                          <FaGithub />
                        </div>
                        <div className="link-content">
                          <div className="link-title">GitHub</div>
                          <div className="link-url">Not added yet</div>
                        </div>
                      </div>
                    )}

                    {formData.linkedin ? (
                      <a 
                        href={formData.linkedin}
                        className="link-item"
                        data-type="linkedin"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="link-icon">
                          <FaLinkedin />
                        </div>
                        <div className="link-content">
                          <div className="link-title">LinkedIn</div>
                          <div className="link-url">{formData.linkedin}</div>
                        </div>
                      </a>
                    ) : (
                      <div className="link-item" data-type="linkedin">
                        <div className="link-icon">
                          <FaLinkedin />
                        </div>
                        <div className="link-content">
                          <div className="link-title">LinkedIn</div>
                          <div className="link-url">Not added yet</div>
                        </div>
                      </div>
                    )}

                    {formData.twitter ? (
                      <a 
                        href={formData.twitter}
                        className="link-item"
                        data-type="twitter"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="link-icon">
                          <FaTwitter />
                        </div>
                        <div className="link-content">
                          <div className="link-title">Twitter</div>
                          <div className="link-url">{formData.twitter}</div>
                        </div>
                      </a>
                    ) : (
                      <div className="link-item" data-type="twitter">
                        <div className="link-icon">
                          <FaTwitter />
                        </div>
                        <div className="link-content">
                          <div className="link-title">Twitter</div>
                          <div className="link-url">Not added yet</div>
                        </div>
                      </div>
                    )}

                    {formData.website ? (
                      <a 
                        href={formData.website}
                        className="link-item"
                        data-type="portfolio"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="link-icon">
                          <FaGlobe />
                        </div>
                        <div className="link-content">
                          <div className="link-title">Portfolio</div>
                          <div className="link-url">{formData.website}</div>
                        </div>
                      </a>
                    ) : (
                      <div className="link-item" data-type="portfolio">
                        <div className="link-icon">
                          <FaGlobe />
                        </div>
                        <div className="link-content">
                          <div className="link-title">Portfolio</div>
                          <div className="link-url">Not added yet</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="form-actions">
                    <button type="submit" className="submit-button">
                      Save Changes
                    </button>
                  </div>
                )}
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