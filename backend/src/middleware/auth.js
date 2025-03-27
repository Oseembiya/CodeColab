/**
 * Authentication middleware to verify Firebase ID tokens
 */
const { admin } = require("../../firebaseConfig");

/**
 * Middleware to verify Firebase auth tokens
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
const verifyAuthToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn(`Auth failed: Missing or invalid header - ${req.path}`);
    return res
      .status(401)
      .json({ error: "Unauthorized: Missing or invalid authorization header" });
  }

  const token = authHeader.split("Bearer ")[1];

  if (!token) {
    console.warn(`Auth failed: Empty token - ${req.path}`);
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    req.userId = decodedToken.uid;
    console.log(
      `Authenticated request for user ${decodedToken.uid} to ${req.path}`
    );
    next();
  } catch (error) {
    // Log detailed error information for debugging
    console.error(
      `Auth token verification failed for ${req.path}:`,
      error.message
    );

    // Determine the specific error type for a better client response
    let errorMessage = "Unauthorized: Invalid token";

    if (error.code === "auth/id-token-expired") {
      errorMessage = "Unauthorized: Token expired";
    } else if (error.code === "auth/id-token-revoked") {
      errorMessage = "Unauthorized: Token revoked";
    } else if (error.code === "auth/invalid-id-token") {
      errorMessage = "Unauthorized: Token is invalid";
    }

    return res.status(401).json({ error: errorMessage });
  }
};

/**
 * Optional auth middleware - allows requests without auth but adds user info if available
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split("Bearer ")[1];

  if (!token) {
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    req.userId = decodedToken.uid;
    console.log(
      `Optionally authenticated request for user ${decodedToken.uid} to ${req.path}`
    );
  } catch (error) {
    // Just log the error but continue
    console.warn(
      `Invalid token for optional auth to ${req.path}:`,
      error.message
    );
  }

  next();
};

// Helper to check if a request is authenticated
const isAuthenticated = (req) => {
  return !!req.user && !!req.userId;
};

module.exports = {
  verifyAuthToken,
  optionalAuth,
  isAuthenticated,
};
