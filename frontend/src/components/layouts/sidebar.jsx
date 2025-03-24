import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaCode,
  FaSignOutAlt,
  FaTimes,
  FaUsers,
  FaPencilAlt,
  FaCog,
  FaMoon,
  FaSun,
  FaDesktop,
} from "react-icons/fa";
import { useState, memo, useEffect } from "react";
import { auth, db } from "../../firebaseConfig";
import { useSession } from "../../contexts/SessionContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import PropTypes from "prop-types";

const Sidebar = memo(({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearActiveSession } = useSession();
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    theme: "system",
    codeEditor: "vscode",
    emailNotifications: true,
  });

  useEffect(() => {
    // Load user preferences
    const loadPreferences = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setPreferences({
              theme: userData.theme || "system",
              codeEditor: userData.codeEditor || "vscode",
              emailNotifications: userData.emailNotifications !== false,
            });
          }
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    };

    loadPreferences();
  }, []);

  const handleSignOut = async () => {
    try {
      clearActiveSession();
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handlePreferenceChange = async (name, value) => {
    try {
      const newPreferences = { ...preferences, [name]: value };
      setPreferences(newPreferences);

      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { [name]: value });
      }

      // Apply theme change immediately
      if (name === "theme") {
        applyTheme(value);
      }
    } catch (error) {
      console.error("Error updating preference:", error);
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      // System preference
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        root.setAttribute("data-theme", "dark");
      } else {
        root.setAttribute("data-theme", "light");
      }
    }
  };

  // Apply theme on initial load
  useEffect(() => {
    applyTheme(preferences.theme);
  }, [preferences.theme]);

  return (
    <>
      <div
        className={`sidebar ${isOpen ? "sidebar-open" : ""}`}
        role="navigation"
      >
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img
              src="/logo.ico"
              alt="CodeColab Logo"
              className="sidebar-logo"
            />
            <h2>CodeColab</h2>
          </div>
          <button className="sidebar-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="sidebar-menu">
          <Link
            to="/dashboard"
            className={`menu-item ${
              location.pathname === "/dashboard" ? "active" : ""
            }`}
            onClick={onClose}
          >
            <FaHome />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/dashboard/editor"
            className={`menu-item ${
              location.pathname === "/dashboard/editor" ? "active" : ""
            }`}
            onClick={onClose}
          >
            <FaCode />
            <span>Solo Editor</span>
          </Link>

          <Link
            to="/dashboard/sessions"
            className={`menu-item ${
              location.pathname === "/dashboard/sessions" ? "active" : ""
            }`}
            onClick={onClose}
          >
            <FaUsers />
            <span>Colab Sessions</span>
          </Link>

          <Link
            to="/dashboard/whiteboard"
            className={`menu-item ${
              location.pathname === "/dashboard/whiteboard" ? "active" : ""
            }`}
            onClick={onClose}
          >
            <FaPencilAlt />
            <span>Whiteboard</span>
          </Link>
        </div>

        <div className="sidebar-footer">
          {/* Preferences section */}
          <div className="preferences-section">
            <button
              className="preferences-toggle"
              onClick={() => setShowPreferences(!showPreferences)}
            >
              <FaCog />
              <span>Preferences</span>
            </button>

            {showPreferences && (
              <div className="preferences-panel">
                <div className="preference-item">
                  <span>Theme</span>
                  <div className="theme-buttons">
                    <button
                      className={preferences.theme === "light" ? "active" : ""}
                      onClick={() => handlePreferenceChange("theme", "light")}
                      title="Light Theme"
                    >
                      <FaSun />
                    </button>
                    <button
                      className={preferences.theme === "dark" ? "active" : ""}
                      onClick={() => handlePreferenceChange("theme", "dark")}
                      title="Dark Theme"
                    >
                      <FaMoon />
                    </button>
                    <button
                      className={preferences.theme === "system" ? "active" : ""}
                      onClick={() => handlePreferenceChange("theme", "system")}
                      title="System Theme"
                    >
                      <FaDesktop />
                    </button>
                  </div>
                </div>

                <div className="preference-item">
                  <span>Code Editor</span>
                  <select
                    value={preferences.codeEditor}
                    onChange={(e) =>
                      handlePreferenceChange("codeEditor", e.target.value)
                    }
                  >
                    <option value="vscode">VS Code</option>
                    <option value="sublime">Sublime Text</option>
                    <option value="atom">Atom</option>
                  </select>
                </div>

                <div className="preference-item checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) =>
                        handlePreferenceChange(
                          "emailNotifications",
                          e.target.checked
                        )
                      }
                    />
                    <span>Email Notifications</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleSignOut} className="sign-out-link">
            <FaSignOutAlt />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
    </>
  );
});

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

Sidebar.displayName = "Sidebar";
export default Sidebar;
