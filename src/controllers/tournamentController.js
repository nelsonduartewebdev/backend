import fileStorageService from "../services/fileStorageService.js";
import supabaseService from "../services/supabaseService.js";

const getApiStatus = async (req, res) => {
  try {
    // Test Supabase connection by making a simple query
    const { data, error } = await supabaseService
      .from("international_fip_tournaments")
      .select("count")
      .limit(1);

    if (error) {
      return res.status(500).json({
        status: "Error",
        message: "Database connection error",
        error: error.message,
      });
    }

    res.json({
      status: "OK",
      message: "Tournament management API is running",
      features: [
        "Manual tournament management",
        "File-based storage",
        "CORS enabled",
        "Supabase integration",
      ],
      dbStatus: "Connected",
      version: "1.0.0",
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Failed to check API status",
      error: error.message,
    });
  }
};

// load legacy tournaments from files not supabase
const getTournamentsFromFiles = async (req, res) => {
  try {
    const { country } = req.params;
    const tournaments = fileStorageService.loadTournamentsFromFile(country);
    res.json(tournaments);
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
};

// load international fip tournaments from supabase
const getInternationalFipTournaments = async (req, res) => {
  try {
    const { data: internationalFips, error } = await supabase
      .from("international_fip_tournaments")
      .select("*");

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    res.json({
      success: true,
      tournaments: internationalFips,
    });
  } catch (err) {
    console.error("Error fetching international FIPs:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export default {
  getApiStatus,
  getTournamentsFromFiles,
  getInternationalFipTournaments,
};
