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
} from "./screens.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

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

// POST /api/screens
screensRouter.post("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      publisherOrgId,
      name,
      screenType,
      resolutionWidth,
      resolutionHeight,
      city,
      regionCode,
      lat,
      lng,
    } = req.body;

    if (
      !publisherOrgId ||
      !name ||
      !screenType ||
      !resolutionWidth ||
      !resolutionHeight ||
      !city ||
      !regionCode ||
      !lat ||
      !lng
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const created = await createScreen({
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
