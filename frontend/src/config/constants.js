/**
 * Application-wide constants
 */

// API endpoints
export const API_ENDPOINTS = {
  IMAGE_PROXY: "/api/image-proxy",
  HEALTH: "/api/health",
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "codecolab_auth_token",
  USER_DATA: "codecolab_user_data",
  THEME: "codecolab_theme",
  EDITOR_SETTINGS: "codecolab_editor_settings",
  LAST_SESSION: "lastJoinedSession",
  IMAGE_CACHE_PREFIX: "codecolab_img_cache_",
};

// Application routes
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  PROFILE: "/dashboard/profile",
  EDITOR: "/dashboard/editor",
  SESSIONS: "/dashboard/sessions",
  SESSION: (id) => `/dashboard/sessions/${id}`,
  WHITEBOARD: (id) => `/dashboard/sessions/${id}/whiteboard`,
};

// User roles and permissions
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
};

// Session status
export const SESSION_STATUS = {
  ACTIVE: "active",
  SCHEDULED: "scheduled",
  ENDED: "ended",
  ARCHIVED: "archived",
};

// Editor languages
export const EDITOR_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
];

// Editor themes
export const EDITOR_THEMES = [
  { value: "vs-dark", label: "Dark" },
  { value: "vs-light", label: "Light" },
  { value: "hc-black", label: "High Contrast Dark" },
  { value: "hc-light", label: "High Contrast Light" },
];

// Socket events
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: "connect",
  DISCONNECT: "disconnect",

  // Session events
  JOIN_SESSION: "join-session",
  LEAVE_SESSION: "leave-session",
  USER_LEFT_SESSION: "user-left-session",
  PARTICIPANTS_UPDATE: "participants-update",

  // Code editor events
  CODE_CHANGE: "code-change",
  CODE_UPDATE: "code-update",
  LANGUAGE_CHANGE: "language-change",
  TYPING_START: "typing-start",
  TYPING_END: "typing-end",
  USER_TYPING: "user-typing",
  USER_STOPPED_TYPING: "user-stopped-typing",

  // Video events
  JOIN_VIDEO: "join-video",
  LEAVE_VIDEO: "leave-video",
  USER_JOINED: "user-joined",
  USER_LEFT: "user-left",

  // Whiteboard events
  WHITEBOARD_JOIN: "whiteboard-join",
  WHITEBOARD_DRAW: "whiteboard-draw",
  WHITEBOARD_CLEAR: "whiteboard-clear",
  WHITEBOARD_UPDATE: "whiteboard-update",
  WHITEBOARD_STATE: "whiteboard-state",

  // Observer events
  OBSERVE_SESSION: "observe-session",
  LEAVE_OBSERVER: "leave-observer",
};

export default {
  API_ENDPOINTS,
  STORAGE_KEYS,
  ROUTES,
  USER_ROLES,
  SESSION_STATUS,
  EDITOR_LANGUAGES,
  EDITOR_THEMES,
  SOCKET_EVENTS,
};
