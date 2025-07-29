const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
// const TournamentScraper = require("./scraping/tournament-scraper"); // Disabled for now

// Load environment variables
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Get CORS origins from environment variables
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:4200", "http://localhost:3000"];

// Middleware
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Create scraper instance - DISABLED FOR NOW
// const scraper = new TournamentScraper();

// Create data directory for storing tournament files
const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions for file-based storage
function getCountryFileName(country) {
  return path.join(
    DATA_DIR,
    `${country.toLowerCase().replace(/\s+/g, "-")}.json`
  );
}

function loadTournamentsFromFile(country) {
  try {
    const filePath = getCountryFileName(country);

    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(data);

      let tournaments = [];

      if (Array.isArray(parsed)) {
        // Portugal format: Convert to FederationTournament format for admin interface

        tournaments = parsed.map((tournament, index) => ({
          id: `portugal-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          name: tournament.name || "Unnamed Tournament",
          federation: tournament.type === "FIP" ? "FIP" : "OTHER",
          level: tournament.level || "TBD",
          location: tournament.location || "TBD",
          country: country,
          startDate: tournament.startDate
            ? new Date(tournament.startDate)
            : new Date(),
          endDate: tournament.startDate
            ? new Date(tournament.startDate)
            : new Date(),
          status: "upcoming",
          prizeMoney: tournament.prize || "TBD",
          currency: "EUR",
          venue: tournament.partnership || tournament.location || "TBD",
          surfaces: "TBD",
          categories: tournament.division
            ? tournament.division.split("/")
            : ["Men", "Women"],
          sourceUrl: "portugal-format",
          lastUpdated: new Date(),
          isOfficial: tournament.fip || false,
        }));
      } else if (parsed.tournaments && Array.isArray(parsed.tournaments)) {
        // FederationTournament format: Use directly

        tournaments = parsed.tournaments;
      }

      return tournaments;
    } else {
      return [];
    }
  } catch (error) {
    console.error(
      `📁 Error loading tournaments for ${country}:`,
      error.message
    );
    return [];
  }
}

function saveTournamentsToFile(country, tournaments) {
  try {
    const filePath = getCountryFileName(country);

    // Convert FederationTournament format to Portugal format if needed
    const portugalFormatTournaments = tournaments.map((tournament) => {
      // If it's already in Portugal format, return as-is
      if (tournament.month && tournament.date && !tournament.federation) {
        return tournament;
      }

      // Convert from FederationTournament to Portugal format
      const startDate = new Date(tournament.startDate);
      const monthNames = [
        "JANEIRO",
        "FEVEREIRO",
        "MARÇO",
        "ABRIL",
        "MAIO",
        "JUNHO",
        "JULHO",
        "AGOSTO",
        "SETEMBRO",
        "OUTUBRO",
        "NOVEMBRO",
        "DEZEMBRO",
      ];

      return {
        month: monthNames[startDate.getMonth()] || "TBD",
        date: tournament.startDate
          ? startDate.toLocaleDateString("pt-PT")
          : "TBD",
        type: tournament.federation || "OTHER",
        division: tournament.categories
          ? tournament.categories.join("/")
          : "TBD",
        name: tournament.name,
        level: tournament.level || "TBD",
        class: tournament.level || "TBD",
        prize:
          tournament.prizeMoney && tournament.prizeMoney !== "TBD"
            ? `${tournament.prizeMoney} ${tournament.currency || "EUR"}`
            : "",
        location: tournament.location || "TBD",
        partnership: tournament.venue || "",
        organization: tournament.federation || "OTHER",
        fip: tournament.federation === "FIP",
        startDate: startDate,
        selected: false,
      };
    });

    // Save as direct array (Portugal format)
    fs.writeFileSync(
      filePath,
      JSON.stringify(portugalFormatTournaments, null, 2)
    );

    return true;
  } catch (error) {
    console.error(`📁 Error saving tournaments for ${country}:`, error.message);
    return false;
  }
}

function getAllCountriesWithTournaments() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const countries = files
      .filter((file) => file.endsWith("-calendar.json"))
      .map((file) => {
        const countrySlug = file.replace("-calendar.json", "");
        return countrySlug
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      });
    return countries;
  } catch (error) {
    console.error("📁 Error getting countries:", error.message);
    return [];
  }
}

// Health check endpoint
app.get("/api/health", (req, res) => {
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
});

app.get("/api/tournaments/international-fips", async (req, res) => {
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
      tournaments: internationalFips.map((tournament) => ({
        ...tournament,
        month: MONTHS_ENG_TO_PT[tournament.month],
      })),
    });
  } catch (err) {
    console.error("Error fetching international FIPs:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ===== SCRAPING ENDPOINTS - DISABLED FOR NOW =====
/*
// Test scraper functionality
app.post("/api/scrape/test", async (req, res) => {
  // Scraping disabled - return fallback data
  res.json({
    success: false,
    message: "Scraping temporarily disabled",
    tournaments: [],
    count: 0,
  });
});

// Get fallback tournament data
app.get("/api/scrape/fallback", (req, res) => {
  // Return basic fallback data
  const fallbackTournaments = createFallbackTournaments();
  res.json({
    success: true,
    source: "Fallback Data",
    url: "internal://fallback",
    tournaments: fallbackTournaments,
    count: fallbackTournaments.length,
    message: "Using fallback data - scraping disabled",
  });
});

// All other scraping endpoints disabled
app.post("/api/scrape/*", (req, res) => {
  res.json({
    success: false,
    message: "Scraping functionality temporarily disabled",
    tournaments: [],
    count: 0,
  });
});
*/

// Simple fallback data creation function
function createFallbackTournaments() {
  return [
    {
      id: "fallback-madrid-2025",
      name: "Madrid Premier Padel P1 (Demo)",
      federation: "FIP",
      level: "Premier Padel P1",
      location: "Madrid",
      country: "Spain",
      startDate: new Date("2025-05-15"),
      endDate: new Date("2025-05-22"),
      status: "upcoming",
      prizeMoney: "€470,000",
      currency: "EUR",
      venue: "WiZink Center",
      surfaces: "Indoor",
      categories: ["Men", "Women"],
      sourceUrl: "demo-data",
      lastUpdated: new Date(),
      isOfficial: true,
    },
    {
      id: "fallback-london-2025",
      name: "London Padel Open (Demo)",
      federation: "LTA",
      level: "National Championship",
      location: "London",
      country: "United Kingdom",
      startDate: new Date("2025-04-10"),
      endDate: new Date("2025-04-13"),
      status: "upcoming",
      prizeMoney: "£15,000",
      currency: "GBP",
      venue: "David Lloyd Clubs",
      surfaces: "Indoor",
      categories: ["Men", "Women", "Mixed"],
      sourceUrl: "demo-data",
      lastUpdated: new Date(),
      isOfficial: true,
    },
  ];
}

// ===== ADMIN VALIDATION ENDPOINTS =====

// Admin configuration from environment variables
function getAdminConfig() {
  return {
    secretCodes: process.env.ADMIN_SECRET_CODES
      ? process.env.ADMIN_SECRET_CODES.split(",").map((code) => code.trim())
      : [
          "secretCodeAdmin2025",
          "1721",
          "NELSON_SECRET_KEY",
          "TOURNAMENT_MASTER",
        ],
    authorizedEmails: process.env.ADMIN_EMAILS
      ? process.env.ADMIN_EMAILS.split(",").map((email) =>
          email.trim().toLowerCase()
        )
      : ["nelson.a.duarte@hotmail.com", "admin@padelcalendar.com"],
  };
}

// Validate admin credentials
app.post("/api/admin/validate", (req, res) => {
  try {
    const { email, secretCode } = req.body;

    if (!email || !secretCode) {
      return res.status(400).json({
        success: false,
        isAdmin: false,
        error: "Email and secret code are required",
      });
    }

    const adminConfig = getAdminConfig();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email is authorized
    const isAuthorizedEmail =
      adminConfig.authorizedEmails.includes(normalizedEmail);

    // Check if secret code is valid
    const isValidSecretCode = adminConfig.secretCodes.includes(
      secretCode.trim()
    );

    const isAdmin = isAuthorizedEmail && isValidSecretCode;

    res.json({
      success: true,
      isAdmin: isAdmin,
      email: normalizedEmail,
      message: isAdmin ? "Admin access granted" : "Invalid credentials",
    });
  } catch (error) {
    console.error("📡 API: Admin validation error:", error.message);
    res.status(500).json({
      success: false,
      isAdmin: false,
      error: "Server error during admin validation",
    });
  }
});

// Check admin status by email only (for UI purposes)
app.post("/api/admin/check", (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        isAuthorizedEmail: false,
        error: "Email is required",
      });
    }

    const adminConfig = getAdminConfig();
    const normalizedEmail = email.trim().toLowerCase();
    const isAuthorizedEmail =
      adminConfig.authorizedEmails.includes(normalizedEmail);

    res.json({
      success: true,
      isAuthorizedEmail: isAuthorizedEmail,
      email: normalizedEmail,
      message: isAuthorizedEmail
        ? "Email is authorized for admin access"
        : "Email is not authorized for admin access",
    });
  } catch (error) {
    console.error("📡 API: Admin email check error:", error.message);
    res.status(500).json({
      success: false,
      isAuthorizedEmail: false,
      error: "Server error during email check",
    });
  }
});

// ===== MANUAL TOURNAMENT MANAGEMENT =====

// Get manual tournaments for a country
app.get("/api/tournaments/manual/:country", (req, res) => {
  try {
    const { country } = req.params;

    const tournaments = loadTournamentsFromFile(country);

    res.json({
      success: true,
      tournaments: tournaments,
      count: tournaments.length,
      country: country,
    });
  } catch (error) {
    console.error("📡 API: Error getting manual tournaments:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      tournaments: [],
      count: 0,
    });
  }
});

// Add a single manual tournament
app.post("/api/tournaments/manual", (req, res) => {
  try {
    const { tournament, country } = req.body;

    if (!tournament || !country) {
      return res.status(400).json({
        success: false,
        error: "Tournament data and country are required",
      });
    }

    if (!tournament.name || tournament.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Tournament name is required",
      });
    }

    // Ensure missing fields are set to TBD
    const processedTournament = {
      ...tournament,
      level: tournament.level || "TBD",
      location: tournament.location || "TBD",
      venue: tournament.venue || tournament.location || "TBD",
      prizeMoney: tournament.prizeMoney || "TBD",
      surfaces: tournament.surfaces || "TBD",
      startDate: tournament.startDate
        ? new Date(tournament.startDate)
        : new Date(),
      endDate: tournament.endDate
        ? new Date(tournament.endDate)
        : tournament.startDate
        ? new Date(tournament.startDate)
        : new Date(),
      status:
        tournament.startDate && new Date(tournament.startDate) > new Date()
          ? "upcoming"
          : "upcoming",
      categories: tournament.categories || ["Men", "Women"],
      currency:
        tournament.currency || (country === "United Kingdom" ? "GBP" : "EUR"),
      sourceUrl: "manual-entry",
      lastUpdated: new Date(),
      isOfficial: false,
    };

    // Get existing tournaments for country
    const existingTournaments = loadTournamentsFromFile(country);

    // Add new tournament
    existingTournaments.push(processedTournament);
    saveTournamentsToFile(country, existingTournaments);

    res.json({
      success: true,
      tournament: processedTournament,
      country: country,
      message: `Tournament added successfully to ${country}`,
    });
  } catch (error) {
    console.error("📡 API: Error adding manual tournament:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Bulk add manual tournaments
app.post("/api/tournaments/manual/bulk", (req, res) => {
  try {
    const { tournaments, country } = req.body;

    if (!tournaments || !Array.isArray(tournaments) || !country) {
      return res.status(400).json({
        success: false,
        error: "Tournaments array and country are required",
      });
    }

    // Process each tournament to ensure missing fields are set to TBD
    const processedTournaments = tournaments.map((tournament, index) => {
      if (!tournament.name || tournament.name.trim().length === 0) {
        throw new Error(`Tournament ${index + 1}: Name is required`);
      }

      return {
        ...tournament,
        id:
          tournament.id ||
          `manual-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
        level: tournament.level || "TBD",
        location: tournament.location || "TBD",
        venue: tournament.venue || tournament.location || "TBD",
        prizeMoney: tournament.prizeMoney || "TBD",
        surfaces: tournament.surfaces || "TBD",
        startDate: tournament.startDate
          ? new Date(tournament.startDate)
          : new Date(),
        endDate: tournament.endDate
          ? new Date(tournament.endDate)
          : tournament.startDate
          ? new Date(tournament.startDate)
          : new Date(),
        status:
          tournament.startDate && new Date(tournament.startDate) > new Date()
            ? "upcoming"
            : "upcoming",
        categories: tournament.categories || ["Men", "Women"],
        currency:
          tournament.currency || (country === "United Kingdom" ? "GBP" : "EUR"),
        country: country,
        federation: tournament.federation || "OTHER",
        sourceUrl: "manual-entry",
        lastUpdated: new Date(),
        isOfficial: false,
      };
    });

    // Get existing tournaments for country
    const existingTournaments = loadTournamentsFromFile(country);

    // Add new tournaments
    existingTournaments.push(...processedTournaments);
    saveTournamentsToFile(country, existingTournaments);

    res.json({
      success: true,
      tournaments: processedTournaments,
      count: processedTournaments.length,
      country: country,
      totalTournaments: existingTournaments.length,
      message: `Successfully added ${processedTournaments.length} tournaments to ${country}`,
    });
  } catch (error) {
    console.error("📡 API: Error bulk adding tournaments:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete a manual tournament
app.delete("/api/tournaments/manual/:tournamentId", (req, res) => {
  try {
    const { tournamentId } = req.params;

    let found = false;
    let deletedFrom = "";

    // Search through all countries
    for (const country of getAllCountriesWithTournaments()) {
      const initialLength = loadTournamentsFromFile(country).length;
      const filteredTournaments = loadTournamentsFromFile(country).filter(
        (t) => t.id !== tournamentId
      );

      if (filteredTournaments.length < initialLength) {
        saveTournamentsToFile(country, filteredTournaments);
        found = true;
        deletedFrom = country;
        break;
      }
    }

    if (found) {
      res.json({
        success: true,
        message: `Tournament deleted from ${deletedFrom}`,
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Tournament not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all manual tournaments (all countries)
app.get("/api/tournaments/manual", (req, res) => {
  try {
    const allTournaments = [];
    const countryCounts = {};

    for (const country of getAllCountriesWithTournaments()) {
      const tournaments = loadTournamentsFromFile(country);
      allTournaments.push(...tournaments);
      countryCounts[country] = tournaments.length;
    }

    res.json({
      success: true,
      tournaments: allTournaments,
      count: allTournaments.length,
      countries: getAllCountriesWithTournaments(),
      countryCounts: countryCounts,
    });
  } catch (error) {
    console.error("📡 API: Error getting all tournaments:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      tournaments: [],
      count: 0,
    });
  }
});

// Get tournament file information for all countries
app.get("/api/tournaments/files", (req, res) => {
  try {
    const countries = getAllCountriesWithTournaments();
    const fileInfo = countries.map((country) => {
      const filePath = getCountryFileName(country);
      const tournaments = loadTournamentsFromFile(country);

      let fileStats = null;
      try {
        const stats = fs.statSync(filePath);
        fileStats = {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      } catch (error) {
        console.error(
          `Error getting file stats for ${country}:`,
          error.message
        );
      }

      return {
        country: country,
        fileName: path.basename(filePath),
        filePath: filePath,
        tournamentCount: tournaments.length,
        fileStats: fileStats,
        lastTournamentAdded:
          tournaments.length > 0
            ? Math.max(
                ...tournaments.map((t) =>
                  new Date(t.lastUpdated || t.startDate).getTime()
                )
              )
            : null,
      };
    });

    res.json({
      success: true,
      totalFiles: fileInfo.length,
      totalTournaments: fileInfo.reduce(
        (sum, info) => sum + info.tournamentCount,
        0
      ),
      files: fileInfo,
    });
  } catch (error) {
    console.error("📡 API: Error getting file information:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Clear all tournaments for a country
app.delete("/api/tournaments/manual/country/:country", (req, res) => {
  try {
    const { country } = req.params;

    const existingCount = loadTournamentsFromFile(country).length;
    saveTournamentsToFile(country, []);

    res.json({
      success: true,
      message: `Cleared ${existingCount} tournaments from ${country}`,
      clearedCount: existingCount,
    });
  } catch (error) {
    console.error("📡 API: Error clearing tournaments:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get tournament data formatted for tournaments table
app.get("/api/tournaments/data/:country", (req, res) => {
  try {
    const { country } = req.params;

    const filePath = getCountryFileName(country);

    if (!fs.existsSync(filePath)) {
      return res.json([]);
    }

    const data = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(data);

    let tournaments = [];

    // Detect data format and handle accordingly
    if (Array.isArray(parsed)) {
      // Portugal format: Direct array of tournament objects

      tournaments = parsed;
    } else if (parsed.tournaments && Array.isArray(parsed.tournaments)) {
      // Spain format: FederationTournament format with metadata wrapper

      tournaments = parsed.tournaments.map((tournament) => {
        const startDate = new Date(tournament.startDate);
        const monthNames = [
          "JANEIRO",
          "FEVEREIRO",
          "MARÇO",
          "ABRIL",
          "MAIO",
          "JUNHO",
          "JULHO",
          "AGOSTO",
          "SETEMBRO",
          "OUTUBRO",
          "NOVEMBRO",
          "DEZEMBRO",
        ];

        return {
          month: monthNames[startDate.getMonth()] || "TBD",
          date: tournament.startDate
            ? startDate.toLocaleDateString("pt-PT")
            : "TBD",
          type: tournament.federation || "OTHER",
          division: tournament.categories
            ? tournament.categories.join("/")
            : "TBD",
          name: tournament.name,
          level: tournament.level || "TBD",
          class: tournament.level || "TBD",
          prize:
            tournament.prizeMoney && tournament.prizeMoney !== "TBD"
              ? `${tournament.prizeMoney} ${tournament.currency || "EUR"}`
              : "",
          location: tournament.location || "TBD",
          partnership: tournament.venue || "",
          organization: tournament.federation || "OTHER",
          fip: tournament.federation === "FIP",
          startDate: startDate,
          selected: false,
        };
      });
    } else {
      return res.json([]);
    }

    // Ensure all tournaments have the required properties for the table
    const formattedTournaments = tournaments.map((tournament) => ({
      month: tournament.month || "TBD",
      date: tournament.date || "TBD",
      type: tournament.type || "OTHER",
      division: tournament.division || "TBD",
      name: tournament.name || "Unnamed Tournament",
      level: tournament.level || "TBD",
      class: tournament.class || "TBD",
      prize: tournament.prize || "",
      location: tournament.location || "TBD",
      partnership: tournament.partnership || "",
      organization: tournament.organization || "OTHER",
      fip: tournament.fip || false,
      startDate: tournament.startDate
        ? new Date(tournament.startDate)
        : new Date(),
      selected: false,
    }));

    res.json(formattedTournaments);
  } catch (error) {
    console.error("📡 API: Error getting tournament data:", error.message);
    res.status(500).json([]);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("📡 API Error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: error.message,
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Tournament Management API running on port ${PORT}`);
  console.log(`📡 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/scrape/fallback (demo data)`);
  console.log(`🔐 Admin endpoints:`);
  console.log(`   POST /api/admin/validate`);
  console.log(`   POST /api/admin/check`);
  console.log(`🏆 Manual tournament endpoints:`);
  console.log(`   GET  /api/tournaments/manual/:country`);
  console.log(`   POST /api/tournaments/manual`);
  console.log(`   POST /api/tournaments/manual/bulk`);
  console.log(`   GET  /api/tournaments/manual`);
  console.log(`   DELETE /api/tournaments/manual/:tournamentId`);
  console.log(`   DELETE /api/tournaments/manual/country/:country`);
  console.log(`   GET  /api/tournaments/files`);
  console.log(`   GET  /api/tournaments/data/:country`);
  console.log(`🌐 CORS enabled for: ${corsOrigins.join(", ")}`);
  console.log(
    `⚡ Simplified backend - scraping disabled for faster deployment`
  );
  console.log(`🔒 Admin credentials secured on backend`);
});

module.exports = app;
