import supabase from "../services/supabaseService.js";

/**
 * Get user profile in legacy format
 */
export const getUserProfileLegacy = async (req, res) => {
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

    // Transform to legacy UserProfile format
    const legacyProfile = {
      id: profile.id,
      email: profile.email,
      email_confirmed_at: req.user.email_confirmed_at,
      name: profile.name || "",
      country: profile.country || "",
      age: profile.age || null,
      position: profile.position || "",
      avatar_url: profile.avatar_url || "",
      timezone: profile.timezone || "UTC",
      plan_type: profile.plan_type || "free",
      plan_start_date: profile.plan_start_date || null,
      plan_end_date: profile.plan_end_date || null,
      trial_end_date: profile.trial_end_date || null,
      is_active: profile.is_active !== false,
      stripe_customer_id: profile.stripe_customer_id || "",
      stripe_subscription_id: profile.stripe_subscription_id || "",
      last_payment_date: profile.last_payment_date || null,
      next_payment_due: profile.next_payment_due || null,
      payment_status: profile.payment_status || "pending",
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    res.json({
      success: true,
      data: legacyProfile,
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
 * Update user profile in legacy format
 */
export const updateUserProfileLegacy = async (req, res) => {
  try {
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    // Prepare update data with timestamp
    const profileUpdateData = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    // Remove any fields that shouldn't be updated directly
    delete profileUpdateData.id;
    delete profileUpdateData.created_at;

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(profileUpdateData)
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

    // Transform to legacy UserProfile format
    const legacyProfile = {
      id: profile.id,
      email: profile.email,
      email_confirmed_at: req.user.email_confirmed_at,
      name: profile.name || "",
      country: profile.country || "",
      age: profile.age || null,
      position: profile.position || "",
      avatar_url: profile.avatar_url || "",
      timezone: profile.timezone || "UTC",
      plan_type: profile.plan_type || "free",
      plan_start_date: profile.plan_start_date || null,
      plan_end_date: profile.plan_end_date || null,
      trial_end_date: profile.trial_end_date || null,
      is_active: profile.is_active !== false,
      stripe_customer_id: profile.stripe_customer_id || "",
      stripe_subscription_id: profile.stripe_subscription_id || "",
      last_payment_date: profile.last_payment_date || null,
      next_payment_due: profile.next_payment_due || null,
      payment_status: profile.payment_status || "pending",
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    res.json({
      success: true,
      data: legacyProfile,
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
 * Create user profile in legacy format
 */
export const createUserProfileLegacy = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const profileData = req.body;

    if (!userId || !userEmail) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const newProfileData = {
      id: userId,
      email: userEmail,
      name: profileData.name || userEmail.split("@")[0] || "User",
      avatar_url: profileData.avatar_url || "",
      country: profileData.country || "",
      age: profileData.age || null,
      position: profileData.position || "",
      timezone: profileData.timezone || "UTC",
      plan_type: profileData.plan_type || "free",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error } = await supabase
      .from("profiles")
      .insert([newProfileData])
      .select()
      .single();

    if (error) {
      console.error("Error creating user profile:", error);
      return res.status(500).json({
        success: false,
        error: "Error creating user profile",
      });
    }

    // Transform to legacy UserProfile format
    const legacyProfile = {
      id: profile.id,
      email: profile.email,
      email_confirmed_at: req.user.email_confirmed_at,
      name: profile.name || "",
      country: profile.country || "",
      age: profile.age || null,
      position: profile.position || "",
      avatar_url: profile.avatar_url || "",
      timezone: profile.timezone || "UTC",
      plan_type: profile.plan_type || "free",
      plan_start_date: profile.plan_start_date || null,
      plan_end_date: profile.plan_end_date || null,
      trial_end_date: profile.trial_end_date || null,
      is_active: profile.is_active !== false,
      stripe_customer_id: profile.stripe_customer_id || "",
      stripe_subscription_id: profile.stripe_subscription_id || "",
      last_payment_date: profile.last_payment_date || null,
      next_payment_due: profile.next_payment_due || null,
      payment_status: profile.payment_status || "pending",
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    res.status(201).json({
      success: true,
      data: legacyProfile,
    });
  } catch (error) {
    console.error("Create user profile error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
