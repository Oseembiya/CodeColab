import { createContext, useContext, useState } from "react";
import PropTypes from "prop-types";

// Context to manage which dropdown is currently open
const DropdownContext = createContext();

export const DropdownProvider = ({ children }) => {
  const [openDropdown, setOpenDropdown] = useState(null);

  // Function to open a specific dropdown and close any others
  const openDropdownMenu = (dropdownName) => {
    setOpenDropdown(dropdownName === openDropdown ? null : dropdownName);
  };

  // Function to close all dropdowns
  const closeAllDropdowns = () => {
    setOpenDropdown(null);
  };

  // Check if a specific dropdown is open
  const isDropdownOpen = (dropdownName) => {
    return openDropdown === dropdownName;
  };

  const contextValue = {
    openDropdownMenu,
    closeAllDropdowns,
    isDropdownOpen,
    openDropdown,
  };

  return (
    <DropdownContext.Provider value={contextValue}>
      {children}
    </DropdownContext.Provider>
  );
};

// Custom hook to use the dropdown context
export const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdown must be used within a DropdownProvider");
  }
  return context;
};

DropdownProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default DropdownContext;
