/**
 * User metrics tracking utility
 * Tracks and manages user metrics:
 * - Total sessions
 * - Hours spent
 * - Lines of code collaborations
 */

const { db } = require("../../firebaseConfig");
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} = require("firebase/firestore");

// Cache to prevent excessive DB reads
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
    const userMetricsRef = doc(db, "userMetrics", userId);
    const metricsDoc = await getDoc(userMetricsRef);

    let metrics;
    if (metricsDoc.exists()) {
      metrics = metricsDoc.data();
    } else {
      // Initialize metrics for new users
      metrics = {
        totalSessions: 0,
        hoursSpent: 0,
        linesOfCode: 0,
        lastSessionStart: null,
        lastActive: new Date().toISOString(),
      };

      // Create the document
      await setDoc(userMetricsRef, metrics);
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
 */
const incrementUserSession = async (userId) => {
  if (!userId) return;

  try {
    // First check if user metrics document exists, create if not
    const userMetricsRef = doc(db, "userMetrics", userId);
    const metricsDoc = await getDoc(userMetricsRef);

    // Start session timestamp
    const sessionStart = new Date().toISOString();

    if (!metricsDoc.exists()) {
      // Create a new document if it doesn't exist
      await setDoc(userMetricsRef, {
        totalSessions: 1,
        hoursSpent: 0,
        linesOfCode: 0,
        lastSessionStart: sessionStart,
        lastActive: sessionStart,
      });
    } else {
      // Update existing document
      await updateDoc(userMetricsRef, {
        totalSessions: increment(1),
        lastSessionStart: sessionStart,
        lastActive: sessionStart,
      });
    }

    // Update cache if exists
    if (metricsCache.has(userId)) {
      const cached = metricsCache.get(userId);
      metricsCache.set(userId, {
        ...cached,
        totalSessions: (cached.totalSessions || 0) + 1,
        lastSessionStart: sessionStart,
        lastActive: sessionStart,
      });
    }

    console.log(`Incremented session count for user ${userId}`);
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
    const userMetricsRef = doc(db, "userMetrics", userId);
    const metricsDoc = await getDoc(userMetricsRef);

    if (!metricsDoc.exists()) {
      // Create a new document with default values
      await setDoc(userMetricsRef, {
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
      await updateDoc(userMetricsRef, {
        hoursSpent: increment(timeSpentHours),
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
    const userMetricsRef = doc(db, "userMetrics", userId);
    const metricsDoc = await getDoc(userMetricsRef);

    if (!metricsDoc.exists()) {
      // Create a new document with the initial line count
      await setDoc(userMetricsRef, {
        totalSessions: 0,
        hoursSpent: 0,
        linesOfCode: lineCount,
        lastSessionStart: null,
        lastActive: new Date().toISOString(),
      });
    } else {
      // Update existing document
      await updateDoc(userMetricsRef, {
        linesOfCode: increment(lineCount),
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

// Export functions
module.exports = {
  getUserMetrics,
  incrementUserSession,
  updateUserActiveTime,
  incrementLinesOfCode,
};
