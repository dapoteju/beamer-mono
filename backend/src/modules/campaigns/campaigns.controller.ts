// src/modules/campaigns/campaigns.controller.ts
import { Request, Response, NextFunction } from "express";
import {
  listCampaigns,
  createCampaign,
  getCampaignById
} from "./campaigns.service";

export const getCampaignsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orgId = req.query.orgId as string;
    if (!orgId) {
      return res.status(400).json({ message: "orgId query param is required" });
    }
    const campaigns = await listCampaigns(orgId);
    res.json(campaigns);
  } catch (err) {
    next(err);
  }
};

export const getCampaignByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.json(campaign);
  } catch (err) {
    next(err);
  }
};

export const createCampaignController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      advertiser_org_id,
      name,
      objective,
      start_date,
      end_date,
      total_budget,
      currency,
      targeting
    } = req.body;

    if (!advertiser_org_id || !name || !start_date || !end_date || !total_budget || !currency) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const campaign = await createCampaign({
      advertiser_org_id,
      name,
      objective,
      start_date,
      end_date,
      total_budget,
      currency,
      targeting
    });

    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
};
