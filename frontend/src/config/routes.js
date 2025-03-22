import { lazy } from "react";
import { ROUTES } from "./constants";

// Lazy-load all route components for better code splitting
const AuthPage = lazy(() => import("../pages/auth"));
const Dashboard = lazy(() => import("../pages/dashboard"));
const Profile = lazy(() => import("../pages/profile"));
const CodeEditor = lazy(() => import("../pages/CodeEditorPage"));
const Sessions = lazy(() => import("../pages/sessions"));
const LiveSession = lazy(() => import("../pages/liveSession"));
const Whiteboard = lazy(() => import("../components/whiteboard/Whiteboard"));
const ProtectedRoute = lazy(() => import("../pages/protectedRoute"));

/**
 * Route configuration for the application
 * This centralizes all route definitions and makes it easier to manage
 */
const routeConfig = [
  {
    path: ROUTES.HOME,
    element: { type: "redirect", to: ROUTES.SIGNUP },
  },
  {
    path: ROUTES.SIGNUP,
    element: { type: "component", component: AuthPage },
    public: true,
  },
  {
    path: ROUTES.LOGIN,
    element: { type: "component", component: AuthPage },
    public: true,
  },
  {
    path: ROUTES.DASHBOARD,
    element: { type: "protected", component: ProtectedRoute },
    children: [
      {
        index: true,
        element: { type: "component", component: Dashboard },
      },
      {
        path: "profile",
        element: { type: "component", component: Profile },
      },
      {
        path: "editor",
        element: { type: "component", component: CodeEditor },
      },
      {
        path: "sessions",
        element: { type: "component", component: Sessions },
      },
      {
        path: "sessions/:sessionId",
        element: { type: "component", component: LiveSession },
      },
      {
        path: "sessions/:sessionId/whiteboard",
        element: { type: "component", component: Whiteboard },
      },
    ],
  },
  {
    path: "*",
    element: { type: "redirect", to: ROUTES.DASHBOARD },
  },
];

/**
 * Get all routes with their components
 * @returns {Array} Array of route objects
 */
export const getRoutes = () => routeConfig;

/**
 * Get all public routes
 * @returns {Array} Array of public route paths
 */
export const getPublicRoutes = () =>
  routeConfig.filter((route) => route.public).map((route) => route.path);

/**
 * Get all protected routes
 * @returns {Array} Array of protected route paths
 */
export const getProtectedRoutes = () =>
  routeConfig.filter((route) => !route.public).map((route) => route.path);

export default routeConfig;
