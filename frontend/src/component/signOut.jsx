import { useNavigate } from 'react-router-dom';

const SignOut = () => {
  const navigate = useNavigate();

  const handleSignOut = () => {
    // Add your logout logic here
    navigate('/login');
  };

  return (
    <button 
      onClick={handleSignOut}
      className="sign-out-button"
    >
      Sign Out
    </button>
  );
};

export default SignOut;
