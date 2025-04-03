import { lazy } from "react";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import Dashboard from "./pages/dashboard";

// Lazy loaded components for code splitting
const Dashboard = lazy(() => import("./pages/dashboard"));
const Login = lazy(() => import("./pages/login"));
const Profile = lazy(() => import("./pages/profile"));
const Sessions = lazy(() => import("./pages/sessions"));
const LiveSession = lazy(() => import("./pages/liveSession"));
const Settings = lazy(() => import("./pages/settings"));
const NotFound = lazy(() => import("./pages/notFound"));

/**
 * Application route configuration
 * This defines all routes and their respective components, access control,
 * and nesting structure.
 */
const routeConfig = [
  // Public routes - accessible without authentication
  {
    path: "/",
    element: {
      type: "public",
      component: PublicRoute,
    },
    children: [
      {
        index: true,
        element: {
          type: "component",
          component: Dashboard,
        },
      },
      {
        path: "login",
        element: {
          type: "component",
          component: Login,
        },
      },
    ],
  },

  // Protected routes - require authentication
  {
    path: "/app",
    element: {
      type: "protected",
      component: ProtectedRoute,
    },
    children: [
      {
        index: true,
        element: {
          type: "redirect",
          to: "/app/sessions",
        },
      },
      {
        path: "sessions",
        element: {
          type: "component",
          component: Sessions,
        },
      },
      {
        path: "session/:sessionId",
        element: {
          type: "component",
          component: LiveSession,
        },
      },
      {
        path: "profile",
        element: {
          type: "component",
          component: Profile,
        },
      },
      {
        path: "settings",
        element: {
          type: "component",
          component: Settings,
        },
      },
    ],
  },

  // 404 route
  {
    path: "*",
    element: {
      type: "component",
      component: NotFound,
    },
  },
];

export default routeConfig;
