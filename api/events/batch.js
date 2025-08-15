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

// Validation schemas
const EventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  notes: z.string().optional(),
  start_time: z.string().datetime("Invalid start time format"),
  end_time: z.string().datetime("Invalid end time format"),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
  category: z.string().optional(),
});

const BatchOperationSchema = z.object({
  type: z.enum(["create", "update", "delete"]),
  events: z.array(EventSchema),
  timestamp: z.string().datetime().optional(),
});

const BatchRequestSchema = z.object({
  operations: z.array(BatchOperationSchema),
});

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
    const validation = BatchRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid batch request data",
        details: validation.error.errors,
      });
    }

    const { operations } = validation.data;

    // Process operations in order
    const results = [];
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const operation of operations) {
      try {
        const result = await processBatchOperation(operation, user.id);
        results.push({
          type: operation.type,
          success: true,
          result,
          processed: result.length || 1,
        });
        totalProcessed += result.length || 1;
      } catch (error) {
        console.error(`Batch operation ${operation.type} failed:`, error);
        results.push({
          type: operation.type,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          processed: 0,
        });
        totalErrors++;
      }
    }

    // Collect all successfully processed events for response
    const allEvents = results
      .filter((r) => r.success && r.result)
      .flatMap((r) => r.result);

    return res.status(200).json({
      success: totalErrors === 0,
      data: allEvents,
      message: `Batch processing completed. ${totalProcessed} events processed.`,
      summary: {
        total_operations: operations.length,
        successful_operations: results.filter((r) => r.success).length,
        failed_operations: totalErrors,
        total_events_processed: totalProcessed,
      },
      details: results,
    });
  } catch (error) {
    console.error("Batch operation error:", error);

    const statusCode =
      error instanceof Error && error.message.includes("authorization")
        ? 401
        : 500;

    return res.status(statusCode).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to process batch operations",
    });
  }
}

// Process a single batch operation
async function processBatchOperation(operation, userId) {
  const timestamp = new Date().toISOString();

  switch (operation.type) {
    case "create":
      return await batchCreateEvents(operation.events, userId, timestamp);

    case "update":
      return await batchUpdateEvents(operation.events, userId, timestamp);

    case "delete":
      return await batchDeleteEvents(operation.events, userId);

    default:
      throw new Error(`Unsupported operation type: ${operation.type}`);
  }
}

// Batch create events
async function batchCreateEvents(events, userId, timestamp) {
  const eventsToCreate = events.map((event) => ({
    ...event,
    user_id: userId,
    created_at: timestamp,
    updated_at: timestamp,
  }));

  const { data, error } = await supabase
    .from("calendar_events")
    .insert(eventsToCreate)
    .select();

  if (error) {
    throw new Error(`Failed to create events: ${error.message}`);
  }

  return data || [];
}

// Batch update events
async function batchUpdateEvents(events, userId, timestamp) {
  const updatedEvents = [];

  // Process updates one by one to ensure proper authorization
  for (const event of events) {
    if (!event.id) {
      throw new Error("Event ID is required for updates");
    }

    // Update the event
    const { data, error } = await supabase
      .from("calendar_events")
      .update({
        ...event,
        updated_at: timestamp,
      })
      .eq("id", event.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update event ${event.id}: ${error.message}`);
    }

    if (data) {
      updatedEvents.push(data);
    }
  }

  return updatedEvents;
}

// Batch delete events
async function batchDeleteEvents(events, userId) {
  const eventIds = events.map((event) => event.id).filter((id) => id);

  if (eventIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .delete()
    .in("id", eventIds)
    .eq("user_id", userId)
    .select();

  if (error) {
    throw new Error(`Failed to delete events: ${error.message}`);
  }

  return data || [];
}
