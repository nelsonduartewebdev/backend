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
const EventFilterSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  search: z.string().optional(),
  categories: z.string().optional(),
  user_id: z.string().optional(),
});

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGIN || "*"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
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

  try {
    // Authenticate user
    const user = await getAuthenticatedUser(req);

    switch (req.method) {
      case "GET":
        return await handleGetEvents(req, res, user.id);
      default:
        return res.status(405).json({
          success: false,
          error: "Method not allowed",
        });
    }
  } catch (error) {
    console.error("Events API Error:", error);

    const statusCode =
      error instanceof Error && error.message.includes("authorization")
        ? 401
        : 500;

    return res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

// Handle GET requests - fetch events
async function handleGetEvents(req, res, userId) {
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

    // Build query
    let query = supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user_id || userId) // Allow admin to query other users
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
}
