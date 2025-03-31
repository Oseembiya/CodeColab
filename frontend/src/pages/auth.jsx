import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebaseConfig";
import AuthForm from "../components/auth/AuthForm";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Determine initial tab based on the path
  const [activeTab, setActiveTab] = useState(
    location.pathname.includes("signup") ? "signup" : "login"
  );

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Update URL when tab changes (without causing full page reload)
  useEffect(() => {
    const path = activeTab === "signup" ? "/signup" : "/login";
    if (location.pathname !== path) {
      window.history.replaceState(null, "", path);
    }
  }, [activeTab, location.pathname]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>CodeColab</h1>
          <p className="tagline">Real-time collaborative coding platform</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`tab-button ${activeTab === "login" ? "active" : ""}`}
              onClick={() => setActiveTab("login")}
            >
              Login
            </button>
            <button
              className={`tab-button ${activeTab === "signup" ? "active" : ""}`}
              onClick={() => setActiveTab("signup")}
            >
              Sign Up
            </button>
          </div>

          <div className="auth-content">
            <AuthForm isLogin={activeTab === "login"} key={activeTab} />
          </div>
        </div>

        <div className="auth-footer">
          <p>© {new Date().getFullYear()} CodeColab. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
