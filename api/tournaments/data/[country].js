import { getTournamentsFromFiles } from "../../../src/controllers/tournamentController.js";

export default async function handler(req, res) {
  // Map Vercel query param to match your controller's expected parameter:
  const { country } = req.query;

  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Now call your controller, which expects (req, res)
  return getTournamentsFromFiles(req, res, country);
}
