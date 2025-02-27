const UserProfile = () => {
  return (
    <div className="user-profile-section">
      <div className="user-info">
        <img 
          src="/default-avatar.png" 
          alt="User Avatar" 
          className="user-avatar" 
        />
        <span className="user-name">John Doe</span>
      </div>
    </div>
  );
};

export default UserProfile;
