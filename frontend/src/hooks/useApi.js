/**
 * Hook for making authenticated API calls
 */
import { useMemo } from "react";
import { createApiClient } from "../services/api";
import { useAuth } from "./useAuth";

/**
 * Hook to get an authenticated API client
 *
 * @returns {Object} API client with methods for different HTTP verbs
 */
export const useApi = () => {
  const { getIdToken, isAuthenticated } = useAuth();

  // Create API client with authentication token getter
  const api = useMemo(() => {
    // If authenticated, provide the token getter
    const tokenGetter = isAuthenticated ? getIdToken : null;
    return createApiClient(tokenGetter);
  }, [isAuthenticated, getIdToken]);

  return api;
};

export default useApi;
