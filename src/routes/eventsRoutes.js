import express from "express";
import { getEvents } from "../controllers/eventsController.js";
import { optionalAuthentication } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", optionalAuthentication, (req, res) => {
  const userId = req.user?.id || req.headers["user-id"];
  return getEvents(req, res, userId);
});

export default router;
