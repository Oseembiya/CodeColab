/**
 * Centralized data store for server-side state management
 */
class SessionStore {
  constructor() {
    // Main data structures
    this.activeSessions = new Map();
    this.sessionStates = new Map();
    this.videoParticipants = new Map();
    this.connectedClients = new Map();
    this.sessionObservers = new Map();
    this.whiteboardStates = new Map();
  }

  /**
   * Get or create session data
   */
  getSession(sessionId) {
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, new Map());
    }
    return this.activeSessions.get(sessionId);
  }

  /**
   * Add a user to a session
   */
  addUserToSession(sessionId, clientId, userData) {
    const sessionUsers = this.getSession(sessionId);
    sessionUsers.set(clientId, userData);
    return Array.from(sessionUsers.entries()).map(([id, user]) => ({
      userId: id,
      ...user,
    }));
  }

  /**
   * Remove a user from a session
   */
  removeUserFromSession(sessionId, clientId) {
    const sessionUsers = this.getSession(sessionId);
    const userRemoved = sessionUsers.delete(clientId);

    if (sessionUsers.size === 0) {
      this.activeSessions.delete(sessionId);
      this.sessionStates.delete(sessionId);
    }

    return userRemoved
      ? Array.from(sessionUsers.entries()).map(([id, user]) => ({
          userId: id,
          ...user,
        }))
      : null;
  }

  /**
   * Get all users in a session
   */
  getSessionUsers(sessionId) {
    const sessionUsers = this.activeSessions.get(sessionId);
    if (!sessionUsers) return [];

    return Array.from(sessionUsers.entries()).map(([id, user]) => ({
      userId: id,
      ...user,
    }));
  }

  /**
   * Get or set session code state
   */
  getSessionState(sessionId) {
    return this.sessionStates.get(sessionId);
  }

  /**
   * Update session state
   */
  updateSessionState(sessionId, newState) {
    this.sessionStates.set(sessionId, {
      ...this.getSessionState(sessionId),
      ...newState,
      lastEditAt: Date.now(),
    });
    return this.sessionStates.get(sessionId);
  }

  /**
   * Add observer to a session
   */
  addSessionObserver(sessionId, socketId) {
    const observers = this.sessionObservers.get(sessionId) || new Set();
    observers.add(socketId);
    this.sessionObservers.set(sessionId, observers);
    return observers.size;
  }

  /**
   * Remove observer from a session
   */
  removeSessionObserver(sessionId, socketId) {
    const observers = this.sessionObservers.get(sessionId);
    if (!observers) return 0;

    observers.delete(socketId);
    if (observers.size === 0) {
      this.sessionObservers.delete(sessionId);
      return 0;
    }

    this.sessionObservers.set(sessionId, observers);
    return observers.size;
  }

  /**
   * Get or update whiteboard state
   */
  getWhiteboardState(sessionId) {
    return this.whiteboardStates.get(sessionId);
  }

  updateWhiteboardState(sessionId, canvasData) {
    this.whiteboardStates.set(sessionId, canvasData);
    return canvasData;
  }

  /**
   * Connect/disconnect client
   */
  connectClient(clientId, socket) {
    const existingSocket = this.connectedClients.get(clientId);
    this.connectedClients.set(clientId, socket);
    return existingSocket;
  }

  disconnectClient(clientId) {
    return this.connectedClients.delete(clientId);
  }

  /**
   * Video participants tracking
   */
  addVideoParticipant(sessionId, peerId) {
    if (!this.videoParticipants.has(sessionId)) {
      this.videoParticipants.set(sessionId, new Set());
    }
    const participants = this.videoParticipants.get(sessionId);
    participants.add(peerId);
    return Array.from(participants);
  }

  removeVideoParticipant(sessionId, peerId) {
    if (!this.videoParticipants.has(sessionId)) return [];

    const participants = this.videoParticipants.get(sessionId);
    participants.delete(peerId);

    if (participants.size === 0) {
      this.videoParticipants.delete(sessionId);
      return [];
    }

    return Array.from(participants);
  }

  // Add this method to count active users
  getActiveUsersCount() {
    const uniqueUsers = new Set();

    // Iterate through active sessions and collect unique users
    this.activeSessions.forEach((users) => {
      users.forEach((user) => {
        if (user.clientId) {
          uniqueUsers.add(user.clientId);
        }
      });
    });

    return uniqueUsers.size;
  }
}

// Export a singleton instance
module.exports = new SessionStore();
