/**
 * Application constants
 * This file provides centralized constants used throughout the application
 */

// Session status constants
export const SESSION_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  ENDED: "ended",
  CANCELLED: "cancelled",
  SCHEDULED: "scheduled",
};

// Role constants
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
};

// Programming language options for sessions
export const LANGUAGES = [
  { id: "javascript", name: "JavaScript", icon: "js" },
  { id: "typescript", name: "TypeScript", icon: "ts" },
  { id: "python", name: "Python", icon: "py" },
  { id: "java", name: "Java", icon: "java" },
  { id: "csharp", name: "C#", icon: "cs" },
  { id: "cpp", name: "C++", icon: "cpp" },
  { id: "go", name: "Go", icon: "go" },
  { id: "ruby", name: "Ruby", icon: "rb" },
  { id: "php", name: "PHP", icon: "php" },
  { id: "rust", name: "Rust", icon: "rs" },
  { id: "swift", name: "Swift", icon: "swift" },
  { id: "kotlin", name: "Kotlin", icon: "kt" },
];

// Session duration options in minutes
export const DURATION_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 0, label: "Unlimited" },
];

// Maximum number of participants allowed in a session
export const MAX_PARTICIPANTS = 8;

// Default session settings
export const DEFAULT_SESSION_SETTINGS = {
  language: "javascript",
  duration: 60,
  maxParticipants: 4,
  isPrivate: false,
};

// Theme options
export const THEMES = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "system", name: "System" },
];

// Editor font size options
export const FONT_SIZES = [
  { value: 12, label: "Small" },
  { value: 14, label: "Medium" },
  { value: 16, label: "Large" },
  { value: 18, label: "Extra Large" },
];

// API error messages
export const API_ERRORS = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  SERVER_ERROR: "Server error. Please try again later.",
  UNAUTHORIZED: "Unauthorized. Please log in again.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "Resource not found.",
  VALIDATION_ERROR: "Validation error. Please check your input.",
};

// Local storage keys
export const STORAGE_KEYS = {
  THEME: "codeColab.theme",
  FONT_SIZE: "codeColab.fontSize",
  RECENT_SESSIONS: "codeColab.recentSessions",
  AUTH_TOKEN: "codeColab.authToken",
  USER_SETTINGS: "codeColab.userSettings",
};
