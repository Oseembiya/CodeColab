import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SocketProvider, useSocket } from "./SocketContext";
import { useAuth } from "../hooks/useAuth";

// Mock Socket.io
vi.mock("socket.io-client", () => {
  const mockSocket = {
    on: vi.fn((event, callback) => {
      // Immediately trigger connect event
      if (event === "connect") {
        setTimeout(() => callback(), 0);
      }
      return mockSocket;
    }),
    io: {
      engine: {
        on: vi.fn(),
        transport: { name: "polling" },
      },
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
    observing: null,
    emit: vi.fn(),
  };

  return {
    io: vi.fn().mockReturnValue(mockSocket),
  };
});

// Mock UUID
vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("test-client-id"),
}));

// Mock Auth hook
vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// Storage mock
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key],
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Helper component to test the socket hook
const TestComponent = () => {
  const socket = useSocket();
  return (
    <div>
      <div data-testid="connection-status">{socket.connectionStatus}</div>
      <div data-testid="is-connected">{socket.isConnected.toString()}</div>
    </div>
  );
};

describe("SocketContext", () => {
  const mockGetIdToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Default mock for unauthenticated user
    useAuth.mockReturnValue({
      user: null,
      getIdToken: mockGetIdToken,
    });
  });

  it("should initialize socket connection", async () => {
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    expect(localStorageMock.getItem("clientId")).toBe("test-client-id");

    // We need to manually trigger state update since we're in a test environment
    // The socket.on handler will now call the connect callback we set up in our mock
    await waitFor(
      () => {
        expect(screen.getByTestId("is-connected").textContent).toBe("true");
      },
      { timeout: 2000 }
    );
  });

  it("should include authentication token when user is logged in", async () => {
    // Setup authenticated user
    const mockUser = { uid: "test-user-id" };
    const mockToken = "test-auth-token";

    useAuth.mockReturnValue({
      user: mockUser,
      getIdToken: mockGetIdToken.mockResolvedValue(mockToken),
    });

    // Render with provider
    render(
      <SocketProvider>
        <TestComponent />
      </SocketProvider>
    );

    // Verify getIdToken was called
    expect(mockGetIdToken).toHaveBeenCalled();
  });
});
