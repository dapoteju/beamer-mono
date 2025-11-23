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
router.post(
  "/events/playbacks",
  authenticatePlayer,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { events } = req.body;
      const playerId = req.player!.player_id;

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "events must be a non-empty array",
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
