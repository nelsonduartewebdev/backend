import { getSharedTournament } from "../../../src/controllers/tournamentController.js";

export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGIN || "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Map Vercel query param to match your controller's expected parameter
  req.params = { shareId: req.query.shareId };

  return getSharedTournament(req, res);
}
