import UserProfile from './userProfile';
import { FaSearch } from 'react-icons/fa';
import Profile from '../pages/profile';

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
                <UserProfile />
                <Profile />
            </div>
        </nav>
    );
};

export default Navbar;