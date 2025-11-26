import { Router, Request, Response, NextFunction } from "express";
import {
  getCampaignReport,
  getCampaignMobilityReport,
  getCampaignExposureReport,
  getCampaignComplianceReport,
  getBookingReport,
  getScreenReport,
  getCreativeReport,
} from "./reports.service";
import { getReportByScreenGroup } from "../screen-groups/screenGroups.service";

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
  "/campaigns/:id/mobility",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({
          status: "error",
          message: "Start date must be before or equal to end date",
        });
      }

      const report = await getCampaignMobilityReport(
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
    } catch (err: any) {
      if (err.message?.includes("Start date must be") || err.message?.includes("Invalid date")) {
        return res.status(400).json({
          status: "error",
          message: err.message,
        });
      }
      next(err);
    }
  }
);

reportsRouter.get(
  "/campaigns/:id/exposure",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({
          status: "error",
          message: "Start date must be before or equal to end date",
        });
      }

      const report = await getCampaignExposureReport(
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
    } catch (err: any) {
      if (err.message?.includes("Start date must be") || err.message?.includes("Invalid date")) {
        return res.status(400).json({
          status: "error",
          message: err.message,
        });
      }
      next(err);
    }
  }
);

reportsRouter.get(
  "/campaigns/:id/compliance",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({
          status: "error",
          message: "Start date must be before or equal to end date",
        });
      }

      const report = await getCampaignComplianceReport(
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
    } catch (err: any) {
      if (err.message?.includes("Start date must be") || err.message?.includes("Invalid date")) {
        return res.status(400).json({
          status: "error",
          message: err.message,
        });
      }
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

reportsRouter.get(
  "/campaigns/:id/by-screen-group",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const report = await getReportByScreenGroup(id);

      res.json({
        status: "success",
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);
