import express from "express";
import controller from "../controllers/tournamentController.js";

const router = express.Router();

// load legacy tournaments from files not supabase
router.get("/data/:country", controller.getTournamentsFromFiles);
// load international fip tournaments from supabase
router.get("/international-fips", controller.getInternationalFipTournaments);
// load user tournament selections from supabase
router.get(
  "/user-tournament-selections",
  controller.getUserTournamentSelections
);

// check api status
router.get("/status", controller.getApiStatus);

export default router;
