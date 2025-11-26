// src/modules/screens/screens.routes.ts
import { Router, Response, NextFunction } from "express";
import {
  listScreensWithPlayerInfo,
  createScreen,
  getScreen,
  getScreenDetail,
  getScreenHeartbeats,
  getScreenPlayEvents,
  listPlayers,
  getPlayerDetail,
  createScreenForCMS,
  updateScreenData,
  validateRegionExists,
  validatePublisherOrg,
  getPlayerAssignment,
  getAvailablePlayers,
  getPublisherOrganisations,
  getRegionsList,
  getVehiclesList,
  getScreenLocationHistory,
  getPlaylistPreview,
  getLastPlayEvents,
  disconnectPlayerFromScreen,
  getScreenGroups,
} from "./screens.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { db } from "../../db/client";
import { players } from "../../db/schema";
import { eq } from "drizzle-orm";

export const screensRouter = Router();

function canAccessScreens(req: AuthRequest): boolean {
  if (!req.user) return false;
  const { orgType } = req.user;
  return orgType === "beamer_internal" || orgType === "publisher";
}

function canAccessScreen(req: AuthRequest, screenPublisherOrgId: string): boolean {
  if (!req.user) return false;
  const { orgType, orgId } = req.user;

  if (orgType === "beamer_internal") {
    return true;
  }

  if (orgType === "publisher") {
    return orgId === screenPublisherOrgId;
  }

  return false;
}

function canCreateScreen(req: AuthRequest): boolean {
  if (!req.user) return false;
  const { orgType, role } = req.user;
  return orgType === "beamer_internal" && (role === "admin" || role === "ops");
}

function canEditScreen(req: AuthRequest, screenPublisherOrgId: string): boolean {
  if (!req.user) return false;
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

function canChangePublisherOrg(req: AuthRequest): boolean {
  if (!req.user) return false;
  return req.user.orgType === "beamer_internal";
}

// GET /api/screens
screensRouter.get("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const filters: any = {};

    if (req.user!.orgType === "publisher") {
      filters.publisherOrgId = req.user!.orgId;
    }

    if (req.query.publisherOrgId && req.user!.orgType === "beamer_internal") {
      filters.publisherOrgId = req.query.publisherOrgId as string;
    }

    if (req.query.region) {
      filters.regionCode = req.query.region as string;
    }

    if (req.query.status) {
      filters.status = req.query.status as string;
    }

    const screens = await listScreensWithPlayerInfo(filters);

    const now = new Date();
    const formattedScreens = screens.map((screen) => ({
      id: screen.id,
      code: screen.code, // Phase 3B: Screen code
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
      // Phase 3A: Publisher profile data
      publisher: screen.publisherProfileId ? {
        id: screen.publisherProfileId,
        publisherType: screen.publisherType,
        fullName: screen.publisherFullName,
        phoneNumber: screen.publisherPhone,
        email: screen.publisherEmail,
        organisationId: screen.publisherOrganisationId,
      } : null,
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
      lastSeenAt: screen.lastSeenAt,
    }));

    res.json(formattedScreens);
  } catch (err) {
    next(err);
  }
});

// POST /api/screens - Create screen (beamer_internal admin/ops only)
screensRouter.post("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Permission check: Only beamer_internal admin/ops can create screens
    if (!canCreateScreen(req)) {
      return res.status(403).json({ 
        error: "Forbidden. Only internal admin/ops users can create screens." 
      });
    }

    const { 
      name, 
      city, 
      regionCode, 
      publisherOrgId, 
      publisherId, // Phase 3A
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
    } = req.body;

    // Phase 3B: Validate required fields (name is now optional, code is auto-generated)
    // For publisher users, publisherOrgId must be their own org ID
    // For internal users, publisherOrgId is optional
    let finalPublisherOrgId = publisherOrgId;
    
    if (req.user!.orgType === "publisher") {
      // Publisher users must create screens for their own organization
      finalPublisherOrgId = req.user!.orgId;
    } else if (!publisherOrgId && req.user!.orgType === "beamer_internal") {
      // Internal users can create screens without a publisher (unassigned)
      // This is handled by keeping publisherOrgId required in schema but allowing null service-layer logic
      return res.status(400).json({ 
        error: "Internal users must provide publisherOrgId. Optional publisher assignment coming soon.",
      });
    }
    
    if (!city || !regionCode) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["city", "regionCode"]
      });
    }

    // Validate region exists
    const regionExists = await validateRegionExists(regionCode);
    if (!regionExists) {
      return res.status(400).json({ error: "Invalid regionCode. Region does not exist." });
    }

    // Validate publisherOrgId is a publisher organisation (if provided)
    if (finalPublisherOrgId) {
      const orgValidation = await validatePublisherOrg(finalPublisherOrgId);
      if (!orgValidation.valid) {
        return res.status(400).json({ 
          error: `Invalid publisherOrgId. ${orgValidation.type ? `Organisation is of type "${orgValidation.type}", must be "publisher".` : "Organisation does not exist."}`
        });
      }
    }

    // If playerId provided, validate it's available
    if (playerId) {
      const playerAssignment = await getPlayerAssignment(playerId);
      if (!playerAssignment) {
        return res.status(400).json({ error: "Player does not exist." });
      }
      // Note: Player will be reassigned if already assigned to another screen
    }

    const created = await createScreenForCMS({
      name, // Phase 3B: Name is now optional
      city,
      regionCode,
      publisherOrgId: finalPublisherOrgId, // Use validated/finalized publisherOrgId
      publisherId, // Phase 3A
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
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/players (beamer_internal only) - MUST come before /:id
screensRouter.get("/players", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.orgType !== "beamer_internal") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const players = await listPlayers();

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
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/players/:id (beamer_internal only) - MUST come before /:id
screensRouter.get("/players/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.orgType !== "beamer_internal") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const playerId = req.params.id;
    const detail = await getPlayerDetail(playerId);

    if (!detail) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/dropdown/regions - Get regions for dropdown
screensRouter.get("/dropdown/regions", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const regionsList = await getRegionsList();
    res.json(regionsList);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/dropdown/publishers - Get publisher organisations for dropdown
screensRouter.get("/dropdown/publishers", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canCreateScreen(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const publishers = await getPublisherOrganisations();
    res.json(publishers);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/dropdown/players - Get players for dropdown (shows assignment status)
screensRouter.get("/dropdown/players", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const players = await getAvailablePlayers();
    res.json(players);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/dropdown/vehicles - Get vehicles for dropdown
screensRouter.get("/dropdown/vehicles", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // beamer_internal: can see all vehicles
    // publisher: can see only vehicles for their organisation
    // advertiser: forbidden
    const { orgType, orgId } = req.user!;
    
    if (orgType === "advertiser") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const publisherFilter = orgType === "publisher" ? orgId : undefined;
    const vehicles = await getVehiclesList(publisherFilter);
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/screens/:id - Update screen
screensRouter.patch("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const screenId = req.params.id;
    
    // Get current screen to check permissions
    const currentScreen = await getScreen(screenId);
    if (!currentScreen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    // Permission check: Internal users can edit all, publishers can edit own only
    if (!canEditScreen(req, currentScreen.publisherOrgId)) {
      return res.status(403).json({ 
        error: "Forbidden. You can only edit screens belonging to your organization." 
      });
    }

    const { 
      name, 
      city, 
      regionCode, 
      publisherOrgId, 
      publisherId, // Phase 3A
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
    } = req.body;

    // Build update payload
    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name;
    if (city !== undefined) updatePayload.city = city;
    if (regionCode !== undefined) updatePayload.regionCode = regionCode;
    if (status !== undefined) updatePayload.status = status;
    if (playerId !== undefined) updatePayload.playerId = playerId;
    if (publisherId !== undefined) updatePayload.publisherId = publisherId; // Phase 3A
    
    // Phase 2: Classification metadata
    if (screenClassification !== undefined) updatePayload.screenClassification = screenClassification;
    if (vehicleId !== undefined) updatePayload.vehicleId = vehicleId;
    if (structureType !== undefined) updatePayload.structureType = structureType;
    if (sizeDescription !== undefined) updatePayload.sizeDescription = sizeDescription;
    if (illuminationType !== undefined) updatePayload.illuminationType = illuminationType;
    if (address !== undefined) updatePayload.address = address;
    if (venueName !== undefined) updatePayload.venueName = venueName;
    if (venueType !== undefined) updatePayload.venueType = venueType;
    if (venueAddress !== undefined) updatePayload.venueAddress = venueAddress;
    if (latitude !== undefined) updatePayload.latitude = latitude;
    if (longitude !== undefined) updatePayload.longitude = longitude;

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
    if (updatePayload.regionCode && !(await validateRegionExists(updatePayload.regionCode))) {
      return res.status(400).json({ error: "Invalid regionCode. Region does not exist." });
    }

    // Validate publisherOrgId if provided
    if (updatePayload.publisherOrgId) {
      const orgValidation = await validatePublisherOrg(updatePayload.publisherOrgId);
      if (!orgValidation.valid) {
        return res.status(400).json({ 
          error: `Invalid publisherOrgId. ${orgValidation.type ? `Organisation is of type "${orgValidation.type}", must be "publisher".` : "Organisation does not exist."}`
        });
      }
    }

    // Validate playerId if provided and not null/empty
    if (updatePayload.playerId && updatePayload.playerId !== null && updatePayload.playerId !== '') {
      const playerAssignment = await getPlayerAssignment(updatePayload.playerId);
      if (!playerAssignment) {
        return res.status(400).json({ error: "Player does not exist." });
      }
    }

    // Get current player assignment
    const [currentPlayer] = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.screenId, screenId))
      .limit(1);

    const updated = await updateScreenData(
      screenId,
      updatePayload,
      currentPlayer?.id
    );

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/:id
screensRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const screenId = req.params.id;
    const basicScreen = await getScreen(screenId);

    if (!basicScreen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const detail = await getScreenDetail(screenId);

    if (!detail) {
      return res.status(404).json({ error: "Screen not found" });
    }

    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/:id/heartbeats
screensRouter.get("/:id/heartbeats", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const screenId = req.params.id;
    const basicScreen = await getScreen(screenId);

    if (!basicScreen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const heartbeats = await getScreenHeartbeats(screenId, from, to);

    res.json(heartbeats);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/:id/play-events
screensRouter.get("/:id/play-events", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const screenId = req.params.id;
    const basicScreen = await getScreen(screenId);

    if (!basicScreen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const playEvents = await getScreenPlayEvents(screenId, { from, to, limit });

    res.json(playEvents);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/:id/location-history
screensRouter.get("/:id/location-history", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const screenId = req.params.id;
    const basicScreen = await getScreen(screenId);

    if (!basicScreen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let from = req.query.from ? new Date(req.query.from as string) : undefined;
    let to = req.query.to ? new Date(req.query.to as string) : undefined;

    if (!from || !to) {
      to = new Date();
      from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    }

    const locationHistory = await getScreenLocationHistory(screenId, from, to);

    res.json(locationHistory);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/:id/playlist - Screen Playlist Inspector: preview what would play
screensRouter.get("/:id/playlist", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const screenId = req.params.id;
    const basicScreen = await getScreen(screenId);

    if (!basicScreen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const playlist = await getPlaylistPreview(screenId);

    res.json({ status: "success", data: playlist });
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/:id/last-play - Screen Playlist Inspector: last 20 play events
screensRouter.get("/:id/last-play", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const screenId = req.params.id;
    const basicScreen = await getScreen(screenId);

    if (!basicScreen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const lastPlays = await getLastPlayEvents(screenId, limit);

    res.json({ status: "success", data: lastPlays });
  } catch (err) {
    next(err);
  }
});

// POST /api/screens/:id/disconnect-player - Disconnect player from screen (beamer_internal only)
screensRouter.post("/:id/disconnect-player", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.orgType !== "beamer_internal") {
      return res.status(403).json({ 
        status: "error", 
        message: "Forbidden. Only internal users can disconnect players." 
      });
    }

    const screenId = req.params.id;
    const basicScreen = await getScreen(screenId);

    if (!basicScreen) {
      return res.status(404).json({ 
        status: "error", 
        message: "Screen not found" 
      });
    }

    const result = await disconnectPlayerFromScreen(screenId);

    res.json({
      status: "success",
      message: "Player disconnected from screen",
      data: {
        screen_id: result.screen_id,
        player_id: result.player_id,
      },
    });
  } catch (err: any) {
    if (err.message === "No active player linked to this screen") {
      return res.status(400).json({
        status: "error",
        message: err.message,
      });
    }
    next(err);
  }
});

// GET /api/screens/:id/groups - Get all groups this screen belongs to
screensRouter.get("/:id/groups", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessScreens(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const screenId = req.params.id;
    const basicScreen = await getScreen(screenId);

    if (!basicScreen) {
      return res.status(404).json({ 
        status: "error", 
        message: "Screen not found" 
      });
    }

    if (!canAccessScreen(req, basicScreen.publisherOrgId)) {
      return res.status(403).json({ 
        status: "error", 
        message: "Forbidden: cross-publisher access denied" 
      });
    }

    const result = await getScreenGroups(screenId);

    res.json({
      status: "success",
      data: {
        groups: result.groups.map(g => ({
          id: g.groupId,
          name: g.groupName,
          publisherOrgId: g.publisherOrgId,
          publisherName: g.publisherName,
          description: g.description,
          isArchived: g.isArchived,
          screenCount: g.screenCount,
          addedAt: g.addedAt.toISOString(),
          addedByUserId: g.addedByUserId,
          addedByUserName: g.addedByUserName,
        })),
        totalGroups: result.totalGroups,
      },
    });
  } catch (err) {
    next(err);
  }
});
