import { Router, Request, Response, NextFunction } from "express";
import {
  listCampaigns,
  createCampaign,
  getCampaignById,
  getCampaignWithStats,
  updateCampaign,
  updateCampaignStatus,
  CampaignStatus,
} from "./campaigns.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

const router = Router();

function canAccessCampaigns(req: AuthRequest): boolean {
  if (!req.user) return false;
  const { orgType } = req.user;
  return orgType === "beamer_internal" || orgType === "advertiser";
}

function canAccessCampaign(req: AuthRequest, campaignAdvertiserOrgId: string): boolean {
  if (!req.user) return false;
  const { orgType, orgId } = req.user;

  if (orgType === "beamer_internal") {
    return true;
  }

  if (orgType === "advertiser") {
    return orgId === campaignAdvertiserOrgId;
  }

  return false;
}

// GET /api/campaigns
router.get("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessCampaigns(req)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const { status, from, to, search } = req.query;

    let advertiserOrgId: string | undefined;
    if (req.user!.orgType === "beamer_internal") {
      advertiserOrgId = req.query.org_id as string | undefined;
    } else {
      advertiserOrgId = req.user!.orgId;
    }

    const campaigns = await listCampaigns({
      advertiserOrgId,
      status: status as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      search: search as string | undefined,
    });

    res.json({ status: "success", data: campaigns });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns
router.post("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessCampaigns(req)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    let advertiserOrgId: string;
    if (req.user!.orgType === "beamer_internal") {
      advertiserOrgId = req.body.advertiserOrgId;
      if (!advertiserOrgId) {
        return res.status(400).json({
          status: "error",
          message: "advertiserOrgId is required for internal users",
        });
      }
    } else {
      advertiserOrgId = req.user!.orgId;
    }

    const campaign = await createCampaign({
      ...req.body,
      advertiserOrgId,
    });

    res.status(201).json({ status: "success", data: campaign });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ status: "error", message: "Campaign not found" });
    }

    if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const campaignWithStats = await getCampaignWithStats(req.params.id);
    res.json({ status: "success", data: campaignWithStats });
  } catch (err) {
    next(err);
  }
});

// PUT /api/campaigns/:id
router.put("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ status: "error", message: "Campaign not found" });
    }

    if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const updatedCampaign = await updateCampaign(req.params.id, req.body);
    res.json({ status: "success", data: updatedCampaign });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/campaigns/:id/status
router.patch("/:id/status", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ status: "error", message: "Campaign not found" });
    }

    if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const { status } = req.body;
    if (!status || !["draft", "active", "paused", "completed"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Valid status is required (draft | active | paused | completed)",
      });
    }

    const updatedCampaign = await updateCampaignStatus(req.params.id, status as CampaignStatus);
    res.json({ status: "success", data: updatedCampaign });
  } catch (err) {
    next(err);
  }
});

import { FlightsService, FlightStatus } from "./flights.service";
const flightsService = new FlightsService();

// POST /api/campaigns/:campaignId/flights
router.post("/:campaignId/flights", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await getCampaignById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ status: "error", message: "Campaign not found" });
    }

    if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const flight = await flightsService.createFlight({
      campaignId: req.params.campaignId,
      name: req.body.name,
      startDatetime: req.body.startDatetime,
      endDatetime: req.body.endDatetime,
      targetType: req.body.targetType,
      targetId: req.body.targetId,
      maxImpressions: req.body.maxImpressions,
      status: req.body.status,
    });
    res.status(201).json({ status: "success", data: flight });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:campaignId/flights
router.get("/:campaignId/flights", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await getCampaignById(req.params.campaignId);
    if (!campaign) {
      return res.status(404).json({ status: "error", message: "Campaign not found" });
    }

    if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const flights = await flightsService.listFlightsForCampaign(req.params.campaignId);
    res.json({ status: "success", data: flights });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/flights/:flightId/creatives
router.post("/flights/:flightId/creatives", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
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
