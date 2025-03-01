import { auth } from '../firebaseConfig';

// eslint-disable-next-line react/prop-types
const UserProfile = ({ onProfileClick }) => {
  const user = auth.currentUser;

  return (
    <div className="user-profile-section">
      <div 
        className="user-info" 
        onClick={onProfileClick} 
        style={{ cursor: 'pointer' }}
      >
        <img 
          src={user?.photoURL || "/default-avatar.png"} 
          alt="User Avatar" 
          className="user-avatar" 
        />
      </div>
    </div>
  );
};

export default UserProfile;
