import { auth } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';

// eslint-disable-next-line react/prop-types
const UserProfile = () => {
  const user = auth.currentUser;
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate('/dashboard/profile');
  };

  return (
    <div className="user-profile-section">
      <div 
        className="user-info" 
        onClick={handleProfileClick} 
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
