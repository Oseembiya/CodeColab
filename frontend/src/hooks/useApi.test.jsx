import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useApi } from "./useApi";
import { useAuth } from "./useAuth";
import { createApiClient } from "../services/api";

// Mock dependencies
vi.mock("./useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/api", () => ({
  createApiClient: vi.fn(),
}));

describe("useApi hook", () => {
  const mockApiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  const mockGetIdToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createApiClient.mockReturnValue(mockApiClient);
  });

  it("should create API client with token getter when authenticated", () => {
    // Setup authenticated user
    useAuth.mockReturnValue({
      isAuthenticated: true,
      getIdToken: mockGetIdToken,
    });

    // Render the hook
    const { result } = renderHook(() => useApi());

    // Verify the hook returns the API client
    expect(result.current).toBe(mockApiClient);

    // Verify createApiClient was called with the token getter
    expect(createApiClient).toHaveBeenCalledWith(mockGetIdToken);
  });

  it("should create API client without token getter when not authenticated", () => {
    // Setup unauthenticated user
    useAuth.mockReturnValue({
      isAuthenticated: false,
      getIdToken: mockGetIdToken,
    });

    // Render the hook
    const { result } = renderHook(() => useApi());

    // Verify the hook returns the API client
    expect(result.current).toBe(mockApiClient);

    // Verify createApiClient was called without the token getter
    expect(createApiClient).toHaveBeenCalledWith(null);
  });
});
