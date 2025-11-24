// src/index.ts
import "dotenv/config";

import express from "express";
import cors from "cors";
import { json } from "body-parser";

import { healthRouter } from "./modules/health/health.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { organisationsRouter } from "./modules/organisations/organisations.routes";
import { screensRouter } from "./modules/screens/screens.routes";
import { regionsRouter } from "./modules/regions/regions.routes";
import { campaignsRouter } from "./modules/campaigns/campaigns.routes";
import { creativesRouter } from "./modules/creatives/creatives.routes";
import { bookingsRouter } from "./modules/bookings/bookings.routes";
import { invoicesRouter } from "./modules/invoices/invoices.routes";
import { playerRouter } from "./modules/player/player.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { publishersRouter } from "./modules/publishers/publishers.routes";
import { advertisersRouter } from "./modules/advertisers/advertisers.routes";

import { notFoundHandler, errorHandler } from "./middleware/errorhandler";

const app = express();

// Middlewares
app.use(cors());
app.use(json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/organisations", organisationsRouter);
app.use("/api/screens", screensRouter);
app.use("/api/regions", regionsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/campaigns", creativesRouter);  // creation
app.use("/api/creatives", creativesRouter);  // approval
app.use("/api/bookings", bookingsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/player", playerRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/publishers", publishersRouter);
app.use("/api/advertisers", advertisersRouter);

// 404 + error handlers last
app.use(notFoundHandler);
app.use(errorHandler);

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`Beamer API listening on port ${port}`);
});
