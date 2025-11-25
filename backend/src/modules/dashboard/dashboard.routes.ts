import { Router, Response, NextFunction } from "express";
import { AuthRequest, requireAuth } from "../../middleware/auth";
import { getDashboardSummary } from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/summary",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Only allow beamer_internal users to access this endpoint
      if (!req.user || req.user.orgType !== "beamer_internal") {
        return res.status(403).json({
          status: "error",
          message: "Dashboard is only available for internal users",
        });
      }

      const offlineLimit = parseInt(req.query.offlineLimit as string) || 10;
      const approvalsLimit = parseInt(req.query.approvalsLimit as string) || 10;

      const summary = await getDashboardSummary(offlineLimit, approvalsLimit);

      return res.json({
        status: "success",
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }
);
