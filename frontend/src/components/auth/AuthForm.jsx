import { useState} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaEye, FaEyeSlash, FaGoogle } from 'react-icons/fa';
import PropTypes from 'prop-types';



const AuthForm = ({ isLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [error, setError] = useState({});
  const [firebaseError, setFirebaseError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/\d/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    const strengthMap = {
      0: 'weak',
      1: 'weak',
      2: 'medium',
      3: 'medium',
      4: 'strong',
      5: 'strong'
    };
    
    setPasswordStrength(strengthMap[strength]);
    return strength >= 3;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prevData => ({
        ...prevData,
        [name]: checked
      }));
    } else {
      const cleanedValue = name === 'password' || name === 'confirmPassword'
        ? value.replace(/\s/g, '').slice(0, 12)
        : value.trim();
      
      setFormData(prevData => ({
        ...prevData,
        [name]: cleanedValue
      }));

      if (name === 'password') {
        checkPasswordStrength(cleanedValue);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!isLogin && !formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (formData.password.length > 12) {
      newErrors.password = 'Password cannot exceed 12 characters';
    } else if (!isLogin && !checkPasswordStrength(formData.password)) {
      newErrors.password = 'Password is too weak';
    }

    if (!isLogin) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      if (!formData.acceptTerms) {
        newErrors.acceptTerms = 'You must accept the terms and conditions';
      }
    }

    return newErrors;
  };

  // Lazy load Firebase functions when needed
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFirebaseError('');
    setSuccessMessage('');
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      // Dynamically import Firebase auth when needed
      const { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } 
        = await import('../../firebaseConfig');

      try {
        if (isLogin) {
          await signInWithEmailAndPassword(auth, formData.email, formData.password);
        } else {
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            formData.email, 
            formData.password
          );
          await updateProfile(userCredential.user, {
            displayName: formData.fullName
          });
        }
        setSuccessMessage(`${isLogin ? 'Login' : 'Registration'} successful! Redirecting...`);
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (error) {
        handleAuthError(error);
      }
    } else {
      setError(newErrors);
    }
  };

  const handleAuthError = (error) => {
    console.error("Firebase error:", error);
    switch (error.code) {
      case 'auth/email-already-in-use':
        setFirebaseError('This email is already registered');
        break;
      case 'auth/invalid-credential':
        setFirebaseError('Invalid email or password');
        break;
      case 'auth/invalid-email':
        setFirebaseError('Invalid email address');
        break;
      case 'auth/too-many-requests':
        setFirebaseError('Too many failed attempts. Please try again later.');
        break;
      default:
        setFirebaseError('An error occurred during authentication');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      // Dynamically import Google auth when needed
      const { auth } = await import('../../firebaseConfig');
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (error) {
      console.error("Google authentication error:", error);
      setFirebaseError('An error occurred during Google authentication');
    }
  };

  return (
    <div className={`${isLogin ? 'login' : 'signup'}-container`}>
      <div className="signup-form">
        <h1>{isLogin ? 'Login' : 'Sign Up'}</h1>
        <p>{isLogin ? 'Please enter your credentials to login.' : 'Please fill in the form below to create an account.'}</p>
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input 
                type="text" 
                id="fullName" 
                name="fullName" 
                value={formData.fullName} 
                onChange={handleChange} 
                placeholder="John Doe"
              />
              <FaUser className="input-icon" />
              {error.fullName && <span className="error">{error.fullName}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              placeholder="your@email.com"
            />
            <FaEnvelope className="input-icon" />
            {error.email && <span className="error">{error.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input 
                type={showPassword ? "text" : "password"}
                id="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                placeholder="********"
                maxLength={12}
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
            {error.password && <span className="error">{error.password}</span>}
            {!isLogin && formData.password && (
              <div className={`password-strength ${passwordStrength}`}>
                Password strength: {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                <span className="password-length">
                  ({formData.password.length}/12)
                </span>
              </div>
            )}
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-input-container">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword" 
                    name="confirmPassword" 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    placeholder="********"
                  />
                  <button 
                    type="button" 
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
                {error.confirmPassword && <span className="error">{error.confirmPassword}</span>}
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                  />
                  I accept the terms and conditions
                </label>
                {error.acceptTerms && <span className="error">{error.acceptTerms}</span>}
              </div>
            </>
          )}

          {successMessage && <div className="success">{successMessage}</div>}
          {firebaseError && <div className="error">{firebaseError}</div>}
          
          <button className="submit-button" type="submit">
            {isLogin ? 'Login' : 'Get Started'}
          </button>
          
          <button 
            type="button" 
            className="google-button" 
            onClick={handleGoogleAuth}
          >
            <FaGoogle /> Sign in with Google
          </button>
          
          <p className="login-link">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link to={isLogin ? "/signup" : "/login"}>
              {isLogin ? 'Sign Up' : 'Login'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

AuthForm.propTypes = {
  isLogin: PropTypes.bool.isRequired
};

export default AuthForm; 