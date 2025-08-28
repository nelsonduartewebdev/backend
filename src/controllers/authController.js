import supabase from "../services/supabaseService.js";

/**
 * Verify user token and get user profile
 */
export const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No valid authorization token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching user profile:", profileError);
      return res.status(500).json({
        success: false,
        error: "Error fetching user profile",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
        profile: profile || null,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during token verification",
    });
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user profile:", error);
      return res.status(500).json({
        success: false,
        error: "Error fetching user profile",
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: "User profile not found",
      });
    }

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, avatar_url } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user profile:", error);
      return res.status(500).json({
        success: false,
        error: "Error updating user profile",
      });
    }

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

/**
 * Create user profile (typically called after successful signup)
 */
export const createUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const { name, avatar_url } = req.body;

    if (!userId || !userEmail) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const profileData = {
      id: userId,
      email: userEmail,
      name: name || userEmail.split("@")[0] || "User",
      avatar_url: avatar_url || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error } = await supabase
      .from("profiles")
      .insert([profileData])
      .select()
      .single();

    if (error) {
      console.error("Error creating user profile:", error);
      return res.status(500).json({
        success: false,
        error: "Error creating user profile",
      });
    }

    res.status(201).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Create user profile error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

/**
 * Check if user has admin privileges
 */
export const checkAdminStatus = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    // Check if user has admin role in profiles table
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error checking admin status:", error);
      return res.status(500).json({
        success: false,
        error: "Error checking admin status",
      });
    }

    const isAdmin = profile?.role === "admin";

    res.json({
      success: true,
      isAdmin,
    });
  } catch (error) {
    console.error("Check admin status error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
