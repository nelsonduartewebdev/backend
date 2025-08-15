import { createClient } from "@supabase/supabase-js";

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

// Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGIN || "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
};

// Authentication middleware
const getAuthenticatedUser = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid or expired token");
  }

  return user;
};

// Main handler
export default async function handler(req, res) {
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    // Authenticate user
    const user = await getAuthenticatedUser(req);

    // Get event ID from URL
    const eventId = req.query.id;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: "Event ID is required",
      });
    }

    // Check if event exists and belongs to user
    const { data: existingEvent, error: fetchError } = await supabase
      .from("calendar_events")
      .select("id, title, parent_event_id")
      .eq("id", eventId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found or access denied",
      });
    }

    // Check if this is part of a recurring series
    const deleteRecurring = req.query.delete_recurring === "true";
    let deletedCount = 0;

    if (deleteRecurring && existingEvent.parent_event_id) {
      // Delete all events in the recurring series
      const { error: deleteSeriesError, count } = await supabase
        .from("calendar_events")
        .delete({ count: "exact" })
        .or(
          `id.eq.${existingEvent.parent_event_id},parent_event_id.eq.${existingEvent.parent_event_id}`
        )
        .eq("user_id", user.id);

      if (deleteSeriesError) {
        throw new Error(
          `Failed to delete recurring series: ${deleteSeriesError.message}`
        );
      }

      deletedCount = count || 0;
    } else {
      // Delete only this event
      const { error: deleteError, count } = await supabase
        .from("calendar_events")
        .delete({ count: "exact" })
        .eq("id", eventId)
        .eq("user_id", user.id);

      if (deleteError) {
        throw new Error(`Failed to delete event: ${deleteError.message}`);
      }

      deletedCount = count || 0;
    }

    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Event not found or already deleted",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        deleteRecurring && deletedCount > 1
          ? `Deleted ${deletedCount} events from recurring series`
          : "Event deleted successfully",
      deleted_count: deletedCount,
    });
  } catch (error) {
    console.error("Delete event error:", error);

    const statusCode =
      error instanceof Error && error.message.includes("authorization")
        ? 401
        : 500;

    return res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete event",
    });
  }
}
