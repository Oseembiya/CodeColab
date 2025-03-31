/**
 * User metrics tracking utility
 * Tracks and manages user metrics:
 * - Total sessions
 * - Hours spent
 * - Lines of code collaborations
 */

const { db } = require("../../firebaseConfig");
const admin = require("firebase-admin");

const metricsCache = new Map();

/**
 * Initialize or get metrics for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - User metrics
 */
const getUserMetrics = async (userId) => {
  // Check cache first
  if (metricsCache.has(userId)) {
    return metricsCache.get(userId);
  }

  try {
    const userMetricsRef = db.collection("userMetrics").doc(userId);
    const metricsDoc = await userMetricsRef.get();

    let metrics;
    if (metricsDoc.exists()) {
      metrics = metricsDoc.data();
    } else {
      // Initialize metrics for new users
      metrics = {
        totalSessions: 0,
        hoursSpent: 0,
        linesOfCode: 0,
        collaborations: 0,
        collaboratedWith: [],
        lastSessionStart: null,
        lastActive: new Date().toISOString(),
      };

      // Create the document
      await userMetricsRef.set(metrics);
    }

    // Update cache
    metricsCache.set(userId, metrics);
    return metrics;
  } catch (error) {
    console.error("Error getting user metrics:", error);
    return null;
  }
};

/**
 * Increment user session count
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The session ID
 */
const incrementUserSession = async (userId, sessionId) => {
  if (!userId || !sessionId) return;

  try {
    // First check if user metrics document exists, create if not
    const userMetricsRef = db.collection("userMetrics").doc(userId);
    const metricsDoc = await userMetricsRef.get();

    // Start session timestamp
    const sessionStart = new Date().toISOString();

    if (!metricsDoc.exists()) {
      // Create a new document if it doesn't exist
      await userMetricsRef.set({
        totalSessions: 1,
        sessionsJoined: [sessionId], // Track unique sessions
        hoursSpent: 0,
        linesOfCode: 0,
        lastSessionStart: sessionStart,
        lastActive: sessionStart,
      });
      console.log(
        `Created new metrics for user ${userId} with session ${sessionId}`
      );
    } else {
      const data = metricsDoc.data();
      const sessionsJoined = data.sessionsJoined || [];

      // Only increment if this is a new session
      if (!sessionsJoined.includes(sessionId)) {
        sessionsJoined.push(sessionId);
        await userMetricsRef.update({
          totalSessions: admin.firestore.FieldValue.increment(1),
          sessionsJoined: sessionsJoined,
          lastSessionStart: sessionStart,
          lastActive: sessionStart,
        });
        console.log(
          `Incremented session count for user ${userId} with new session ${sessionId}`
        );
      } else {
        // Just update timestamps without incrementing
        await userMetricsRef.update({
          lastSessionStart: sessionStart,
          lastActive: sessionStart,
        });
        console.log(
          `User ${userId} rejoined existing session ${sessionId} - not incrementing count`
        );
      }
    }

    // Update cache if exists
    if (metricsCache.has(userId)) {
      const cached = metricsCache.get(userId);
      const sessionsJoined = cached.sessionsJoined || [];
      const isNewSession = !sessionsJoined.includes(sessionId);

      if (isNewSession) {
        sessionsJoined.push(sessionId);
      }

      metricsCache.set(userId, {
        ...cached,
        totalSessions: isNewSession
          ? (cached.totalSessions || 0) + 1
          : cached.totalSessions || 0,
        sessionsJoined: sessionsJoined,
        lastSessionStart: sessionStart,
        lastActive: sessionStart,
      });
    }
  } catch (error) {
    console.error("Error incrementing user session:", error);
  }
};

/**
 * Update user active time
 * @param {string} userId - The user's ID
 * @param {Date} lastActive - Last active timestamp
 */
const updateUserActiveTime = async (userId, lastActive = new Date()) => {
  if (!userId) return;

  try {
    // First check if user metrics document exists, create if not
    const userMetricsRef = db.collection("userMetrics").doc(userId);
    const metricsDoc = await userMetricsRef.get();

    if (!metricsDoc.exists()) {
      // Create a new document with default values
      await userMetricsRef.set({
        totalSessions: 0,
        hoursSpent: 0,
        linesOfCode: 0,
        lastSessionStart: null,
        lastActive: lastActive.toISOString(),
      });
      return;
    }

    // Get current metrics
    const metrics = metricsDoc.data();
    if (!metrics || !metrics.lastSessionStart) return;

    // Calculate time spent in this session
    const sessionStart = new Date(metrics.lastSessionStart);
    const currentTime = new Date(lastActive);
    const timeSpentHours = (currentTime - sessionStart) / (1000 * 60 * 60);

    // Only update if meaningful time has passed (more than a minute)
    if (timeSpentHours > 0.016) {
      // Update Firestore - increment hours spent
      await userMetricsRef.update({
        hoursSpent: admin.firestore.FieldValue.increment(timeSpentHours),
        lastActive: currentTime.toISOString(),
      });

      // Update cache if exists
      if (metricsCache.has(userId)) {
        const cached = metricsCache.get(userId);
        metricsCache.set(userId, {
          ...cached,
          hoursSpent: (cached.hoursSpent || 0) + timeSpentHours,
          lastActive: currentTime.toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("Error updating user active time:", error);
  }
};

/**
 * Increment lines of code
 * @param {string} userId - The user's ID
 * @param {number} lineCount - Number of lines changed (default 1)
 */
const incrementLinesOfCode = async (userId, lineCount = 1) => {
  if (!userId) return;

  try {
    // First check if user metrics document exists, create if not
    const userMetricsRef = db.collection("userMetrics").doc(userId);
    const metricsDoc = await userMetricsRef.get();

    if (!metricsDoc.exists()) {
      // Create a new document with the initial line count
      await userMetricsRef.set({
        totalSessions: 0,
        hoursSpent: 0,
        linesOfCode: lineCount,
        lastSessionStart: null,
        lastActive: new Date().toISOString(),
      });
    } else {
      // Update existing document
      await userMetricsRef.update({
        linesOfCode: admin.firestore.FieldValue.increment(lineCount),
        lastActive: new Date().toISOString(),
      });
    }

    // Update cache if exists
    if (metricsCache.has(userId)) {
      const cached = metricsCache.get(userId);
      metricsCache.set(userId, {
        ...cached,
        linesOfCode: (cached.linesOfCode || 0) + lineCount,
        lastActive: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error incrementing lines of code:", error);
  }
};

/**
 * Track a collaboration between users
 * @param {string} userId - The user's ID
 * @param {string} collaboratorId - The collaborator's ID
 * @param {string} sessionId - The session ID
 */
const trackCollaboration = async (userId, collaboratorId, sessionId) => {
  if (!userId || !collaboratorId || userId === collaboratorId) return;

  try {
    // Get the user metrics
    const userMetricsRef = db.collection("userMetrics").doc(userId);
    const metricsDoc = await userMetricsRef.get();

    if (!metricsDoc.exists()) {
      // Create a new document with default values
      await userMetricsRef.set({
        totalSessions: 0,
        hoursSpent: 0,
        linesOfCode: 0,
        collaborations: 1,
        collaboratedWith: [collaboratorId],
        lastSessionStart: null,
        lastActive: new Date().toISOString(),
      });
    } else {
      const data = metricsDoc.data();
      const collaboratedWith = data.collaboratedWith || [];

      // Only increment if this is a new collaborator
      if (!collaboratedWith.includes(collaboratorId)) {
        await userMetricsRef.update({
          collaborations: admin.firestore.FieldValue.increment(1),
          collaboratedWith:
            admin.firestore.FieldValue.arrayUnion(collaboratorId),
          lastActive: new Date().toISOString(),
        });
      }
    }

    // Update cache if exists
    if (metricsCache.has(userId)) {
      const cached = metricsCache.get(userId);
      const collaboratedWith = cached.collaboratedWith || [];
      const isNewCollaborator = !collaboratedWith.includes(collaboratorId);

      if (isNewCollaborator) {
        collaboratedWith.push(collaboratorId);
      }

      metricsCache.set(userId, {
        ...cached,
        collaborations: isNewCollaborator
          ? (cached.collaborations || 0) + 1
          : cached.collaborations || 0,
        collaboratedWith: collaboratedWith,
        lastActive: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error tracking collaboration:", error);
  }
};

/**
 * Track completed session
 * @param {string} userId - The user's ID
 * @param {string} sessionId - The session ID
 */
const trackCompletedSession = async (userId, sessionId) => {
  if (!userId || !sessionId) return;

  try {
    // Get the user metrics
    const userMetricsRef = db.collection("userMetrics").doc(userId);
    const metricsDoc = await userMetricsRef.get();

    if (!metricsDoc.exists()) {
      // Create a new document with default values
      await userMetricsRef.set({
        totalSessions: 0,
        hoursSpent: 0,
        linesOfCode: 0,
        collaborations: 0,
        completedSessions: 1,
        completedSessionIds: [sessionId],
        lastSessionStart: null,
        lastActive: new Date().toISOString(),
      });
    } else {
      const data = metricsDoc.data();
      const completedSessionIds = data.completedSessionIds || [];

      // Only increment if this is a new completed session
      if (!completedSessionIds.includes(sessionId)) {
        await userMetricsRef.update({
          completedSessions: admin.firestore.FieldValue.increment(1),
          completedSessionIds: admin.firestore.FieldValue.arrayUnion(sessionId),
          lastActive: new Date().toISOString(),
        });
      }
    }

    // Update cache if exists
    if (metricsCache.has(userId)) {
      const cached = metricsCache.get(userId);
      const completedSessionIds = cached.completedSessionIds || [];
      const isNewCompletedSession = !completedSessionIds.includes(sessionId);

      if (isNewCompletedSession) {
        completedSessionIds.push(sessionId);
      }

      metricsCache.set(userId, {
        ...cached,
        completedSessions: isNewCompletedSession
          ? (cached.completedSessions || 0) + 1
          : cached.completedSessions || 0,
        completedSessionIds: completedSessionIds,
        lastActive: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error tracking completed session:", error);
  }
};

// Export functions
module.exports = {
  getUserMetrics,
  incrementUserSession,
  updateUserActiveTime,
  incrementLinesOfCode,
  trackCollaboration,
  trackCompletedSession,
};
