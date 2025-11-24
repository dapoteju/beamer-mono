"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.screensRouter = void 0;
// src/modules/screens/screens.routes.ts
const express_1 = require("express");
const screens_service_1 = require("./screens.service");
const auth_1 = require("../../middleware/auth");
exports.screensRouter = (0, express_1.Router)();
function canAccessScreens(req) {
    if (!req.user)
        return false;
    const { orgType } = req.user;
    return orgType === "beamer_internal" || orgType === "publisher";
}
function canAccessScreen(req, screenPublisherOrgId) {
    if (!req.user)
        return false;
    const { orgType, orgId } = req.user;
    if (orgType === "beamer_internal") {
        return true;
    }
    if (orgType === "publisher") {
        return orgId === screenPublisherOrgId;
    }
    return false;
}
// GET /api/screens
exports.screensRouter.get("/", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!canAccessScreens(req)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const filters = {};
        if (req.user.orgType === "publisher") {
            filters.publisherOrgId = req.user.orgId;
        }
        if (req.query.publisherOrgId && req.user.orgType === "beamer_internal") {
            filters.publisherOrgId = req.query.publisherOrgId;
        }
        if (req.query.region) {
            filters.regionCode = req.query.region;
        }
        if (req.query.status) {
            filters.status = req.query.status;
        }
        const screens = await (0, screens_service_1.listScreensWithPlayerInfo)(filters);
        const now = new Date();
        const formattedScreens = screens.map((screen) => ({
            id: screen.id,
            name: screen.name,
            city: screen.city,
            region: screen.regionCode,
            publisherOrgId: screen.publisherOrgId,
            publisherOrgName: screen.publisherOrgName,
            status: screen.status,
            playerId: screen.playerId,
            lastHeartbeatAt: screen.lastHeartbeatAt,
            isOnline: screen.lastHeartbeatAt
                ? now.getTime() - new Date(screen.lastHeartbeatAt).getTime() < 2 * 60 * 1000
                : false,
        }));
        res.json(formattedScreens);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/screens
exports.screensRouter.post("/", auth_1.requireAuth, async (req, res, next) => {
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
            return res.status(400).json({ error: "Missing required fields" });
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
// GET /api/screens/players (beamer_internal only) - MUST come before /:id
exports.screensRouter.get("/players", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (req.user?.orgType !== "beamer_internal") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const players = await (0, screens_service_1.listPlayers)();
        const now = new Date();
        const formattedPlayers = players.map((player) => ({
            id: player.id,
            screenId: player.screenId,
            screenName: player.screenName,
            lastSeenAt: player.lastSeenAt,
            softwareVersion: player.softwareVersion,
            lastHeartbeatAt: player.lastHeartbeatAt,
            isOnline: player.lastHeartbeatAt
                ? now.getTime() - new Date(player.lastHeartbeatAt).getTime() < 2 * 60 * 1000
                : false,
        }));
        res.json(formattedPlayers);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/screens/players/:id (beamer_internal only) - MUST come before /:id
exports.screensRouter.get("/players/:id", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (req.user?.orgType !== "beamer_internal") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const playerId = req.params.id;
        const detail = await (0, screens_service_1.getPlayerDetail)(playerId);
        if (!detail) {
            return res.status(404).json({ error: "Player not found" });
        }
        res.json(detail);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/screens/:id
exports.screensRouter.get("/:id", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!canAccessScreens(req)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const screenId = req.params.id;
        const basicScreen = await (0, screens_service_1.getScreen)(screenId);
        if (!basicScreen) {
            return res.status(404).json({ error: "Screen not found" });
        }
        if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const detail = await (0, screens_service_1.getScreenDetail)(screenId);
        if (!detail) {
            return res.status(404).json({ error: "Screen not found" });
        }
        res.json(detail);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/screens/:id/heartbeats
exports.screensRouter.get("/:id/heartbeats", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!canAccessScreens(req)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const screenId = req.params.id;
        const basicScreen = await (0, screens_service_1.getScreen)(screenId);
        if (!basicScreen) {
            return res.status(404).json({ error: "Screen not found" });
        }
        if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const from = req.query.from ? new Date(req.query.from) : undefined;
        const to = req.query.to ? new Date(req.query.to) : undefined;
        const heartbeats = await (0, screens_service_1.getScreenHeartbeats)(screenId, from, to);
        res.json(heartbeats);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/screens/:id/play-events
exports.screensRouter.get("/:id/play-events", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!canAccessScreens(req)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const screenId = req.params.id;
        const basicScreen = await (0, screens_service_1.getScreen)(screenId);
        if (!basicScreen) {
            return res.status(404).json({ error: "Screen not found" });
        }
        if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const from = req.query.from ? new Date(req.query.from) : undefined;
        const to = req.query.to ? new Date(req.query.to) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
        const playEvents = await (0, screens_service_1.getScreenPlayEvents)(screenId, { from, to, limit });
        res.json(playEvents);
    }
    catch (err) {
        next(err);
    }
});
