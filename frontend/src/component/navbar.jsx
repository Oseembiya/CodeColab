import UserProfile from './userProfile';
import { FaSearch, FaBell, FaEnvelope } from 'react-icons/fa';

const Navbar = () => {
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
                <UserProfile />
            </div>
        </nav>
    );
};

export default Navbar;