"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const health_routes_1 = require("./modules/health/health.routes");
const organisations_routes_1 = require("./modules/organisations/organisations.routes");
const screens_routes_1 = require("./modules/screens/screens.routes");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// Health
app.use("/health", health_routes_1.healthRouter);
// Organisations & Screens
app.use("/api/organisations", organisations_routes_1.organisationsRouter);
app.use("/api/screens", screens_routes_1.screensRouter);
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Beamer API listening on port ${port}`);
});
