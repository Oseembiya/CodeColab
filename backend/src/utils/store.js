/**
 * Centralized data store for server-side state management
 */
class SessionStore {
  constructor() {
    // Main data structures
    this.activeSessions = new Map();
    this.sessionStates = new Map();
    this.mediaParticipants = new Map(); // Renamed from videoParticipants to mediaParticipants
    this.connectedClients = new Map();
    this.sessionObservers = new Map();
    this.whiteboardStates = new Map();
    this.sessionInfo = new Map(); // For tracking session metadata like line counting status
  }

  /**
   * Initialize a session with metadata
   */
  initializeSession(sessionId, sessionData) {
    // Initialize the session with an empty participants map
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, new Map());
    }

    // Initialize session state with default content and language
    this.sessionStates.set(sessionId, {
      content: sessionData.initialContent || "",
      language: sessionData.language || "javascript",
      createdAt: Date.now(),
      lastEditAt: Date.now(),
      lastEditBy: sessionData.hostId,
    });

    // Store session metadata
    this.sessionInfo.set(sessionId, {
      title: sessionData.title || "Untitled Session",
      hostId: sessionData.hostId,
      hostName: sessionData.hostName || "Anonymous",
      isPrivate: sessionData.isPrivate || false,
      status: sessionData.status || "active",
      createdAt: sessionData.createdAt || new Date().toISOString(),
      language: sessionData.language || "javascript",
      initialContentCounted: false,
    });

    return {
      sessionId,
      info: this.sessionInfo.get(sessionId),
      state: this.sessionStates.get(sessionId),
    };
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
    if (!sessionId || !clientId) {
      console.warn(
        `Invalid sessionId or clientId in removeUserFromSession: ${sessionId}, ${clientId}`
      );
      return null;
    }

    const sessionUsers = this.activeSessions.get(sessionId);

    if (!sessionUsers) {
      console.warn(
        `Session ${sessionId} not found when removing user ${clientId}`
      );
      return null;
    }

    // Log before removal for debugging
    console.log(
      `Removing user ${clientId} from session ${sessionId}. Current users:`,
      Array.from(sessionUsers.keys())
    );

    const userRemoved = sessionUsers.delete(clientId);

    // Check if we should clean up empty sessions
    if (sessionUsers.size === 0) {
      console.log(`Removing empty session ${sessionId} from activeSessions`);
      this.activeSessions.delete(sessionId);

      // Don't delete session state as it contains the code which should persist
      // even when all users leave
    }

    if (!userRemoved) {
      console.warn(`User ${clientId} not found in session ${sessionId}`);
      return Array.from(sessionUsers.entries()).map(([id, user]) => ({
        userId: id,
        ...user,
      }));
    }

    console.log(
      `User ${clientId} removed from session ${sessionId}. Remaining: ${sessionUsers.size}`
    );

    // Return the updated participant list
    return Array.from(sessionUsers.entries()).map(([id, user]) => ({
      userId: id,
      ...user,
    }));
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
   * Media participants tracking (both audio and video)
   * Replaces the older videoParticipants functions
   */
  addMediaParticipant(sessionId, peerId, userData = {}) {
    if (!this.mediaParticipants.has(sessionId)) {
      this.mediaParticipants.set(sessionId, new Map());
    }
    const participants = this.mediaParticipants.get(sessionId);
    participants.set(peerId, userData);
    return Array.from(participants.keys());
  }

  removeMediaParticipant(sessionId, peerId) {
    if (!this.mediaParticipants.has(sessionId)) return [];

    const participants = this.mediaParticipants.get(sessionId);
    participants.delete(peerId);

    if (participants.size === 0) {
      this.mediaParticipants.delete(sessionId);
      return [];
    }

    return Array.from(participants.keys());
  }

  /**
   * Get media participant data
   */
  getMediaParticipantData(sessionId, peerId) {
    if (!this.mediaParticipants.has(sessionId)) return null;
    const participants = this.mediaParticipants.get(sessionId);
    return participants.get(peerId) || null;
  }

  /**
   * Update media participant data
   */
  updateMediaParticipant(sessionId, peerId, updates) {
    if (!this.mediaParticipants.has(sessionId)) return false;

    const participants = this.mediaParticipants.get(sessionId);
    const userData = participants.get(peerId);

    if (!userData) return false;

    participants.set(peerId, {
      ...userData,
      ...updates,
      updatedAt: Date.now(),
    });
    return true;
  }

  /**
   * Get all media participants for a session
   */
  getAllMediaParticipants(sessionId) {
    if (!this.mediaParticipants.has(sessionId)) return [];

    const participants = this.mediaParticipants.get(sessionId);
    return Array.from(participants.entries()).map(([peerId, data]) => ({
      peerId,
      ...data,
    }));
  }

  // Legacy support for older video functions
  addVideoParticipant(sessionId, peerId, userData = {}) {
    return this.addMediaParticipant(sessionId, peerId, {
      ...userData,
      mediaType: "video",
    });
  }

  removeVideoParticipant(sessionId, peerId) {
    return this.removeMediaParticipant(sessionId, peerId);
  }

  getVideoParticipantData(sessionId, peerId) {
    return this.getMediaParticipantData(sessionId, peerId);
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

  /**
   * Get session info
   */
  getSessionInfo(sessionId) {
    return this.sessionInfo.get(sessionId);
  }

  /**
   * Update session info
   */
  updateSessionInfo(sessionId, info) {
    this.sessionInfo.set(sessionId, {
      ...(this.sessionInfo.get(sessionId) || {}),
      ...info,
    });
    return this.sessionInfo.get(sessionId);
  }

  /**
   * Clear all participants from a session (used when a session is completed)
   */
  clearSessionParticipants(sessionId) {
    if (this.activeSessions.has(sessionId)) {
      // Get the count before clearing
      const count = this.activeSessions.get(sessionId).size;

      // Clear participants
      this.activeSessions.set(sessionId, new Map());

      // Also clear any media participants
      if (this.mediaParticipants.has(sessionId)) {
        this.mediaParticipants.delete(sessionId);
      }

      console.log(`Cleared ${count} participants from session ${sessionId}`);
      return true;
    }
    return false;
  }
}

// Export a singleton instance
module.exports = new SessionStore();
