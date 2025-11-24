import { Router, Response, NextFunction } from "express";
import { FlightsService, FlightStatus } from "./flights.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import { getCampaignById } from "./campaigns.service";

const router = Router();
const flightsService = new FlightsService();

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

// PUT /api/flights/:id
router.put("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const flight = await flightsService.getFlightById(req.params.id);
    if (!flight) {
      return res.status(404).json({ status: "error", message: "Flight not found" });
    }

    const campaign = await getCampaignById(flight.campaignId);
    if (!campaign) {
      return res.status(404).json({ status: "error", message: "Campaign not found" });
    }

    if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const updatedFlight = await flightsService.updateFlight(req.params.id, req.body);
    res.json({ status: "success", data: updatedFlight });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/flights/:id/status
router.patch("/:id/status", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const flight = await flightsService.getFlightById(req.params.id);
    if (!flight) {
      return res.status(404).json({ status: "error", message: "Flight not found" });
    }

    const campaign = await getCampaignById(flight.campaignId);
    if (!campaign) {
      return res.status(404).json({ status: "error", message: "Campaign not found" });
    }

    if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const { status } = req.body;
    if (!status || !["scheduled", "active", "paused", "completed"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Valid status is required (scheduled | active | paused | completed)",
      });
    }

    const updatedFlight = await flightsService.updateFlightStatus(req.params.id, status as FlightStatus);
    res.json({ status: "success", data: updatedFlight });
  } catch (err) {
    next(err);
  }
});

export { router as flightsRouter };
