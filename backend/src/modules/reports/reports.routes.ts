import { Router, Request, Response, NextFunction } from "express";
import {
  getCampaignReport,
  getBookingReport,
  getScreenReport,
  getCreativeReport,
} from "./reports.service";

export const reportsRouter = Router();

reportsRouter.get(
  "/campaigns/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const report = await getCampaignReport(
        id,
        startDate as string | undefined,
        endDate as string | undefined
      );

      if (!report) {
        return res.status(404).json({
          status: "error",
          message: "Campaign not found",
        });
      }

      res.json({
        status: "success",
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);

reportsRouter.get(
  "/bookings/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const report = await getBookingReport(
        id,
        startDate as string | undefined,
        endDate as string | undefined
      );

      if (!report) {
        return res.status(404).json({
          status: "error",
          message: "Booking not found",
        });
      }

      res.json({
        status: "success",
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);

reportsRouter.get(
  "/screens/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const report = await getScreenReport(
        id,
        startDate as string | undefined,
        endDate as string | undefined
      );

      if (!report) {
        return res.status(404).json({
          status: "error",
          message: "Screen not found",
        });
      }

      res.json({
        status: "success",
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);

reportsRouter.get(
  "/creatives/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const report = await getCreativeReport(
        id,
        startDate as string | undefined,
        endDate as string | undefined
      );

      if (!report) {
        return res.status(404).json({
          status: "error",
          message: "Creative not found",
        });
      }

      res.json({
        status: "success",
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);
