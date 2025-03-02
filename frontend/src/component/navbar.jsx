import UserProfile from './userProfile';
import { FaSearch, FaBell, FaEnvelope } from 'react-icons/fa';

// eslint-disable-next-line react/prop-types
const Navbar = ({ onProfileClick }) => {
    return (
        <nav className="navbar">
            <div className="search-container">
                <FaSearch className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Search..." 
                    className="search-input"
                />
            </div>
            <div className="navbar-profile">
                <div className="navbar-icons">
                    <button className="icon-button">
                        <FaBell />
                        <span className="notification-badge">2</span>
                    </button>
                    <button className="icon-button">
                        <FaEnvelope />
                        <span className="notification-badge">3</span>
                    </button>
                </div>
                <UserProfile onProfileClick={onProfileClick} />
            </div>
        </nav>
    );
};

export default Navbar;