import { getInternationalFipTournaments } from "../../../src/controllers/tournamentController.js";

export default async function handler(req, res) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://frontend-phi-navy-89.vercel.app"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Now call your controller, which expects (req, res)
  return getInternationalFipTournaments(req, res);
}
