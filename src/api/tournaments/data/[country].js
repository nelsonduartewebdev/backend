import { getTournamentsFromFiles } from "../../../path/to/your/controllers";

export default async function handler(req, res) {
  // Map Vercel query param to match your controller’s expected parameter:
  req.params = { country: req.query.country };

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
  return getTournamentsFromFiles(req, res);
}
