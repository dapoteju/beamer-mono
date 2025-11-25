import { Router, Response, NextFunction } from "express";
import {
  createCreative,
  setCreativeApproval,
  listCreativesByCampaign,
  getCreativeById,
  updateCreative,
  deleteCreative,
  getCampaignById,
} from "./creatives.service";
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

router.get(
  "/:campaignId/creatives",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!canAccessCampaigns(req)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const { campaignId } = req.params;

      const campaign = await getCampaignById(campaignId);
      if (!campaign) {
        return res.status(404).json({ status: "error", message: "Campaign not found" });
      }

      if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const creativesData = await listCreativesByCampaign(campaignId);

      res.json({
        status: "success",
        data: creativesData,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:campaignId/creatives",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!canAccessCampaigns(req)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const { campaignId } = req.params;

      const campaign = await getCampaignById(campaignId);
      if (!campaign) {
        return res.status(404).json({ status: "error", message: "Campaign not found" });
      }

      if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const {
        name,
        file_url,
        mime_type,
        duration_seconds,
        width,
        height,
        regions_required,
        regions,
      } = req.body;

      if (!name || !file_url || !mime_type || duration_seconds === undefined || !width || !height) {
        return res.status(400).json({
          status: "error",
          message: "Missing required fields: name, file_url, mime_type, duration_seconds, width, height are required",
        });
      }

      const regionsValue = regions_required || regions || [];

      const creative = await createCreative({
        campaign_id: campaignId,
        name,
        file_url,
        mime_type,
        duration_seconds,
        width,
        height,
        regions: regionsValue,
      });

      res.status(201).json({
        status: "success",
        data: creative,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!canAccessCampaigns(req)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const { id } = req.params;

      const existingCreative = await getCreativeById(id);
      if (!existingCreative) {
        return res.status(404).json({ status: "error", message: "Creative not found" });
      }

      const campaign = await getCampaignById(existingCreative.campaign_id);
      if (!campaign) {
        return res.status(404).json({ status: "error", message: "Campaign not found" });
      }

      if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const { name, status, regions_required } = req.body;

      const updatedCreative = await updateCreative(id, {
        name,
        status,
        regions_required,
      });

      res.json({
        status: "success",
        data: updatedCreative,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!canAccessCampaigns(req)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const { id } = req.params;

      const existingCreative = await getCreativeById(id);
      if (!existingCreative) {
        return res.status(404).json({ status: "error", message: "Creative not found" });
      }

      const campaign = await getCampaignById(existingCreative.campaign_id);
      if (!campaign) {
        return res.status(404).json({ status: "error", message: "Campaign not found" });
      }

      if (!canAccessCampaign(req, campaign.advertiserOrgId)) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      await deleteCreative(id);

      res.json({
        status: "success",
        message: "Creative deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/:creativeId/approval",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user || req.user.orgType !== "beamer_internal") {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const { creativeId } = req.params;
      const {
        region,
        status,
        approval_code,
        documents,
        rejected_reason,
        approved_by_user_id,
      } = req.body;

      if (!region || !status) {
        return res.status(400).json({
          status: "error",
          message: "region and status are required",
        });
      }

      await setCreativeApproval({
        creativeId,
        regionCode: region,
        status,
        approvalCode: approval_code,
        documents,
        rejectedReason: rejected_reason,
        approvedByUserId: approved_by_user_id || req.user.userId,
      });

      return res.status(200).json({
        status: "success",
        message: "Creative approval updated successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as creativesRouter };
