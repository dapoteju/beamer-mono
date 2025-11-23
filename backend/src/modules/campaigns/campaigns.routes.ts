import { Router, Request, Response, NextFunction } from "express";
import {
  listCampaigns,
  createCampaign,
  getCampaignById,
} from "./campaigns.service";

const router = Router();

// GET /api/campaigns
router.get("/", async (req, res, next) => {
  try {
    const orgId = req.query.org_id as string;
    if (!orgId) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "org_id query parameter is required",
        });
    }
    const campaigns = await listCampaigns(orgId);
    res.json({ status: "success", data: campaigns });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await createCampaign(req.body);
    res.status(201).json({ status: "success", data: campaign });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) {
      return res
        .status(404)
        .json({ status: "error", message: "Campaign not found" });
    }
    res.json({ status: "success", data: campaign });
  } catch (err) {
    next(err);
  }
});

import { FlightsService } from "./flights.service";
const flightsService = new FlightsService();

// POST /api/campaigns/:campaignId/flights
router.post("/:campaignId/flights", async (req, res, next) => {
  try {
    const { campaignId } = req.params;
    const flight = await flightsService.createFlight({
      campaignId,
      ...req.body,
    });
    res.status(201).json({ status: "success", data: flight });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:campaignId/flights
router.get("/:campaignId/flights", async (req, res, next) => {
  try {
    const flights = await flightsService.listFlightsForCampaign(req.params.campaignId);
    res.json({ status: "success", data: flights });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/flights/:flightId/creatives
router.post("/flights/:flightId/creatives", async (req, res, next) => {
  try {
    const { flightId } = req.params;
    const { creative_id, weight } = req.body;
    const link = await flightsService.attachCreative(
      flightId,
      creative_id,
      weight ?? 1
    );
    res.status(201).json({ status: "success", data: link });
  } catch (err) {
    next(err);
  }
});

export { router as campaignsRouter };
