// src/modules/creatives/creatives.controller.ts
import { Request, Response, NextFunction } from "express";
import { createCreative, setCreativeApproval } from "./creatives.service";

export const createCreativeController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { campaignId } = req.params;

    const {
      name,
      file_url,
      mime_type,
      duration_seconds,
      width,
      height,
      regions
    } = req.body;

    if (!name || !file_url || !mime_type || !duration_seconds || !width || !height || !regions) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const creative = await createCreative({
      campaign_id: campaignId,
      name,
      file_url,
      mime_type,
      duration_seconds,
      width,
      height,
      regions
    });

    res.status(201).json(creative);
  } catch (err) {
    next(err);
  }
};

export const updateCreativeApprovalController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      region,
      status,
      approval_code,
      documents,
      rejected_reason,
      approved_by_user_id
    } = req.body;

    if (!region || !status) {
      return res.status(400).json({ message: "region and status are required" });
    }

    await setCreativeApproval({
      creativeId: id,
      regionCode: region,
      status,
      approvalCode: approval_code,
      documents,
      rejectedReason: rejected_reason,
      approvedByUserId: approved_by_user_id
    });

    res.json({ message: "Creative approval updated" });
  } catch (err) {
    next(err);
  }
};
