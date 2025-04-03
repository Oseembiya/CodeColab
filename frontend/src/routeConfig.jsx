import { lazy } from "react";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Lazy loaded components for code splitting
const Dashboard = lazy(() => import("./pages/dashboard"));
const Login = lazy(() => import("./pages/login"));
const SignUp = lazy(() => import("./pages/signup"));
const Profile = lazy(() => import("./pages/profile"));
const Sessions = lazy(() => import("./pages/sessions"));
const LiveSession = lazy(() => import("./pages/liveSession"));
const NotFound = lazy(() => import("./pages/notFound"));

/**
 * Application route configuration
 * This defines all routes and their respective components, access control,
 * and nesting structure.
 */
const routeConfig = [
  // Login route (public)
  {
    path: "/login",
    element: {
      type: "auth-aware", // Special type that redirects authenticated users
      component: Login,
    },
  },
  // Signup route (public)
  {
    path: "/signup",
    element: {
      type: "auth-aware", // Special type that redirects authenticated users
      component: SignUp,
    },
  },

  // Dashboard and protected routes
  {
    path: "/",
    element: {
      type: "protected",
      component: ProtectedRoute,
    },
    children: [
      {
        index: true, // Root path shows dashboard for authenticated users
        element: {
          type: "component",
          component: Dashboard,
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
