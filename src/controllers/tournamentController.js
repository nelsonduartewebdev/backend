import {
  fetchFipTournaments,
  fetchNationalTournaments,
  fetchUserTournamentSelections,
} from "../services/tournamentService.js";
import { createClient } from "@supabase/supabase-js";

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

export default {
  getApiStatus,
  getTournamentsFromFiles,
  getInternationalFipTournaments,
  getUserTournamentSelections,
};
