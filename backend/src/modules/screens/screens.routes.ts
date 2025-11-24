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

    const { name, city, regionCode, publisherOrgId, status, playerId } = req.body;

    // Validate required fields
    if (!name || !city || !regionCode || !publisherOrgId) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["name", "city", "regionCode", "publisherOrgId"]
      });
    }

    // Validate region exists
    const regionExists = await validateRegionExists(regionCode);
    if (!regionExists) {
      return res.status(400).json({ error: "Invalid regionCode. Region does not exist." });
    }

    // Validate publisherOrgId is a publisher organisation
    const orgValidation = await validatePublisherOrg(publisherOrgId);
    if (!orgValidation.valid) {
      return res.status(400).json({ 
        error: `Invalid publisherOrgId. ${orgValidation.type ? `Organisation is of type "${orgValidation.type}", must be "publisher".` : "Organisation does not exist."}`
      });
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
      name,
      city,
      regionCode,
      publisherOrgId,
      status,
      playerId,
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

    const { name, city, regionCode, publisherOrgId, status, playerId } = req.body;

    // Build update payload
    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name;
    if (city !== undefined) updatePayload.city = city;
    if (regionCode !== undefined) updatePayload.regionCode = regionCode;
    if (status !== undefined) updatePayload.status = status;
    if (playerId !== undefined) updatePayload.playerId = playerId;

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
