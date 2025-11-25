import { Router, Response, NextFunction } from "express";
import { getPendingApprovals } from "./creatives.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

const router = Router();

router.get(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.orgType !== "beamer_internal") {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const { status } = req.query;
      const statusFilter = typeof status === "string" ? status : undefined;

      const approvals = await getPendingApprovals(statusFilter);

      return res.json({
        status: "success",
        data: approvals,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as creativeApprovalsRouter };
