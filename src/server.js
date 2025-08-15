import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import tournamentRoutes from "./routes/tournamentRoutes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import adminRoutes from "./routes/adminRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";

// Load environment variables
import { config } from "dotenv";
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Get CORS origins from environment variables
const corsOrigins = process.env.CORS_ORIGINS.split(",").map((origin) =>
  origin.trim()
);

// Middleware
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Create data directory for storing tournament files
const DATA_DIR = path.join(import.meta.dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Tournament routes
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/tournaments/fip", tournamentRoutes);
app.use("/api/tournaments/status", tournamentRoutes);

// Admin routes
app.use("/api/admin/validate", adminRoutes);
app.use("/api/admin/check", adminRoutes);

// Events routes
app.use("/api/events", eventsRoutes);

// Error handling middleware
app.use(errorHandler);
app.use(notFoundHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Tournament Management API running on port ${PORT}`);
  console.log(`🔐 Admin endpoints:`);
  console.log(`   POST /api/admin/validate`);
  console.log(`   POST /api/admin/check`);
  console.log(`🏆 Tournament endpoints:`);
  console.log(`   GET  /api/tournaments/data/:country`);
  console.log(`   GET  /api/tournaments/fip`);
  console.log(`   GET  /api/tournaments/status`);
  console.log(`📅 Events endpoints:`);
  console.log(`   GET  /api/events`);
  console.log(`   GET  /api/events?start_date=...&end_date=...`);
  console.log(`🌐 CORS enabled for: ${corsOrigins.join(", ")}`);
  console.log(`🔒 Admin credentials secured on backend`);
});

export default app;
