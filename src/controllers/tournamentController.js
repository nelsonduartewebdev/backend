import {
  fetchFipTournaments,
  fetchNationalTournaments,
  fetchUserTournamentSelections,
} from "../services/tournamentService.js";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MONTHS_ENG_TO_PT = {
  JANUARY: "JANEIRO",
  FEBRUARY: "FEVEREIRO",
  MARCH: "MARÇO",
  APRIL: "ABRIL",
  MAY: "MAIO",
  JUNE: "JUNHO",
  JULY: "JULHO",
  AUGUST: "AGOSTO",
  SEPTEMBER: "SETEMBRO",
  OCTOBER: "OUTUBRO",
  NOVEMBER: "NOVEMBRO",
  DECEMBER: "DEZEMBRO",
};

export const getApiStatus = async (req, res) => {
  res.json({
    status: "OK",
    message: "MOCK - Tournament management API is running",
    features: [
      "Manual tournament management",
      "File-based storage",
      "CORS enabled",
    ],
    version: "1.0.0",
  });
};

export const getTournamentsFromFiles = async (req, res, tournamentCountry) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: no token provided" });
  }

  // Extract token from 'Bearer token...' format
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  const supabaseWithAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  try {
    const tournaments = await fetchNationalTournaments(
      tournamentCountry,
      supabaseWithAuth
    );
    res.status(200).json({
      success: true,
      message: "Tournaments fetched successfully",
      tournaments: tournaments,
    });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
};

export const getInternationalFipTournaments = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: no token provided" });
  }

  // Extract token from 'Bearer token...' format
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  const supabaseWithAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  try {
    const tournaments = await fetchFipTournaments(supabaseWithAuth);
    res.status(200).json({
      success: true,
      message: "FIPs fetched successfully",
      tournaments: tournaments.map((tournament) => ({
        ...tournament,
        month: MONTHS_ENG_TO_PT[tournament.month.toUpperCase()],
        level: tournament.class.toUpperCase(),
        class: tournament.class.toUpperCase(),
      })),
    });
  } catch (err) {
    console.error("Error fetching international FIPs:", err);
    res.status(500).json({
      error: `Failed to fetch international FIPs: ${err.message}`,
      message: "Please try again later",
    });
  }
};

export const getUserTournamentSelections = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized: no token provided" });
  }

  // Extract token from 'Bearer token...' format
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : authHeader;

  const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Get user from token
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const tournaments = await fetchUserTournamentSelections(
      supabaseClient,
      user.id
    );
    res.status(200).json({
      success: true,
      message: "User tournament selections fetched successfully",
      tournaments: tournaments,
    });
  } catch (err) {
    console.error("Error fetching user tournament selections:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch user tournament selections" });
  }
};

// Shared tournament endpoints for URL shortening
export const createSharedTournament = async (req, res) => {
  try {
    const { tournaments } = req.body;

    if (!tournaments || !Array.isArray(tournaments)) {
      return res.status(400).json({
        error: "Invalid request: tournaments array is required",
      });
    }

    // Generate a short hash for the shared data
    const shareId = crypto.randomBytes(8).toString("hex");

    // Create Supabase client
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Store the shared tournament data in Supabase
    const { data, error } = await supabaseClient
      .from("shared_tournaments")
      .insert([
        {
          share_id: shareId,
          tournament_data: tournaments,
          created_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(), // 30 days
        },
      ])
      .select();

    if (error) {
      console.error("Error storing shared tournament:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return res.status(500).json({
        error: "Failed to create shared tournament",
        details: error.message || "Database error",
      });
    }

    // Return the short URL
    res.status(201).json({
      success: true,
      shareId: shareId,
      shortUrl: `${req.protocol}://${req.get("host")}/tournaments?s=${shareId}`,
      expiresAt: data[0].expires_at,
    });
  } catch (error) {
    console.error("Error creating shared tournament:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSharedTournament = async (req, res) => {
  try {
    const { shareId } = req.params;

    if (!shareId) {
      return res.status(400).json({ error: "Share ID is required" });
    }

    // Create Supabase client
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Retrieve the shared tournament data
    const { data, error } = await supabaseClient
      .from("shared_tournaments")
      .select("*")
      .eq("share_id", shareId)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      console.error("Error retrieving shared tournament:", error);
      return res.status(404).json({
        error: "Shared tournament not found or expired",
        details: error?.message || "Not found",
      });
    }

    res.status(200).json({
      success: true,
      tournaments: data.tournament_data,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    console.error("Error retrieving shared tournament:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export default {
  getApiStatus,
  getTournamentsFromFiles,
  getInternationalFipTournaments,
  getUserTournamentSelections,
  createSharedTournament,
  getSharedTournament,
};
