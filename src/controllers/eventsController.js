import { EventFilterSchema } from "../schemas/eventSchemas.js";
import supabase from "../services/supabaseService.js";

// Handle GET requests - fetch events
export const getEvents = async (req, res, userId) => {
  try {
    // Validate query parameters
    const validation = EventFilterSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: validation.error.errors,
      });
    }

    const { start_date, end_date, search, categories, user_id } =
      validation.data;

    // Get authenticated user from Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return res.status(401).json({
        success: false,
        error: "Authentication failed",
        message: authError.message,
      });
    }

    // Use authenticated user's ID, fallback to query/header user_id for testing
    const queryUserId = user?.id || user_id || userId;

    // Validate that we have a valid UUID for user_id
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(queryUserId)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid user_id format. Please provide a valid UUID or authenticate properly.",
        message:
          "For testing purposes, you can provide a valid UUID in the user_id query parameter or user-id header.",
      });
    }

    // Build query
    let query = supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", queryUserId)
      .order("start_time", { ascending: true });

    // Apply date range filter
    if (start_date) {
      query = query.gte("start_time", start_date);
    }

    if (end_date) {
      query = query.lte("start_time", end_date);
    }

    // Apply search filter
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,notes.ilike.%${search}%`
      );
    }

    // Apply category filter (if implemented)
    if (categories) {
      const categoryList = categories.split(",");
      query = query.in("category", categoryList);
    }

    const { data: events, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return res.status(200).json({
      success: true,
      data: events || [],
      message: `Found ${events?.length || 0} events`,
    });
  } catch (error) {
    console.error("Get events error:", error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch events",
    });
  }
};
