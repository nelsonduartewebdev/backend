import {
  verifyAuthToken,
  getUserProfile,
  checkUserAdminStatus,
} from "../services/authService.js";

/**
 * Middleware to authenticate requests using JWT tokens
 * Adds user information to req.user if authentication is successful
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No valid authorization token provided",
        code: "MISSING_TOKEN",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase
    const { user, error } = await verifyAuthToken(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }

    // Add user to request object
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during authentication",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Middleware to authenticate requests but allow both authenticated and unauthenticated users
 * If token is provided and valid, adds user to req.user
 * If no token or invalid token, continues without user info
 */
export const optionalAuthentication = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.split(" ")[1];

    // Try to verify token
    const { user, error } = await verifyAuthToken(token);

    if (!error && user) {
      // Valid token, add user to request
      req.user = user;
      req.token = token;
    }

    // Continue regardless of token validity
    next();
  } catch (error) {
    console.error("Optional authentication middleware error:", error);
    // Continue without authentication if there's an error
    next();
  }
};

/**
 * Middleware to check if the authenticated user has admin privileges
 * Must be used after authenticateToken middleware
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NOT_AUTHENTICATED",
      });
    }

    // Check admin status
    const { isAdmin, error } = await checkUserAdminStatus(req.user.id);

    if (error) {
      console.error("Admin check error:", error);
      return res.status(500).json({
        success: false,
        error: "Error checking admin privileges",
        code: "ADMIN_CHECK_ERROR",
      });
    }

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Admin privileges required",
        code: "INSUFFICIENT_PRIVILEGES",
      });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during admin check",
      code: "ADMIN_ERROR",
    });
  }
};

/**
 * Middleware to check if the user's email is confirmed
 * Must be used after authenticateToken middleware
 */
export const requireEmailConfirmed = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "NOT_AUTHENTICATED",
      });
    }

    const isEmailConfirmed = !!(
      req.user.email_confirmed_at || req.user.confirmed_at
    );

    if (!isEmailConfirmed) {
      return res.status(403).json({
        success: false,
        error: "Email confirmation required",
        code: "EMAIL_NOT_CONFIRMED",
      });
    }

    next();
  } catch (error) {
    console.error("Email confirmation middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during email confirmation check",
      code: "EMAIL_CHECK_ERROR",
    });
  }
};

/**
 * Middleware to attach user profile to request
 * Must be used after authenticateToken middleware
 */
export const attachUserProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const { profile, error } = await getUserProfile(req.user.id);

    if (error) {
      console.error("Error attaching user profile:", error);
      // Continue without profile rather than failing the request
      return next();
    }

    req.userProfile = profile;
    next();
  } catch (error) {
    console.error("Attach profile middleware error:", error);
    // Continue without profile rather than failing the request
    next();
  }
};

/**
 * Middleware to validate user ownership of a resource
 * Checks if the authenticated user owns the resource based on user_id parameter or body
 */
export const requireOwnership = (userIdField = "userId") => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
          code: "NOT_AUTHENTICATED",
        });
      }

      // Get user ID from params, body, or query
      const resourceUserId =
        req.params[userIdField] ||
        req.body[userIdField] ||
        req.query[userIdField];

      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          error: `Missing ${userIdField} parameter`,
          code: "MISSING_USER_ID",
        });
      }

      if (req.user.id !== resourceUserId) {
        return res.status(403).json({
          success: false,
          error: "Access denied: insufficient permissions",
          code: "ACCESS_DENIED",
        });
      }

      next();
    } catch (error) {
      console.error("Ownership middleware error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error during ownership check",
        code: "OWNERSHIP_ERROR",
      });
    }
  };
};
