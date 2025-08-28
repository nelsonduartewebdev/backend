import express from "express";
import {
  verifyToken,
  checkAdminStatus,
} from "../controllers/authController.js";
import {
  getUserProfileLegacy,
  updateUserProfileLegacy,
  createUserProfileLegacy,
} from "../controllers/userController.js";
import {
  authenticateToken,
  requireOwnership,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/users/:userId/profile
 * @desc    Get user profile by user ID (legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.get(
  "/:userId/profile",
  authenticateToken,
  requireOwnership("userId"),
  getUserProfileLegacy
);

/**
 * @route   POST /api/users/profile
 * @desc    Create user profile (legacy compatibility)
 * @access  Private
 */
router.post("/profile", authenticateToken, createUserProfileLegacy);

/**
 * @route   PUT /api/users/:userId/profile
 * @desc    Update user profile by user ID (legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.put(
  "/:userId/profile",
  authenticateToken,
  requireOwnership("userId"),
  updateUserProfileLegacy
);

/**
 * @route   POST /api/users/verify
 * @desc    Verify user token (legacy compatibility)
 * @access  Public (requires valid token)
 */
router.post("/verify", verifyToken);

/**
 * @route   GET /api/users/:userId/admin-status
 * @desc    Check if user has admin privileges (legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.get(
  "/:userId/admin-status",
  authenticateToken,
  requireOwnership("userId"),
  checkAdminStatus
);

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile (alternative endpoint)
 * @access  Private
 */
router.put("/me", authenticateToken, updateUserProfileLegacy);

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile (alternative endpoint)
 * @access  Private
 */
router.get("/me", authenticateToken, getUserProfileLegacy);

/**
 * @route   DELETE /api/users/:userId
 * @desc    Delete user account (placeholder for legacy compatibility)
 * @access  Private (user must own the account)
 */
router.delete(
  "/:userId",
  authenticateToken,
  requireOwnership("userId"),
  async (req, res) => {
    try {
      // Placeholder implementation
      res.json({
        success: true,
        message:
          "Account deletion requested. This feature needs to be implemented based on your requirements.",
      });
    } catch (error) {
      console.error("User deletion error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route   GET /api/users/:userId/stats
 * @desc    Get user statistics (placeholder for legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.get(
  "/:userId/stats",
  authenticateToken,
  requireOwnership("userId"),
  async (req, res) => {
    try {
      // Placeholder implementation
      res.json({
        success: true,
        data: {
          tournaments_joined: 0,
          events_created: 0,
          profile_completion: 100,
          last_activity: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("User stats error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route   GET /api/users/:userId/preferences
 * @desc    Get user preferences (placeholder for legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.get(
  "/:userId/preferences",
  authenticateToken,
  requireOwnership("userId"),
  async (req, res) => {
    try {
      // Placeholder implementation
      res.json({
        success: true,
        data: {
          notifications: true,
          email_updates: true,
          timezone: "UTC",
          language: "en",
        },
      });
    } catch (error) {
      console.error("User preferences error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route   PUT /api/users/:userId/preferences
 * @desc    Update user preferences (placeholder for legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.put(
  "/:userId/preferences",
  authenticateToken,
  requireOwnership("userId"),
  async (req, res) => {
    try {
      const preferences = req.body;

      // Placeholder implementation - you might want to store these in the profiles table
      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error("User preferences update error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route   GET /api/users/:userId/activity
 * @desc    Get user activity log (placeholder for legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.get(
  "/:userId/activity",
  authenticateToken,
  requireOwnership("userId"),
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      // Placeholder implementation
      res.json({
        success: true,
        data: {
          activities: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0,
          },
        },
      });
    } catch (error) {
      console.error("User activity error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route   POST /api/users/:userId/avatar
 * @desc    Upload user avatar (placeholder for legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.post(
  "/:userId/avatar",
  authenticateToken,
  requireOwnership("userId"),
  async (req, res) => {
    try {
      // Placeholder implementation for file upload
      res.json({
        success: true,
        avatar_url: "https://example.com/placeholder-avatar.jpg",
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route   PUT /api/users/:userId/email
 * @desc    Update user email (placeholder for legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.put(
  "/:userId/email",
  authenticateToken,
  requireOwnership("userId"),
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email is required",
        });
      }

      // Placeholder implementation
      res.json({
        success: true,
        message: "Email update requested. Verification email sent.",
      });
    } catch (error) {
      console.error("Email update error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

/**
 * @route   POST /api/users/verify-email
 * @desc    Verify email update (placeholder for legacy compatibility)
 * @access  Public
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Verification token is required",
      });
    }

    // Placeholder implementation
    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * @route   GET /api/users/:userId/export
 * @desc    Export user data (placeholder for legacy compatibility)
 * @access  Private (user must own the profile)
 */
router.get(
  "/:userId/export",
  authenticateToken,
  requireOwnership("userId"),
  async (req, res) => {
    try {
      // Placeholder implementation
      const userData = {
        user_id: req.params.userId,
        exported_at: new Date().toISOString(),
        data: "User data export feature not implemented",
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="user-data.json"'
      );
      res.json(userData);
    } catch (error) {
      console.error("Data export error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);

export default router;
