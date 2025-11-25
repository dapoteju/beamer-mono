import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import { json } from "body-parser";

import { healthRouter } from "./modules/health/health.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { organisationsRouter } from "./modules/organisations/organisations.routes";
import { screensRouter } from "./modules/screens/screens.routes";
import { regionsRouter } from "./modules/regions/regions.routes";
import { campaignsRouter } from "./modules/campaigns/campaigns.routes";
import { flightsRouter } from "./modules/campaigns/flights.routes";
import { flightCreativesRouter } from "./modules/campaigns/flightCreatives.routes";
import { creativesRouter } from "./modules/creatives/creatives.routes";
import { bookingsRouter } from "./modules/bookings/bookings.routes";
import { invoicesRouter } from "./modules/invoices/invoices.routes";
import { playerRouter } from "./modules/player/player.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { publishersRouter } from "./modules/publishers/publishers.routes";
import { advertisersRouter } from "./modules/advertisers/advertisers.routes";
import { uploadsRouter, UPLOADS_DIR } from "./modules/uploads/uploads.routes";

import { notFoundHandler, errorHandler } from "./middleware/errorhandler";

const app = express();

app.use(cors());
app.use(json());

app.use("/uploads", express.static(UPLOADS_DIR, {
  setHeaders: (res) => {
    res.set("Cache-Control", "public, max-age=31536000");
  },
}));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/organisations", organisationsRouter);
app.use("/api/screens", screensRouter);
app.use("/api/regions", regionsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/flights", flightsRouter);
app.use("/api/flights", flightCreativesRouter);
app.use("/api/campaigns", creativesRouter);
app.use("/api/creatives", creativesRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/player", playerRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/publishers", publishersRouter);
app.use("/api/advertisers", advertisersRouter);

const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  const frontendDistPath = path.join(__dirname, "../../cms-web/dist");
  
  app.use(express.static(frontendDistPath, {
    setHeaders: (res) => {
      res.set("Cache-Control", "no-cache");
    },
  }));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

const defaultPort = isProduction ? "5000" : "3000";
const port = parseInt(process.env.PORT || defaultPort, 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`Beamer API listening on port ${port}`);
});
