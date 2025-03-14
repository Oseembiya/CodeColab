import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaEye, FaEyeSlash, FaGoogle } from 'react-icons/fa';
import PropTypes from 'prop-types';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFirebaseError('');
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
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
      const provider = new GoogleAuthProvider();
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          setTimeout(() => navigate('/dashboard'), 1000);
        }
      }
    } catch (error) {
      console.error('Google Auth Error:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        setFirebaseError('Sign-in cancelled. Please try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setFirebaseError('Pop-up was blocked. Please enable pop-ups or try signing in with email.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setFirebaseError('');
      } else if (error.code === 'auth/network-request-failed') {
        setFirebaseError('Network error. Please check your connection and try again.');
      } else {
        setFirebaseError('An error occurred during sign in. Please try again.');
      }

      setTimeout(() => setFirebaseError(''), 5000);
    }
  };

  const checkRedirectResult = async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (error) {
      console.error('Redirect Result Error:', error);
      setFirebaseError('An error occurred during sign in. Please try again.');
    }
  };

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleClick = async () => {
    setIsGoogleLoading(true);
    setFirebaseError('');
    try {
      await handleGoogleAuth();
    } finally {
      setIsGoogleLoading(false);
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

          {firebaseError && <div className="error">{firebaseError}</div>}
          
          <button className="submit-button" type="submit">
            {isLogin ? 'Login' : 'Get Started'}
          </button>
          
          <button 
            type="button" 
            className="google-button" 
            onClick={handleGoogleClick}
            disabled={isGoogleLoading}
          >
            <FaGoogle /> 
            {isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}
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