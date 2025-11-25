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
    const campaigns = await listCampaigns({ advertiserOrgId: orgId });
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
      advertiserOrgId,
      name,
      objective,
      startDate,
      endDate,
      totalBudget,
      currency,
      targetingJson
    } = req.body;

    if (!advertiserOrgId || !name || !startDate || !endDate || !totalBudget || !currency) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const campaign = await createCampaign({
      advertiserOrgId,
      name,
      objective,
      startDate,
      endDate,
      totalBudget,
      currency,
      targetingJson
    });

    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
};
