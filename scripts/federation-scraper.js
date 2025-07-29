/**
 * Federation Tournament Data Scraper
 *
 * This script scrapes official padel federation websites to extract
 * tournament information and store it in a standardized format.
 *
 * Usage: node federation-scraper.js [federation] [--update-all]
 */

const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

// Configuration for different federation sources
const FEDERATION_CONFIGS = {
  FIP: {
    name: "International Padel Federation",
    baseUrl: "https://www.padelfip.com",
    calendarUrl: "https://www.padelfip.com/calendar/",
    scrapeMethod: "dynamic", // requires puppeteer for JavaScript rendering
    selectors: {
      tournamentItems: ".calendar-event",
      tournamentName: ".event-title",
      tournamentDate: ".event-date",
      tournamentLocation: ".event-location",
      tournamentLevel: ".event-category",
      tournamentLink: "a",
    },
  },
  LTA: {
    name: "LTA Padel (UK)",
    baseUrl: "https://www.ltapadel.org.uk",
    calendarUrl: "https://www.ltapadel.org.uk/fan-zone/padel-event-calendar/",
    scrapeMethod: "static", // can use axios + cheerio
    selectors: {
      tournamentItems: ".event-item",
      tournamentName: ".event-title",
      tournamentDate: ".event-date",
      tournamentLocation: ".event-venue",
      tournamentLevel: ".event-category",
    },
  },
  // Add more federations as needed
};

class FederationScraper {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  /**
   * Initialize browser for dynamic scraping
   */
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
        ],
      });
    }
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Scrape FIP tournament data
   */
  async scrapeFIPTournaments() {
    console.log("🏆 Scraping FIP tournaments...");

    try {
      await this.initBrowser();
      const page = await this.browser.newPage();

      // Set a realistic user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      );

      // Navigate to FIP calendar
      await page.goto(FEDERATION_CONFIGS.FIP.calendarUrl, {
        waitUntil: "networkidle2",
        timeout: 30000,
      });

      // Wait for calendar content to load
      await page.waitForSelector("body", { timeout: 10000 });

      // Extract tournament data
      const tournaments = await page.evaluate(() => {
        const tournamentElements = document.querySelectorAll(
          '.calendar-item, .event-item, [class*="tournament"], [class*="event"]'
        );
        const results = [];

        tournamentElements.forEach((element, index) => {
          try {
            // Extract basic tournament info - adapt selectors based on actual HTML
            const nameElement = element.querySelector(
              'h3, .title, [class*="name"], [class*="title"]'
            );
            const dateElement = element.querySelector('.date, [class*="date"]');
            const locationElement = element.querySelector(
              '.location, [class*="location"], [class*="venue"]'
            );
            const linkElement = element.querySelector("a[href]");

            if (nameElement && nameElement.textContent.trim()) {
              const tournament = {
                id: `fip-${index}-${Date.now()}`,
                name: nameElement.textContent.trim(),
                federation: "FIP",
                level: "FIP Tournament", // Would need to parse from content
                location: locationElement
                  ? locationElement.textContent.trim()
                  : "",
                country: "", // Would need to parse or map from location
                rawDate: dateElement ? dateElement.textContent.trim() : "",
                link: linkElement ? linkElement.href : "",
                sourceUrl: window.location.href,
                scrapedAt: new Date().toISOString(),
              };

              // Only add if we have minimum required data
              if (tournament.name.length > 3) {
                results.push(tournament);
              }
            }
          } catch (error) {
            console.log("Error parsing tournament element:", error.message);
          }
        });

        return results;
      });

      console.log(`✅ Found ${tournaments.length} FIP tournaments`);
      return tournaments;
    } catch (error) {
      console.error("❌ Error scraping FIP tournaments:", error.message);
      return [];
    }
  }

  /**
   * Scrape LTA Padel tournament data
   */
  async scrapeLTATournaments() {
    console.log("🇬🇧 Scraping LTA Padel tournaments...");

    try {
      // LTA might be scrapeable with simple HTTP requests
      const response = await axios.get(FEDERATION_CONFIGS.LTA.calendarUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const tournaments = [];

      // Parse LTA tournament listings
      $(
        '.event-item, .tournament-item, [class*="event"], [class*="tournament"]'
      ).each((index, element) => {
        try {
          const $el = $(element);

          const name = $el
            .find('h3, .title, [class*="title"]')
            .first()
            .text()
            .trim();
          const date = $el.find('.date, [class*="date"]').first().text().trim();
          const location = $el
            .find('.location, .venue, [class*="location"]')
            .first()
            .text()
            .trim();
          const link = $el.find("a").first().attr("href");

          if (name && name.length > 3) {
            tournaments.push({
              id: `lta-${index}-${Date.now()}`,
              name,
              federation: "LTA",
              level: "LTA Tournament",
              location,
              country: "United Kingdom",
              rawDate: date,
              link: link
                ? new URL(link, FEDERATION_CONFIGS.LTA.baseUrl).href
                : "",
              sourceUrl: FEDERATION_CONFIGS.LTA.calendarUrl,
              scrapedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.log("Error parsing LTA tournament:", error.message);
        }
      });

      console.log(`✅ Found ${tournaments.length} LTA tournaments`);
      return tournaments;
    } catch (error) {
      console.error("❌ Error scraping LTA tournaments:", error.message);
      return [];
    }
  }

  /**
   * Parse and standardize tournament dates
   */
  parseTournamentDate(rawDate) {
    try {
      // Handle various date formats
      const datePatterns = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY or DD-MM-YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\d{1,2})\s+(\w+)\s+(\d{4})/, // DD Month YYYY
      ];

      for (const pattern of datePatterns) {
        const match = rawDate.match(pattern);
        if (match) {
          // Return ISO date string
          return new Date(rawDate).toISOString();
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract country from location string
   */
  extractCountry(location) {
    const countryMap = {
      Madrid: "Spain",
      Barcelona: "Spain",
      London: "United Kingdom",
      Paris: "France",
      "Buenos Aires": "Argentina",
      Doha: "Qatar",
      Dubai: "United Arab Emirates",
      // Add more mappings as needed
    };

    for (const [city, country] of Object.entries(countryMap)) {
      if (location.includes(city)) {
        return country;
      }
    }

    return "";
  }

  /**
   * Process and clean tournament data
   */
  processRawTournaments(rawTournaments) {
    return rawTournaments
      .map((tournament) => {
        const processedDate = this.parseTournamentDate(tournament.rawDate);
        const country =
          tournament.country || this.extractCountry(tournament.location);

        return {
          ...tournament,
          startDate: processedDate,
          country,
          status: this.determineTournamentStatus(processedDate),
          lastUpdated: new Date().toISOString(),
          isOfficial: true,
        };
      })
      .filter((t) => t.startDate); // Only keep tournaments with valid dates
  }

  /**
   * Determine tournament status based on date
   */
  determineTournamentStatus(dateString) {
    if (!dateString) return "unknown";

    const tournamentDate = new Date(dateString);
    const now = new Date();
    const daysDiff = Math.floor((tournamentDate - now) / (1000 * 60 * 60 * 24));

    if (daysDiff < -7) return "completed";
    if (daysDiff < 0) return "ongoing";
    return "upcoming";
  }

  /**
   * Save tournament data to JSON file
   */
  async saveTournamentData(
    tournaments,
    filename = "federation-tournaments.json"
  ) {
    try {
      const outputPath = path.join(__dirname, "..", "data", filename);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      const data = {
        lastUpdated: new Date().toISOString(),
        totalTournaments: tournaments.length,
        tournaments,
      };

      await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
      console.log(
        `💾 Saved ${tournaments.length} tournaments to ${outputPath}`
      );
    } catch (error) {
      console.error("❌ Error saving tournament data:", error.message);
    }
  }

  /**
   * Scrape all federation data
   */
  async scrapeAll() {
    console.log("🚀 Starting federation tournament scraping...\n");

    try {
      const allTournaments = [];

      // Scrape FIP tournaments
      const fipTournaments = await this.scrapeFIPTournaments();
      allTournaments.push(...fipTournaments);

      // Scrape LTA tournaments
      const ltaTournaments = await this.scrapeLTATournaments();
      allTournaments.push(...ltaTournaments);

      // Process and clean data
      const processedTournaments = this.processRawTournaments(allTournaments);

      // Save to file
      await this.saveTournamentData(processedTournaments);

      // Generate summary
      const summary = this.generateSummary(processedTournaments);
      console.log("\n📊 Scraping Summary:");
      console.log(summary);

      return processedTournaments;
    } catch (error) {
      console.error("❌ Error in scrapeAll:", error.message);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * Generate scraping summary
   */
  generateSummary(tournaments) {
    const federationCounts = {};
    const countryCounts = {};
    const statusCounts = {};

    tournaments.forEach((tournament) => {
      federationCounts[tournament.federation] =
        (federationCounts[tournament.federation] || 0) + 1;
      countryCounts[tournament.country] =
        (countryCounts[tournament.country] || 0) + 1;
      statusCounts[tournament.status] =
        (statusCounts[tournament.status] || 0) + 1;
    });

    return {
      total: tournaments.length,
      byFederation: federationCounts,
      byCountry: countryCounts,
      byStatus: statusCounts,
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const targetFederation = args[0];
  const scraper = new FederationScraper();

  try {
    if (targetFederation === "fip") {
      const tournaments = await scraper.scrapeFIPTournaments();
      await scraper.saveTournamentData(
        scraper.processRawTournaments(tournaments),
        "fip-tournaments.json"
      );
    } else if (targetFederation === "lta") {
      const tournaments = await scraper.scrapeLTATournaments();
      await scraper.saveTournamentData(
        scraper.processRawTournaments(tournaments),
        "lta-tournaments.json"
      );
    } else {
      // Scrape all federations
      await scraper.scrapeAll();
    }
  } catch (error) {
    console.error("❌ Scraping failed:", error.message);
    process.exit(1);
  } finally {
    await scraper.closeBrowser();
  }
}

// Export for use as module
module.exports = FederationScraper;

// Run if called directly
if (require.main === module) {
  main();
}
