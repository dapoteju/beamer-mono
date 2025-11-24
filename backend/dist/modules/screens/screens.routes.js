"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.screensRouter = void 0;
// src/modules/screens/screens.routes.ts
const express_1 = require("express");
const screens_service_1 = require("./screens.service");
const auth_1 = require("../../middleware/auth");
const client_1 = require("../../db/client");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
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
function canCreateScreen(req) {
    if (!req.user)
        return false;
    const { orgType, role } = req.user;
    return orgType === "beamer_internal" && (role === "admin" || role === "ops");
}
function canEditScreen(req, screenPublisherOrgId) {
    if (!req.user)
        return false;
    const { orgType, orgId } = req.user;
    // Internal users can edit all screens
    if (orgType === "beamer_internal") {
        return true;
    }
    // Publisher users can edit only their own screens
    if (orgType === "publisher") {
        return orgId === screenPublisherOrgId;
    }
    return false;
}
function canChangePublisherOrg(req) {
    if (!req.user)
        return false;
    return req.user.orgType === "beamer_internal";
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
            // Phase 2: Classification metadata
            screenClassification: screen.screenClassification,
            vehicle: screen.vehicle,
            structureType: screen.structureType,
            sizeDescription: screen.sizeDescription,
            illuminationType: screen.illuminationType,
            address: screen.address,
            venueName: screen.venueName,
            venueType: screen.venueType,
            venueAddress: screen.venueAddress,
            latitude: screen.latitude,
            longitude: screen.longitude,
        }));
        res.json(formattedScreens);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/screens - Create screen (beamer_internal admin/ops only)
exports.screensRouter.post("/", auth_1.requireAuth, async (req, res, next) => {
    try {
        // Permission check: Only beamer_internal admin/ops can create screens
        if (!canCreateScreen(req)) {
            return res.status(403).json({
                error: "Forbidden. Only internal admin/ops users can create screens."
            });
        }
        const { name, city, regionCode, publisherOrgId, status, playerId, 
        // Phase 2: Classification metadata
        screenClassification, vehicleId, structureType, sizeDescription, illuminationType, address, venueName, venueType, venueAddress, latitude, longitude, } = req.body;
        // Validate required fields
        if (!name || !city || !regionCode || !publisherOrgId) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["name", "city", "regionCode", "publisherOrgId"]
            });
        }
        // Validate region exists
        const regionExists = await (0, screens_service_1.validateRegionExists)(regionCode);
        if (!regionExists) {
            return res.status(400).json({ error: "Invalid regionCode. Region does not exist." });
        }
        // Validate publisherOrgId is a publisher organisation
        const orgValidation = await (0, screens_service_1.validatePublisherOrg)(publisherOrgId);
        if (!orgValidation.valid) {
            return res.status(400).json({
                error: `Invalid publisherOrgId. ${orgValidation.type ? `Organisation is of type "${orgValidation.type}", must be "publisher".` : "Organisation does not exist."}`
            });
        }
        // If playerId provided, validate it's available
        if (playerId) {
            const playerAssignment = await (0, screens_service_1.getPlayerAssignment)(playerId);
            if (!playerAssignment) {
                return res.status(400).json({ error: "Player does not exist." });
            }
            // Note: Player will be reassigned if already assigned to another screen
        }
        const created = await (0, screens_service_1.createScreenForCMS)({
            name,
            city,
            regionCode,
            publisherOrgId,
            status,
            playerId,
            // Phase 2: Classification metadata
            screenClassification,
            vehicleId,
            structureType,
            sizeDescription,
            illuminationType,
            address,
            venueName,
            venueType,
            venueAddress,
            latitude,
            longitude,
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
// GET /api/screens/dropdown/regions - Get regions for dropdown
exports.screensRouter.get("/dropdown/regions", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!canAccessScreens(req)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const regionsList = await (0, screens_service_1.getRegionsList)();
        res.json(regionsList);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/screens/dropdown/publishers - Get publisher organisations for dropdown
exports.screensRouter.get("/dropdown/publishers", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!canCreateScreen(req)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const publishers = await (0, screens_service_1.getPublisherOrganisations)();
        res.json(publishers);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/screens/dropdown/players - Get players for dropdown (shows assignment status)
exports.screensRouter.get("/dropdown/players", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!canAccessScreens(req)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const players = await (0, screens_service_1.getAvailablePlayers)();
        res.json(players);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/screens/dropdown/vehicles - Get vehicles for dropdown
exports.screensRouter.get("/dropdown/vehicles", auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!canAccessScreens(req)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        // beamer_internal: can see all vehicles
        // publisher: can see only vehicles for their organisation
        // advertiser: forbidden
        const { orgType, orgId } = req.user;
        if (orgType === "advertiser") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const publisherFilter = orgType === "publisher" ? orgId : undefined;
        const vehicles = await (0, screens_service_1.getVehiclesList)(publisherFilter);
        res.json(vehicles);
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/screens/:id - Update screen
exports.screensRouter.patch("/:id", auth_1.requireAuth, async (req, res, next) => {
    try {
        const screenId = req.params.id;
        // Get current screen to check permissions
        const currentScreen = await (0, screens_service_1.getScreen)(screenId);
        if (!currentScreen) {
            return res.status(404).json({ error: "Screen not found" });
        }
        // Permission check: Internal users can edit all, publishers can edit own only
        if (!canEditScreen(req, currentScreen.publisherOrgId)) {
            return res.status(403).json({
                error: "Forbidden. You can only edit screens belonging to your organization."
            });
        }
        const { name, city, regionCode, publisherOrgId, status, playerId, 
        // Phase 2: Classification metadata
        screenClassification, vehicleId, structureType, sizeDescription, illuminationType, address, venueName, venueType, venueAddress, latitude, longitude, } = req.body;
        // Build update payload
        const updatePayload = {};
        if (name !== undefined)
            updatePayload.name = name;
        if (city !== undefined)
            updatePayload.city = city;
        if (regionCode !== undefined)
            updatePayload.regionCode = regionCode;
        if (status !== undefined)
            updatePayload.status = status;
        if (playerId !== undefined)
            updatePayload.playerId = playerId;
        // Phase 2: Classification metadata
        if (screenClassification !== undefined)
            updatePayload.screenClassification = screenClassification;
        if (vehicleId !== undefined)
            updatePayload.vehicleId = vehicleId;
        if (structureType !== undefined)
            updatePayload.structureType = structureType;
        if (sizeDescription !== undefined)
            updatePayload.sizeDescription = sizeDescription;
        if (illuminationType !== undefined)
            updatePayload.illuminationType = illuminationType;
        if (address !== undefined)
            updatePayload.address = address;
        if (venueName !== undefined)
            updatePayload.venueName = venueName;
        if (venueType !== undefined)
            updatePayload.venueType = venueType;
        if (venueAddress !== undefined)
            updatePayload.venueAddress = venueAddress;
        if (latitude !== undefined)
            updatePayload.latitude = latitude;
        if (longitude !== undefined)
            updatePayload.longitude = longitude;
        // Publishers cannot change publisherOrgId
        if (publisherOrgId !== undefined) {
            if (!canChangePublisherOrg(req)) {
                return res.status(403).json({
                    error: "Forbidden. Only internal users can change screen publisher."
                });
            }
            updatePayload.publisherOrgId = publisherOrgId;
        }
        // Validate regionCode if provided
        if (updatePayload.regionCode && !(await (0, screens_service_1.validateRegionExists)(updatePayload.regionCode))) {
            return res.status(400).json({ error: "Invalid regionCode. Region does not exist." });
        }
        // Validate publisherOrgId if provided
        if (updatePayload.publisherOrgId) {
            const orgValidation = await (0, screens_service_1.validatePublisherOrg)(updatePayload.publisherOrgId);
            if (!orgValidation.valid) {
                return res.status(400).json({
                    error: `Invalid publisherOrgId. ${orgValidation.type ? `Organisation is of type "${orgValidation.type}", must be "publisher".` : "Organisation does not exist."}`
                });
            }
        }
        // Validate playerId if provided and not null/empty
        if (updatePayload.playerId && updatePayload.playerId !== null && updatePayload.playerId !== '') {
            const playerAssignment = await (0, screens_service_1.getPlayerAssignment)(updatePayload.playerId);
            if (!playerAssignment) {
                return res.status(400).json({ error: "Player does not exist." });
            }
        }
        // Get current player assignment
        const [currentPlayer] = await client_1.db
            .select({ id: schema_1.players.id })
            .from(schema_1.players)
            .where((0, drizzle_orm_1.eq)(schema_1.players.screenId, screenId))
            .limit(1);
        const updated = await (0, screens_service_1.updateScreenData)(screenId, updatePayload, currentPlayer?.id);
        res.json(updated);
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
