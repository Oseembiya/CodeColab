import { auth } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';


const UserProfile = () => {
  const [user, setUser] = useState(auth.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

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
        <span className="user-name">{user?.displayName}</span>
      </div>
    </div>
  );
};

export default UserProfile;
