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

// Validation schema for event creation
const CreateEventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
    notes: z.string().optional(),
    start_time: z.string().datetime("Invalid start time format"),
    end_time: z.string().datetime("Invalid end time format"),
    recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
    category: z.string().optional(),
  })
  .refine(
    (data) => {
      const startTime = new Date(data.start_time);
      const endTime = new Date(data.end_time);
      return endTime > startTime;
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
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    // Authenticate user
    const user = await getAuthenticatedUser(req);

    // Validate request body
    const validation = CreateEventSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid event data",
        details: validation.error.errors,
      });
    }

    const eventData = validation.data;

    // Check for conflicts (optional)
    const { data: existingEvents, error: conflictCheckError } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time")
      .eq("user_id", user.id)
      .gte("start_time", eventData.start_time)
      .lte("start_time", eventData.end_time)
      .neq("id", ""); // Ensure we're not checking against the same event

    if (conflictCheckError) {
      console.warn("Failed to check for conflicts:", conflictCheckError);
    }

    // Create the event
    const { data: newEvent, error: createError } = await supabase
      .from("calendar_events")
      .insert([
        {
          ...eventData,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create event: ${createError.message}`);
    }

    // Generate recurring events if needed
    let recurringEvents = [];
    if (eventData.recurrence !== "none") {
      recurringEvents = await generateRecurringEvents(
        newEvent,
        eventData.recurrence,
        user.id
      );
    }

    return res.status(201).json({
      success: true,
      data: newEvent,
      message: "Event created successfully",
      recurring_events_created: recurringEvents.length,
      conflicts: existingEvents?.length
        ? {
            count: existingEvents.length,
            events: existingEvents,
          }
        : null,
    });
  } catch (error) {
    console.error("Create event error:", error);

    const statusCode =
      error instanceof Error && error.message.includes("authorization")
        ? 401
        : 500;

    return res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create event",
    });
  }
}

// Generate recurring events
async function generateRecurringEvents(baseEvent, recurrence, userId) {
  const recurringEvents = [];
  const startDate = new Date(baseEvent.start_time);
  const endDate = new Date(baseEvent.end_time);
  const eventDuration = endDate.getTime() - startDate.getTime();

  // Generate up to 52 occurrences (1 year for weekly, less for daily/monthly)
  const maxOccurrences =
    recurrence === "daily" ? 30 : recurrence === "weekly" ? 52 : 12;

  for (let i = 1; i < maxOccurrences; i++) {
    const newStartDate = new Date(startDate);

    switch (recurrence) {
      case "daily":
        newStartDate.setDate(startDate.getDate() + i);
        break;
      case "weekly":
        newStartDate.setDate(startDate.getDate() + i * 7);
        break;
      case "monthly":
        newStartDate.setMonth(startDate.getMonth() + i);
        break;
    }

    const newEndDate = new Date(newStartDate.getTime() + eventDuration);

    const recurringEvent = {
      title: baseEvent.title,
      description: baseEvent.description,
      color: baseEvent.color,
      notes: baseEvent.notes,
      start_time: newStartDate.toISOString(),
      end_time: newEndDate.toISOString(),
      recurrence: "none", // Individual instances don't have recurrence
      category: baseEvent.category,
      user_id: userId,
      parent_event_id: baseEvent.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    recurringEvents.push(recurringEvent);
  }

  // Insert recurring events in batch
  if (recurringEvents.length > 0) {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(recurringEvents)
      .select();

    if (error) {
      console.error("Failed to create recurring events:", error);
      return [];
    }

    return data || [];
  }

  return [];
}
