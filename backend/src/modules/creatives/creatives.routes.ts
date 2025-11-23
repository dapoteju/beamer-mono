// src/modules/creatives/creatives.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import { createCreative, setCreativeApproval } from "./creatives.service";

const router = Router();

// ------------------------------
// CREATE CREATIVE
// POST /api/campaigns/:campaignId/creatives
// ------------------------------
router.post("/:campaignId/creatives", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { campaignId } = req.params;
    const {
      name,
      file_url,
      mime_type,
      duration_seconds,
      width,
      height,
      regions,
    } = req.body;

    const creative = await createCreative({
      campaign_id: campaignId,
      name,
      file_url,
      mime_type,
      duration_seconds,
      width,
      height,
      regions,
    });

    res.status(201).json({
      status: "success",
      data: creative,
    });
  } catch (err) {
    next(err);
  }
});


// ------------------------------
// UPDATE CREATIVE APPROVAL
// POST /api/creatives/:creativeId/approval
// ------------------------------
router.post("/:creativeId/approval", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { creativeId } = req.params;
    const {
      region,
      status,
      approval_code,
      documents,
      rejected_reason,
      approved_by_user_id
    } = req.body;

    await setCreativeApproval({
      creativeId,
      regionCode: region,
      status,
      approvalCode: approval_code,
      documents,
      rejectedReason: rejected_reason,
      approvedByUserId: approved_by_user_id,
    });

    return res.status(200).json({
      status: "success",
      message: "Creative approval updated successfully"
    });

  } catch (err) {
    next(err);
  }
});

export { router as creativesRouter };
