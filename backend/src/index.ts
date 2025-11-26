import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { json } from "body-parser";

process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
});

console.log("[Startup] Environment:", process.env.NODE_ENV || "development");
console.log("[Startup] DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("[Startup] PORT:", process.env.PORT || "default");

import { healthRouter } from "./modules/health/health.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { organisationsRouter } from "./modules/organisations/organisations.routes";
import { screensRouter } from "./modules/screens/screens.routes";
import { regionsRouter } from "./modules/regions/regions.routes";
import { campaignsRouter } from "./modules/campaigns/campaigns.routes";
import { flightsRouter } from "./modules/campaigns/flights.routes";
import { flightCreativesRouter } from "./modules/campaigns/flightCreatives.routes";
import { creativesRouter } from "./modules/creatives/creatives.routes";
import { creativeApprovalsRouter } from "./modules/creatives/creative-approvals.routes";
import { bookingsRouter } from "./modules/bookings/bookings.routes";
import { invoicesRouter } from "./modules/invoices/invoices.routes";
import { playerRouter } from "./modules/player/player.routes";
import { reportsRouter } from "./modules/reports/reports.routes";
import { publishersRouter } from "./modules/publishers/publishers.routes";
import { advertisersRouter } from "./modules/advertisers/advertisers.routes";
import { uploadsRouter, UPLOADS_DIR } from "./modules/uploads/uploads.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { screenGroupsRouter } from "./modules/screen-groups/screenGroups.routes";

import { notFoundHandler, errorHandler } from "./middleware/errorhandler";

console.log("[Startup] All modules imported successfully");

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
app.use("/api/creative-approvals", creativeApprovalsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/player", playerRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/publishers", publishersRouter);
app.use("/api/advertisers", advertisersRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/screen-groups", screenGroupsRouter);

const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  const frontendDistPath = path.join(__dirname, "../../cms-web/dist");
  const indexPath = path.join(frontendDistPath, "index.html");
  
  console.log(`[Production] Frontend dist path: ${frontendDistPath}`);
  console.log(`[Production] Index path: ${indexPath}`);
  console.log(`[Production] Dist exists: ${fs.existsSync(frontendDistPath)}`);
  console.log(`[Production] Index exists: ${fs.existsSync(indexPath)}`);
  
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath, {
      setHeaders: (res) => {
        res.set("Cache-Control", "no-cache");
      },
    }));

    app.get("/{*path}", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
        return next();
      }
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send("Frontend build not found");
      }
    });
  } else {
    console.error(`[Production] ERROR: Frontend dist folder not found at ${frontendDistPath}`);
    app.get("/{*path}", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
        return next();
      }
      res.status(500).send("Frontend build not found. Please rebuild the application.");
    });
  }
}

app.use(notFoundHandler);
app.use(errorHandler);

const defaultPort = isProduction ? "5000" : "3000";
const port = parseInt(process.env.PORT || defaultPort, 10);
app.listen(port, "0.0.0.0", () => {
  console.log(`Beamer API listening on port ${port}`);
});
