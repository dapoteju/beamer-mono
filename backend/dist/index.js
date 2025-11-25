"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const body_parser_1 = require("body-parser");
const health_routes_1 = require("./modules/health/health.routes");
const auth_routes_1 = require("./modules/auth/auth.routes");
const organisations_routes_1 = require("./modules/organisations/organisations.routes");
const screens_routes_1 = require("./modules/screens/screens.routes");
const regions_routes_1 = require("./modules/regions/regions.routes");
const campaigns_routes_1 = require("./modules/campaigns/campaigns.routes");
const flights_routes_1 = require("./modules/campaigns/flights.routes");
const flightCreatives_routes_1 = require("./modules/campaigns/flightCreatives.routes");
const creatives_routes_1 = require("./modules/creatives/creatives.routes");
const bookings_routes_1 = require("./modules/bookings/bookings.routes");
const invoices_routes_1 = require("./modules/invoices/invoices.routes");
const player_routes_1 = require("./modules/player/player.routes");
const reports_routes_1 = require("./modules/reports/reports.routes");
const publishers_routes_1 = require("./modules/publishers/publishers.routes");
const advertisers_routes_1 = require("./modules/advertisers/advertisers.routes");
const uploads_routes_1 = require("./modules/uploads/uploads.routes");
const errorhandler_1 = require("./middleware/errorhandler");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, body_parser_1.json)());
app.use("/uploads", express_1.default.static(uploads_routes_1.UPLOADS_DIR, {
    setHeaders: (res) => {
        res.set("Cache-Control", "public, max-age=31536000");
    },
}));
app.use("/api/health", health_routes_1.healthRouter);
app.use("/api/auth", auth_routes_1.authRouter);
app.use("/api/organisations", organisations_routes_1.organisationsRouter);
app.use("/api/screens", screens_routes_1.screensRouter);
app.use("/api/regions", regions_routes_1.regionsRouter);
app.use("/api/campaigns", campaigns_routes_1.campaignsRouter);
app.use("/api/flights", flights_routes_1.flightsRouter);
app.use("/api/flights", flightCreatives_routes_1.flightCreativesRouter);
app.use("/api/campaigns", creatives_routes_1.creativesRouter);
app.use("/api/creatives", creatives_routes_1.creativesRouter);
app.use("/api/uploads", uploads_routes_1.uploadsRouter);
app.use("/api/bookings", bookings_routes_1.bookingsRouter);
app.use("/api/invoices", invoices_routes_1.invoicesRouter);
app.use("/api/player", player_routes_1.playerRouter);
app.use("/api/reports", reports_routes_1.reportsRouter);
app.use("/api/publishers", publishers_routes_1.publishersRouter);
app.use("/api/advertisers", advertisers_routes_1.advertisersRouter);
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
    const frontendDistPath = path_1.default.join(__dirname, "../../cms-web/dist");
    const indexPath = path_1.default.join(frontendDistPath, "index.html");
    console.log(`[Production] Frontend dist path: ${frontendDistPath}`);
    console.log(`[Production] Index path: ${indexPath}`);
    console.log(`[Production] Dist exists: ${fs_1.default.existsSync(frontendDistPath)}`);
    console.log(`[Production] Index exists: ${fs_1.default.existsSync(indexPath)}`);
    if (fs_1.default.existsSync(frontendDistPath)) {
        app.use(express_1.default.static(frontendDistPath, {
            setHeaders: (res) => {
                res.set("Cache-Control", "no-cache");
            },
        }));
        app.get("/{*path}", (req, res, next) => {
            if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
                return next();
            }
            if (fs_1.default.existsSync(indexPath)) {
                res.sendFile(indexPath);
            }
            else {
                res.status(500).send("Frontend build not found");
            }
        });
    }
    else {
        console.error(`[Production] ERROR: Frontend dist folder not found at ${frontendDistPath}`);
        app.get("/{*path}", (req, res, next) => {
            if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
                return next();
            }
            res.status(500).send("Frontend build not found. Please rebuild the application.");
        });
    }
}
app.use(errorhandler_1.notFoundHandler);
app.use(errorhandler_1.errorHandler);
const defaultPort = isProduction ? "5000" : "3000";
const port = parseInt(process.env.PORT || defaultPort, 10);
app.listen(port, "0.0.0.0", () => {
    console.log(`Beamer API listening on port ${port}`);
});
