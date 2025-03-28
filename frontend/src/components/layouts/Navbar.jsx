import { useNavigate, useLocation } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { auth } from "../../firebaseConfig";
import { useSession } from "../../contexts/SessionContext";
import { getImageUrl, preloadImage } from "../../utils/imageUtils.jsx";
import { useEffect } from "react";
import PropTypes from "prop-types";
import FriendDropdown from "../common/FriendDropdown";
import NotificationMenu from "../notifications/NotificationMenu";
import SessionTimer from "../sessions/SessionTimer";

const Navbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  const { currentSession } = useSession();
  const isSessionPage = location.pathname.includes("/sessions/");
  const sessionId = isSessionPage ? location.pathname.split("/").pop() : null;

  // Preload user avatar to prevent rate limiting
  useEffect(() => {
    if (user?.photoURL) {
      preloadImage(user.photoURL);
    }
  }, [user?.photoURL]);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button
          className="hamburger-button mobile-only"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <FaBars />
        </button>
        {currentSession && isSessionPage && (
          <div className="active-session-indicator flex items-center">
            <span className="session-status">Connected: </span>
            <span className="session-name mr-3">
              {currentSession?.title || "Untitled Session"}
            </span>
            {sessionId && (
              <SessionTimer sessionId={sessionId} className="ml-2" />
            )}
          </div>
        )}
      </div>

      <div className="navbar-profile">
        <div className="navbar-icons">
          <FriendDropdown />
        </div>
        <div className="navbar-right">
          <NotificationMenu />
        </div>
        <button
          className="user-profile-section"
          onClick={() => navigate("/dashboard/profile")}
          aria-label="View profile"
        >
          <img
            src={getImageUrl(user?.photoURL)}
            alt="Profile"
            className="user-avatar"
            loading="lazy"
            crossOrigin="anonymous"
          />
        </button>
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  toggleSidebar: PropTypes.func.isRequired,
};

export default Navbar;
