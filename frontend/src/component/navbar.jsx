import UserProfile from './userProfile';
import { FaSearch } from 'react-icons/fa';

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
                <UserProfile onProfileClick={onProfileClick} />
            </div>
        </nav>
    );
};

export default Navbar;