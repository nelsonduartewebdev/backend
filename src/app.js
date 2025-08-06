import express from "express";
import cors from "cors";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import tournamentRoutes from "./routes/tournamentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
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

app.use(errorHandler);
app.use("*", notFoundHandler);

export default app;
