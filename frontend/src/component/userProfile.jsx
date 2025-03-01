import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';

const UserProfile = () => {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <div className="user-profile-section">
      <div className="user-info" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
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
