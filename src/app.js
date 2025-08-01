import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import tournamentRoutes from "./routes/tournamentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

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

// Routes
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/admin", adminRoutes);

// Error handling middleware
app.use(errorHandler);
app.use("*", notFoundHandler);

export default app;
