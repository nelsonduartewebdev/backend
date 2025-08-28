import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import tournamentRoutes from "./routes/tournamentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.options(
  "*",
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);
app.use("*", notFoundHandler);

export default app;
