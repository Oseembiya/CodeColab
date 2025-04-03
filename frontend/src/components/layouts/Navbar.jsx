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
          onClick={() => navigate("/profile")}
          aria-label="View profile"
        >
          <img
            src={getImageUrl(user?.photoURL)}
            alt="Profile"
            className="user-avatar"
            loading="lazy"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cpath fill='%23c6c6c6' d='M0 0h128v128H0z'/%3E%3Ccircle fill='%23fff' cx='64' cy='48' r='28'/%3E%3Cpath fill='%23fff' d='M64 95c19.883 0 36-8.075 36-18.031V89c0 18-16.117 33-36 33S28 107 28 89V76.969C28 86.925 44.117 95 64 95z'/%3E%3C/svg%3E";
            }}
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
