// src/middleware/player-auth.ts
import { Request, Response, NextFunction } from "express";
import { PlayerService } from "../modules/player/player.service";

const playerService = new PlayerService();

export interface AuthenticatedRequest extends Request {
  player?: {
    player_id: string;
    screen_id: string;
  };
}

export async function authenticatePlayer(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Missing or invalid authorization header. Use: Authorization: Bearer <player_id>:<auth_token>",
      });
    }

    const token = authHeader.substring(7);
    const [playerId, authToken] = token.split(":");

    if (!playerId || !authToken) {
      return res.status(401).json({
        status: "error",
        message: "Invalid token format. Expected: <player_id>:<auth_token>",
      });
    }

    const playerInfo = await playerService.validateAuthToken(playerId, authToken);

    if (!playerInfo) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired authentication token",
      });
    }

    if (!playerInfo.is_active) {
      return res.status(401).json({
        status: "error",
        message: "Player is disconnected or inactive. Please re-register this device.",
      });
    }

    req.player = {
      player_id: playerId,
      screen_id: playerInfo.screen_id,
    };

    next();
  } catch (err) {
    next(err);
  }
}
