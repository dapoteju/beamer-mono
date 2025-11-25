// src/modules/player/player.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import { PlayerService } from "./player.service";
import { authenticatePlayer, AuthenticatedRequest } from "../../middleware/player-auth";

const router = Router();
const playerService = new PlayerService();

// POST /api/player/register - Register a new player for a screen
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { screen_id, software_version } = req.body;

      if (!screen_id) {
        return res
          .status(400)
          .json({ status: "error", message: "screen_id is required" });
      }

      const result = await playerService.registerPlayer({
        screen_id,
        software_version,
      });

      res.status(201).json({ 
        status: "success", 
        data: result,
        message: "Player registered successfully. Use player_id and auth_token for authentication."
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/player/playlist - Get playlist for authenticated player
router.get(
  "/playlist",
  authenticatePlayer,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const configHash = req.headers["if-none-match"] as string | undefined;
      const screenId = req.player!.screen_id;

      const playlist = await playerService.getWeightedPlaylistForScreen(
        screenId,
        configHash
      );

      if ("not_modified" in playlist && playlist.not_modified) {
        return res.status(304).send();
      }

      if ("config_hash" in playlist) {
        res.setHeader("ETag", playlist.config_hash);
      }
      res.json({ status: "success", data: playlist });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/player/events/playbacks - Record play events (authenticated)
// Accepts either a single event object or an array of events for backward compatibility
router.post(
  "/events/playbacks",
  authenticatePlayer,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const playerId = req.player!.player_id;
      const body = req.body;

      let events: any[];

      // Support both single event and array format
      if (Array.isArray(body.events)) {
        events = body.events;
      } else if (body.creative_id) {
        // Single event format: { creative_id, screen_id, played_at, duration_seconds, status, location }
        events = [{
          creative_id: body.creative_id,
          campaign_id: body.campaign_id || null,
          flight_id: body.flight_id || null,
          started_at: body.played_at || body.started_at,
          duration_seconds: body.duration_seconds,
          play_status: body.status || body.play_status || 'success',
          location: body.location,
        }];
      } else {
        return res.status(400).json({
          status: "error",
          message: "Request must contain either 'events' array or single event with 'creative_id'",
        });
      }

      if (events.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No events to record",
        });
      }

      await playerService.recordPlayEvents(playerId, events);

      res.status(201).json({ status: "success" });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/player/heartbeat - Record heartbeat (authenticated)
router.post(
  "/heartbeat",
  authenticatePlayer,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = req.body;
      const playerId = req.player!.player_id;

      if (!body.timestamp) {
        return res
          .status(400)
          .json({ status: "error", message: "timestamp is required" });
      }

      await playerService.recordHeartbeat({
        player_id: playerId,
        ...body,
      });

      res.status(201).json({ status: "success" });
    } catch (err) {
      next(err);
    }
  }
);

export { router as playerRouter };
