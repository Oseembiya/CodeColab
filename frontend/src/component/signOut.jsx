import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt } from 'react-icons/fa';

const SignOut = () => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    navigate('/login');
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
