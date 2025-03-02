import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';
import { auth } from '../firebaseConfig';

const SignOut = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <button 
      onClick={handleSignOut}
      className="sign-out-button"
    >
      <FaSignOutAlt />
      <span>Sign Out</span>
    </button>
  );
};

export default SignOut;
