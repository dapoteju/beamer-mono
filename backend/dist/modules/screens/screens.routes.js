"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.screensRouter = void 0;
// src/modules/screens/screens.routes.ts
const express_1 = require("express");
const screens_service_1 = require("./screens.service");
exports.screensRouter = (0, express_1.Router)();
// GET /api/screens
exports.screensRouter.get("/", async (_req, res, next) => {
    try {
        const rows = await (0, screens_service_1.listScreens)();
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/screens
exports.screensRouter.post("/", async (req, res, next) => {
    try {
        const { publisherOrgId, name, screenType, resolutionWidth, resolutionHeight, city, regionCode, lat, lng, } = req.body;
        if (!publisherOrgId ||
            !name ||
            !screenType ||
            !resolutionWidth ||
            !resolutionHeight ||
            !city ||
            !regionCode ||
            !lat ||
            !lng) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const created = await (0, screens_service_1.createScreen)({
            publisherOrgId,
            name,
            screenType,
            resolutionWidth,
            resolutionHeight,
            city,
            regionCode,
            lat,
            lng,
        });
        res.status(201).json(created);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/screens/:id
exports.screensRouter.get("/:id", async (req, res, next) => {
    try {
        const screen = await (0, screens_service_1.getScreen)(req.params.id);
        if (!screen)
            return res.status(404).json({ message: "Not found" });
        res.json(screen);
    }
    catch (err) {
        next(err);
    }
});
