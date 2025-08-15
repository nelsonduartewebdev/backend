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
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
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

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    // Authenticate user
    const user = await getAuthenticatedUser(req);

    // Get user's tournament selections
    const { data: tournaments, error } = await supabase
      .from("user_tournament_selections")
      .select(
        `
        id,
        tournament_id,
        tournament_name,
        tournament_date,
        tournament_location,
        tournament_level,
        tournament_month,
        tournament_type,
        tournament_organization,
        selected_at,
        is_past,
        user_notes,
        user_result,
        is_completed,
        played_level,
        tournament_result,
        partner_name,
        position_played,
        conditions_rating,
        result_satisfaction,
        result_notes,
        created_at,
        updated_at
      `
      )
      .eq("user_id", user.id)
      .order("tournament_date", { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Transform the data to match frontend expectations
    const transformedTournaments =
      tournaments?.map((tournament) => ({
        id: tournament.tournament_id,
        name: tournament.tournament_name,
        date: tournament.tournament_date,
        location: tournament.tournament_location,
        level: tournament.tournament_level,
        month: tournament.tournament_month,
        type: tournament.tournament_type,
        organization: tournament.tournament_organization,
        selectedAt: new Date(tournament.selected_at),
        isPast: tournament.is_past,
        userResult: tournament.user_result,
        isCompleted: tournament.is_completed,
        playedLevel: tournament.played_level,
        tournamentResult: tournament.tournament_result,
        partnerName: tournament.partner_name,
        positionPlayed: tournament.position_played,
        conditionsRating: tournament.conditions_rating,
        resultSatisfaction: tournament.result_satisfaction,
        resultNotes: tournament.result_notes,
        // Calculate parsed date for calendar integration
        parsedDate: parseTournamentDate(
          tournament.tournament_date,
          tournament.tournament_month
        ),
      })) || [];

    return res.status(200).json({
      success: true,
      data: transformedTournaments,
      message: `Found ${transformedTournaments.length} tournament selections`,
    });
  } catch (error) {
    console.error("Tournament selections API error:", error);

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

/**
 * Parse tournament date string to actual Date object
 * Tournament dates can be in various formats like "15-16", "22", etc.
 * Combined with month information to create full dates
 */
function parseTournamentDate(dateStr, monthStr) {
  try {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    // Map Portuguese month names to numbers
    const monthMap = {
      JANEIRO: 0,
      FEVEREIRO: 1,
      MARÇO: 2,
      ABRIL: 3,
      MAIO: 4,
      JUNHO: 5,
      JULHO: 6,
      AGOSTO: 7,
      SETEMBRO: 8,
      OUTUBRO: 9,
      NOVEMBRO: 10,
      DEZEMBRO: 11,
    };

    const monthNumber = monthMap[monthStr.toUpperCase()];
    if (monthNumber === undefined) return null;

    // Parse the date string - handle ranges like "15-16" by taking the first date
    const dayMatch = dateStr.match(/^(\d+)/);
    if (!dayMatch) return null;

    const day = parseInt(dayMatch[1], 10);
    if (day < 1 || day > 31) return null;

    // Determine year - if month is before current month in current year, use next year
    const currentMonth = new Date().getMonth();
    const year = monthNumber <= currentMonth ? nextYear : currentYear;

    return new Date(year, monthNumber, day);
  } catch (error) {
    console.error("Error parsing tournament date:", error);
    return null;
  }
}
