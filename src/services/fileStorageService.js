import fs from "fs";
import path from "path";

const DATA_DIR = path.join(import.meta.dirname, "..", "..", "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
        tournaments = parsed.map((tournament, index) => ({
          id: `${country}-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          name: tournament.name || "Unnamed Tournament",
          federation: tournament.type === "FIP" ? "FIP" : "OTHER",
          month: tournament.month || "-",
          date: tournament.date,
          type: tournament.type || "-",
          division: tournament.division || "-",
          level: tournament.level || "-",
          class: tournament.class || "-",
          prize: tournament.prize || "-",
          location: tournament.location || "-",
          partnership: tournament.partnership || "-",
          organization: tournament.organization || "-",
          country: country,
          prizeMoney: tournament.prize || "-",
        }));
      } else if (parsed.tournaments && Array.isArray(parsed.tournaments)) {
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

/* function getAllCountriesWithTournaments() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const countries = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const countrySlug = file.replace(".json", "");
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
} */

export default {
  loadTournamentsFromFile,
  // getAllCountriesWithTournaments,
};
