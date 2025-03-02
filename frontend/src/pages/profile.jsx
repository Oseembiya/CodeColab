import { useState } from "react";
import { auth } from "../firebaseConfig";
import { updateProfile } from "firebase/auth";
import { FaUser, FaEdit } from "react-icons/fa";

const Profile = () => {
  const [formData, setFormData] = useState({
    displayName: auth.currentUser?.displayName || "",
    bio: "",
    theme: "light",
    emailNotifications: true
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: formData.displayName
        });
        setSuccess("Profile updated successfully!");
        setIsEditing(false);
      }
    } catch (error) {
      setError("Failed to update profile. Please try again.");
      console.error("Error updating profile:", error);
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
            <FaEdit /> {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-avatar">
            <img 
              src={auth.currentUser?.photoURL || "/default-avatar.png"} 
              alt="Profile" 
              className="avatar-large"
            />
            <FaUser className="avatar-icon" />
          </div>

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
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              disabled={!isEditing}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label htmlFor="theme">Theme Preference</label>
            <select
              id="theme"
              name="theme"
              value={formData.theme}
              onChange={handleChange}
              disabled={!isEditing}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                name="emailNotifications"
                checked={formData.emailNotifications}
                onChange={handleChange}
                disabled={!isEditing}
              />
              Receive email notifications
            </label>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          {isEditing && (
            <button type="submit" className="submit-button">
              Save Changes
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Profile; 