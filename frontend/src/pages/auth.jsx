import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaGoogle,
  FaGithub,
  FaTimes,
  FaCheck,
  FaImage,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import "../styles/pages/Auth.css";

const Auth = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, loginWithGithub } = useAuth();

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Handle login form input changes
  const handleLoginChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLoginData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle register form input changes
  const handleRegisterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRegisterData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle profile image selection - removed as we'll get images from Google

  // Handle login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!loginData.email || !loginData.password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      await login(loginData.email, loginData.password);
      setSuccess("Login successful! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.message || "Failed to log in");
      setIsLoading(false);
    }
  };

  // Handle registration submission
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Basic validation
    if (!registerData.name || !registerData.email || !registerData.password) {
      setError("All fields are required");
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (registerData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      await signup(
        registerData.email,
        registerData.password,
        registerData.name,
        null, // No photo file
        "" // No bio
      );

      setIsLoading(false);
      setSuccess("Account created successfully! You can now log in.");
      setActiveTab("login");
    } catch (err) {
      setError(err.message || "Failed to register");
      setIsLoading(false);
    }
  };

  // Handle social authentication
  const handleSocialAuth = async (provider) => {
    setIsLoading(true);
    setError("");

    try {
      if (provider === "Google") {
        await loginWithGoogle();
      } else if (provider === "GitHub") {
        await loginWithGithub();
      }

      setSuccess("Login successful! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setError(err.message || `Failed to authenticate with ${provider}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="welcome-banner">
        <h1>Welcome to CodeColab</h1>
        <p>Real-time collaborative coding platform</p>
      </div>
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
            onClick={() => setActiveTab("login")}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${activeTab === "register" ? "active" : ""}`}
            onClick={() => setActiveTab("register")}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
            {error.includes("sign in with Google") && (
              <div className="provider-suggestion">
                <button
                  type="button"
                  className="social-button google"
                  onClick={() => handleSocialAuth("Google")}
                >
                  <FaGoogle /> Sign in with Google
                </button>
              </div>
            )}
            {error.includes("sign in with GitHub") && (
              <div className="provider-suggestion">
                <button
                  type="button"
                  className="social-button github"
                  onClick={() => handleSocialAuth("GitHub")}
                >
                  <FaGithub /> Sign in with GitHub
                </button>
              </div>
            )}
            {error.includes("Invalid email or password") && (
              <div className="password-recovery-help">
                <Link to="/reset-password" className="forgot-password-link">
                  Reset your password
                </Link>
                <span className="or-divider">or</span>
                <button
                  type="button"
                  className="google-signin-help"
                  onClick={() => handleSocialAuth("Google")}
                >
                  <FaGoogle /> Try with Google
                </button>
              </div>
            )}
          </div>
        )}
        {success && <div className="success-message">{success}</div>}

        {activeTab === "login" ? (
          // Login Form
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="loginEmail">
                <FaEnvelope /> Email
              </label>
              <input
                type="email"
                id="loginEmail"
                name="email"
                value={loginData.email}
                onChange={handleLoginChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="loginPassword">
                <FaLock /> Password
              </label>
              <input
                type="password"
                id="loginPassword"
                name="password"
                value={loginData.password}
                onChange={handleLoginChange}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="login-options">
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={loginData.rememberMe}
                  onChange={handleLoginChange}
                />
                <label htmlFor="rememberMe">Remember me</label>
              </div>
              <Link to="/reset-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          // Register Form
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="registerName">
                <FaUser /> Full Name
              </label>
              <input
                type="text"
                id="registerName"
                name="name"
                value={registerData.name}
                onChange={handleRegisterChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registerEmail">
                <FaEnvelope /> Email
              </label>
              <input
                type="email"
                id="registerEmail"
                name="email"
                value={registerData.email}
                onChange={handleRegisterChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registerPassword">
                <FaLock /> Password
              </label>
              <input
                type="password"
                id="registerPassword"
                name="password"
                value={registerData.password}
                onChange={handleRegisterChange}
                placeholder="Create a password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registerConfirmPassword">
                <FaLock /> Confirm Password
              </label>
              <input
                type="password"
                id="registerConfirmPassword"
                name="confirmPassword"
                value={registerData.confirmPassword}
                onChange={handleRegisterChange}
                placeholder="Confirm your password"
                required
              />
            </div>

            {registerData.password && registerData.confirmPassword && (
              <div
                className={
                  registerData.password === registerData.confirmPassword
                    ? "passwords-match valid"
                    : "passwords-match invalid"
                }
              >
                {registerData.password === registerData.confirmPassword ? (
                  <>
                    <FaCheck /> Passwords match
                  </>
                ) : (
                  <>
                    <FaTimes /> Passwords do not match
                  </>
                )}
              </div>
            )}

            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="social-auth">
          <p>Or continue with</p>
          <div className="social-buttons">
            <button
              type="button"
              className="social-button google"
              onClick={() => handleSocialAuth("Google")}
            >
              <FaGoogle /> Google
            </button>
            <button
              type="button"
              className="social-button github"
              onClick={() => handleSocialAuth("GitHub")}
            >
              <FaGithub /> GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
