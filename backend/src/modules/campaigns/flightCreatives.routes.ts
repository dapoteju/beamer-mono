import { Router, Response, NextFunction } from "express";
import { FlightCreativesService } from "./flightCreatives.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

const router = Router();
const flightCreativesService = new FlightCreativesService();

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

router.get(
  "/:flightId/creatives",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { flightId } = req.params;

      const flight = await flightCreativesService.getFlightById(flightId);
      if (!flight) {
        return res.status(404).json({ status: "error", message: "Flight not found" });
      }

      const campaign = await flightCreativesService.getCampaignById(flight.campaignId);
      if (!campaign) {
        return res.status(404).json({ status: "error", message: "Campaign not found" });
      }

      if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const flightCreatives = await flightCreativesService.listFlightCreatives(flightId);
      res.json({ status: "success", data: flightCreatives });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:flightId/creatives",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { flightId } = req.params;
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({
          status: "error",
          message: "items array is required",
        });
      }

      const flight = await flightCreativesService.getFlightById(flightId);
      if (!flight) {
        return res.status(404).json({ status: "error", message: "Flight not found" });
      }

      const campaign = await flightCreativesService.getCampaignById(flight.campaignId);
      if (!campaign) {
        return res.status(404).json({ status: "error", message: "Campaign not found" });
      }

      if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const creativeIds = items.map((item: any) => item.creative_id);
      const allBelongToCampaign = await flightCreativesService.validateCreativesBelongToCampaign(
        flight.campaignId,
        creativeIds
      );

      if (!allBelongToCampaign) {
        return res.status(400).json({
          status: "error",
          message: "All creatives must belong to the same campaign as the flight",
        });
      }

      const flightCreatives = await flightCreativesService.addFlightCreatives(flightId, items);
      res.json({ status: "success", data: flightCreatives });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:flightId/creatives/:id",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { flightId, id } = req.params;
      const { weight } = req.body;

      if (typeof weight !== "number" || weight < 0) {
        return res.status(400).json({
          status: "error",
          message: "weight must be a non-negative number",
        });
      }

      const flight = await flightCreativesService.getFlightById(flightId);
      if (!flight) {
        return res.status(404).json({ status: "error", message: "Flight not found" });
      }

      const campaign = await flightCreativesService.getCampaignById(flight.campaignId);
      if (!campaign) {
        return res.status(404).json({ status: "error", message: "Campaign not found" });
      }

      if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const flightCreative = await flightCreativesService.getFlightCreativeById(id);
      if (!flightCreative || flightCreative.flightId !== flightId) {
        return res.status(404).json({
          status: "error",
          message: "Flight creative not found",
        });
      }

      const updated = await flightCreativesService.updateFlightCreativeWeight(id, weight);
      res.json({ status: "success", data: updated });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:flightId/creatives/:id",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { flightId, id } = req.params;

      const flight = await flightCreativesService.getFlightById(flightId);
      if (!flight) {
        return res.status(404).json({ status: "error", message: "Flight not found" });
      }

      const campaign = await flightCreativesService.getCampaignById(flight.campaignId);
      if (!campaign) {
        return res.status(404).json({ status: "error", message: "Campaign not found" });
      }

      if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const flightCreative = await flightCreativesService.getFlightCreativeById(id);
      if (!flightCreative || flightCreative.flightId !== flightId) {
        return res.status(404).json({
          status: "error",
          message: "Flight creative not found",
        });
      }

      await flightCreativesService.deleteFlightCreative(id);
      res.json({ status: "success", message: "Flight creative removed" });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:flightId/creatives",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { flightId } = req.params;
      const { creative_ids } = req.body;

      if (!Array.isArray(creative_ids) || creative_ids.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "creative_ids array is required and must not be empty",
        });
      }

      const flight = await flightCreativesService.getFlightById(flightId);
      if (!flight) {
        return res.status(404).json({ status: "error", message: "Flight not found" });
      }

      const campaign = await flightCreativesService.getCampaignById(flight.campaignId);
      if (!campaign) {
        return res.status(404).json({ status: "error", message: "Campaign not found" });
      }

      if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const remainingCreatives = await flightCreativesService.removeFlightCreatives(flightId, creative_ids);
      res.json({ status: "success", data: remainingCreatives });
    } catch (err) {
      next(err);
    }
  }
);

export { router as flightCreativesRouter };
