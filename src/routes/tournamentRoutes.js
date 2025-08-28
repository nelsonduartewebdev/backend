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

// Backward compatibility route
router.get("/selections", controller.getUserTournamentSelections);

// check api status
router.get("/status", controller.getApiStatus);

// tournament sharing endpoints
router.post("/share", controller.createSharedTournament);
router.get("/share/:shareId", controller.getSharedTournament);

export default router;
