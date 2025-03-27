const { io } = require("socket.io-client");

console.log("Starting socket.io test...");

// Test 1: Connect without authentication
const socket1 = io("http://localhost:3001", {
  auth: {
    clientId: "test-client-1",
    // No token provided
  },
});

socket1.on("connect", () => {
  console.log(
    "Socket 1 connected without auth token (expected: connection allowed but limited access)"
  );
});

socket1.on("connect_error", (err) => {
  console.error("Socket 1 connection error:", err.message);
});

// Test 2: Connect with invalid token
const socket2 = io("http://localhost:3001", {
  auth: {
    clientId: "test-client-2",
    token: "invalid-token",
  },
});

socket2.on("connect", () => {
  console.log("Socket 2 connected with invalid token (unexpected)");
});

socket2.on("connect_error", (err) => {
  console.error("Socket 2 connection error (expected):", err.message);
});

// Clean up after 5 seconds
setTimeout(() => {
  socket1.disconnect();
  socket2.disconnect();
  console.log("Test completed. Disconnected sockets.");
}, 5000);
