import supabase from "./supabaseService.js";

/**
 * Verify JWT token with Supabase
 * @param {string} token - JWT token from Authorization header
 * @returns {Promise<{user: object | null, error: object | null}>}
 */
export const verifyAuthToken = async (token) => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      return { user: null, error };
    }

    return { user, error: null };
  } catch (error) {
    console.error("Token verification error:", error);
    return { user: null, error: { message: "Token verification failed" } };
  }
};

/**
 * Get user profile from database
 * @param {string} userId - User ID
 * @returns {Promise<{profile: object | null, error: object | null}>}
 */
export const getUserProfile = async (userId) => {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      return { profile: null, error };
    }

    return { profile, error: null };
  } catch (error) {
    console.error("Get user profile error:", error);
    return {
      profile: null,
      error: { message: "Failed to fetch user profile" },
    };
  }
};

/**
 * Create user profile
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {object} profileData - Additional profile data
 * @returns {Promise<{profile: object | null, error: object | null}>}
 */
export const createUserProfile = async (userId, email, profileData = {}) => {
  try {
    const defaultProfileData = {
      id: userId,
      email,
      name: profileData.name || email.split("@")[0] || "User",
      avatar_url: profileData.avatar_url || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...profileData,
    };

    const { data: profile, error } = await supabase
      .from("profiles")
      .insert([defaultProfileData])
      .select()
      .single();

    if (error) {
      return { profile: null, error };
    }

    return { profile, error: null };
  } catch (error) {
    console.error("Create user profile error:", error);
    return {
      profile: null,
      error: { message: "Failed to create user profile" },
    };
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {object} updateData - Data to update
 * @returns {Promise<{profile: object | null, error: object | null}>}
 */
export const updateUserProfile = async (userId, updateData) => {
  try {
    const dataToUpdate = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(dataToUpdate)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return { profile: null, error };
    }

    return { profile, error: null };
  } catch (error) {
    console.error("Update user profile error:", error);
    return {
      profile: null,
      error: { message: "Failed to update user profile" },
    };
  }
};

/**
 * Check if user has admin privileges
 * @param {string} userId - User ID
 * @returns {Promise<{isAdmin: boolean, error: object | null}>}
 */
export const checkUserAdminStatus = async (userId) => {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      return { isAdmin: false, error };
    }

    const isAdmin = profile?.role === "admin";
    return { isAdmin, error: null };
  } catch (error) {
    console.error("Check admin status error:", error);
    return {
      isAdmin: false,
      error: { message: "Failed to check admin status" },
    };
  }
};

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<{profile: object | null, error: object | null}>}
 */
export const getUserByEmail = async (email) => {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") {
      return { profile: null, error };
    }

    return { profile, error: null };
  } catch (error) {
    console.error("Get user by email error:", error);
    return {
      profile: null,
      error: { message: "Failed to fetch user by email" },
    };
  }
};

/**
 * Validate if user exists and is confirmed
 * @param {string} userId - User ID
 * @returns {Promise<{isValid: boolean, user: object | null, error: object | null}>}
 */
export const validateUser = async (userId) => {
  try {
    // First check if user exists in Supabase auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.admin.getUserById(userId);

    if (authError || !user) {
      return {
        isValid: false,
        user: null,
        error: authError || { message: "User not found" },
      };
    }

    // Check if email is confirmed
    const isEmailConfirmed = !!(user.email_confirmed_at || user.confirmed_at);

    if (!isEmailConfirmed) {
      return {
        isValid: false,
        user,
        error: { message: "Email not confirmed" },
      };
    }

    return { isValid: true, user, error: null };
  } catch (error) {
    console.error("Validate user error:", error);
    return {
      isValid: false,
      user: null,
      error: { message: "User validation failed" },
    };
  }
};
