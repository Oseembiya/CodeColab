import { lazy } from "react";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Lazy loaded components for code splitting
const Dashboard = lazy(() => import("./pages/dashboard"));
const Auth = lazy(() => import("./pages/auth"));
const Profile = lazy(() => import("./pages/profile"));
const Sessions = lazy(() => import("./pages/sessions"));
const LiveSession = lazy(() => import("./pages/liveSession"));
const NotFound = lazy(() => import("./pages/notFound"));
const CodeEditorPage = lazy(() => import("./pages/CodeEditorPage"));
//const WhiteboardPage = lazy(() => import("./pages/whiteboard"));

/**
 * Application route configuration
 * This defines all routes and their respective components, access control,
 * and nesting structure.
 */
const routeConfig = [
  // Public routes
  {
    path: "/login",
    element: {
      type: "auth-aware", // Special type that redirects authenticated users
      component: Auth,
    },
  },
  {
    path: "/signup",
    element: {
      type: "auth-aware", // Special type that redirects authenticated users
      component: Auth,
    },
  },

  // Root redirect
  {
    path: "/",
    element: {
      type: "protected",
      component: ProtectedRoute,
    },
    children: [
      {
        index: true,
        element: {
          type: "redirect",
          to: "/dashboard",
        },
      },
    ],
  },

  // Protected routes - main application routes
  {
    path: "/dashboard",
    element: {
      type: "protected",
      component: ProtectedRoute,
    },
    children: [
      {
        index: true,
        element: {
          type: "component",
          component: Dashboard,
        },
      },
    ],
  },
  {
    path: "/sessions",
    element: {
      type: "protected",
      component: ProtectedRoute,
    },
    children: [
      {
        index: true,
        element: {
          type: "component",
          component: Sessions,
        },
      },
    ],
  },
  {
    path: "/session/:sessionId",
    element: {
      type: "protected",
      component: ProtectedRoute,
    },
    children: [
      {
        index: true,
        element: {
          type: "component",
          component: LiveSession,
        },
      },
    ],
  },
  {
    path: "/profile",
    element: {
      type: "protected",
      component: ProtectedRoute,
    },
    children: [
      {
        index: true,
        element: {
          type: "component",
          component: Profile,
        },
      },
    ],
  },
  {
    path: "/editor",
    element: {
      type: "protected",
      component: ProtectedRoute,
    },
    children: [
      {
        index: true,
        element: {
          type: "component",
          component: CodeEditorPage,
        },
      },
    ],
  },

  // Fallback route
  {
    path: "*",
    element: {
      type: "component",
      component: NotFound,
    },
  },
];

export default routeConfig;
