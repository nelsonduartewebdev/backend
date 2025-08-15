import express from "express";
import { getEvents } from "../controllers/eventsController.js";

const router = express.Router();

router.get("/", (req, res) => {
  const userId = req.headers["user-id"];
  return getEvents(req, res, userId);
});

export default router;
