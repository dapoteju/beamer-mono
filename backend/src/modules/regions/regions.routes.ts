import { Router, Request, Response, NextFunction } from "express";
import { RegionsService } from "./regions.service";

export const regionsRouter = Router();

/**
 * GET /api/regions
 * Return all supported regions
 */
regionsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const regions = await RegionsService.getAll();
    res.json(regions);
  } catch (err) {
    next(err);
  }
});
