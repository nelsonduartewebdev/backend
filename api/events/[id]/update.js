import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

// Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Validation schema for event updates
const UpdateEventSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200, "Title too long")
      .optional(),
    description: z.string().optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
      .optional(),
    notes: z.string().optional(),
    start_time: z.string().datetime("Invalid start time format").optional(),
    end_time: z.string().datetime("Invalid end time format").optional(),
    recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
    category: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        const startTime = new Date(data.start_time);
        const endTime = new Date(data.end_time);
        return endTime > startTime;
      }
      return true;
    },
    {
      message: "End time must be after start time",
      path: ["end_time"],
    }
  );

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGIN || "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
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

  if (req.method !== "PUT") {
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

    // Validate request body
    const validation = UpdateEventSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid event data",
        details: validation.error.errors,
      });
    }

    const updateData = validation.data;

    // Check if event exists and belongs to user
    const { data: existingEvent, error: fetchError } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("id", eventId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingEvent) {
      return res.status(404).json({
        success: false,
        error: "Event not found or access denied",
      });
    }

    // If changing times, validate against existing events
    if (updateData.start_time || updateData.end_time) {
      const startTime = updateData.start_time || existingEvent.start_time;
      const endTime = updateData.end_time || existingEvent.end_time;

      const { data: conflictingEvents, error: conflictError } = await supabase
        .from("calendar_events")
        .select("id, title, start_time, end_time")
        .eq("user_id", user.id)
        .neq("id", eventId)
        .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

      if (conflictError) {
        console.warn("Failed to check for conflicts:", conflictError);
      }
    }

    // Update the event
    const { data: updatedEvent, error: updateError } = await supabase
      .from("calendar_events")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update event: ${updateError.message}`);
    }

    return res.status(200).json({
      success: true,
      data: updatedEvent,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Update event error:", error);

    const statusCode =
      error instanceof Error && error.message.includes("authorization")
        ? 401
        : 500;

    return res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update event",
    });
  }
}
