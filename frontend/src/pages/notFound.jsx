import React from "react";
import { Link, useNavigate } from "react-router-dom";

/**
 * NotFound page - displays when a route is not found (404)
 */
const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl md:text-9xl font-bold text-gray-300">404</h1>
      <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6">
        Page Not Found
      </h2>
      <p className="text-lg md:text-xl mb-8 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 text-lg font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
        >
          Go Back
        </button>
        <Link
          to="/"
          className="px-6 py-2 text-lg font-medium rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
