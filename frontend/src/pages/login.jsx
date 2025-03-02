import { useState } from "react";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { FaEnvelope, FaLock, FaGoogle } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState({});
  const [firebaseError, setFirebaseError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    return newErrors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setFirebaseError("");
    setSuccessMessage("");
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      try {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        setSuccessMessage("Login successful! Redirecting...");
        
        setTimeout(() => {
           navigate ('/dashboard');
        }, 2000);
      } catch (error) {
        console.error("Firebase error:", error);
        switch (error.code) {
          case 'auth/invalid-credential':
            setFirebaseError('Invalid email or password');
            break;
          case 'auth/invalid-email':
            setFirebaseError('Invalid email address');
            break;
          case 'auth/too-many-requests':
            setFirebaseError('Too many failed login attempts. Please try again later.');
            break;
          default:
            setFirebaseError('An error occurred during login');
        }
      }
    } else {
      setError(newErrors);
    }
  };

  const handleGoogleLogin = async () => {
    setFirebaseError("");
    setSuccessMessage("");
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setSuccessMessage("Login successful! Redirecting...");
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error("Google login error:", error);
      setFirebaseError('An error occurred during Google login');
    }
  };

  return (
    <div className="login-container">
      <div className="signup-form">
        <h1>Login</h1>
        <p>Please enter your credentials to login.</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email} 
              placeholder="your@email.com" 
              onChange={handleChange} 
            />
            <FaEnvelope className="input-icon" />
            {error.email && <span className="error">{error.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              value={formData.password} 
              placeholder="***********" 
              onChange={handleChange} 
            />
            <FaLock className="input-icon" />
            {error.password && <span className="error">{error.password}</span>}
          </div>
          {successMessage && <div className="success">{successMessage}</div>}
          {firebaseError && <div className="error">{firebaseError}</div>}
          <button className="submit-button" type="submit">Login</button>
          <button 
            type="button" 
            className="google-button" 
            onClick={handleGoogleLogin}
          >
            <FaGoogle /> Sign in with Google
          </button>
          <p className="login-link">Do not have an account? <Link to="/signup">Sign Up</Link></p>
        </form>
      </div>
    </div>
  );
};

export default Login;
