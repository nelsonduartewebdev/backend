import express from "express";
import {
  verifyToken,
  getUserProfile,
  updateUserProfile,
  createUserProfile,
  checkAdminStatus,
} from "../controllers/authController.js";
import {
  authenticateToken,
  optionalAuthentication,
  requireAdmin,
  requireEmailConfirmed,
  attachUserProfile,
  requireOwnership,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/auth/verify
 * @desc    Verify JWT token and get user information
 * @access  Public (requires valid token)
 */
router.post("/verify", verifyToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get("/me", authenticateToken, getUserProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put("/profile", authenticateToken, updateUserProfile);

/**
 * @route   POST /api/auth/profile
 * @desc    Create user profile (typically called after signup)
 * @access  Private
 */
router.post("/profile", authenticateToken, createUserProfile);

/**
 * @route   GET /api/auth/admin-status
 * @desc    Check if current user has admin privileges
 * @access  Private
 */
router.get("/admin-status", authenticateToken, checkAdminStatus);

/**
 * @route   GET /api/auth/profile/full
 * @desc    Get user profile with full details (includes profile data)
 * @access  Private
 */
router.get(
  "/profile/full",
  authenticateToken,
  attachUserProfile,
  (req, res) => {
    res.json({
      success: true,
      user: req.user,
      profile: req.userProfile || null,
    });
  }
);

/**
 * @route   GET /api/auth/status
 * @desc    Get authentication status (works with or without token)
 * @access  Public
 */
router.get("/status", optionalAuthentication, (req, res) => {
  const isAuthenticated = !!req.user;
  const isEmailConfirmed = req.user
    ? !!(req.user.email_confirmed_at || req.user.confirmed_at)
    : false;

  res.json({
    success: true,
    isAuthenticated,
    isEmailConfirmed,
    user: isAuthenticated
      ? {
          id: req.user.id,
          email: req.user.email,
          created_at: req.user.created_at,
        }
      : null,
  });
});

/**
 * @route   DELETE /api/auth/profile
 * @desc    Delete user profile (soft delete - marks as inactive)
 * @access  Private
 */
router.delete("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // You might want to implement soft delete instead of hard delete
    // For now, this is a placeholder that could update a status field
    res.json({
      success: true,
      message:
        "Profile deletion requested. This feature needs to be implemented based on your requirements.",
    });
  } catch (error) {
    console.error("Profile deletion error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh authentication token (handled by frontend, this is a placeholder)
 * @access  Private
 */
router.post("/refresh", authenticateToken, (req, res) => {
  // Token refresh is typically handled by Supabase client-side
  // This endpoint can be used for server-side token refresh if needed
  res.json({
    success: true,
    message: "Token is valid",
    user: {
      id: req.user.id,
      email: req.user.email,
      created_at: req.user.created_at,
    },
  });
});

// Admin-only routes

/**
 * @route   GET /api/auth/admin/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get(
  "/admin/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      // This would require implementing a service to list users
      res.json({
        success: true,
        message: "Admin user listing endpoint - implementation pending",
        users: [],
      });
    } catch (error) {
      console.error("Admin users list error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route   PUT /api/auth/admin/users/:userId/role
 * @desc    Update user role (admin only)
 * @access  Private (Admin)
 */
router.put(
  "/admin/users/:userId/role",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role || !["user", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Valid role (user or admin) is required",
        });
      }

      // This would require implementing role update functionality
      res.json({
        success: true,
        message: `Role update for user ${userId} to ${role} - implementation pending`,
      });
    } catch (error) {
      console.error("Admin role update error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

export default router;
