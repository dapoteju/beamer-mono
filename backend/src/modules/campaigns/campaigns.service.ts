// src/modules/campaigns/campaigns.service.ts
import { pool } from "../../db";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export interface Campaign {
  id: string;
  advertiser_org_id: string;
  name: string;
  objective?: string | null;
  start_date: string;
  end_date: string;
  total_budget: number;
  currency: string;
  status: CampaignStatus;
  targeting_json: any;
  created_at: string;
}

export async function listCampaigns(orgId: string): Promise<Campaign[]> {
  const result = await pool.query(
    `SELECT * FROM campaigns WHERE advertiser_org_id = $1 ORDER BY created_at DESC`,
    [orgId]
  );
  return result.rows;
}

interface CreateCampaignInput {
  advertiser_org_id: string;
  name: string;
  objective?: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  currency: string;
  targeting?: any;
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const id = crypto.randomUUID();
  const status: CampaignStatus = "draft";

  const result = await pool.query(
    `INSERT INTO campaigns
      (id, advertiser_org_id, name, objective, start_date, end_date,
       total_budget, currency, status, targeting_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      id,
      input.advertiser_org_id,
      input.name,
      input.objective ?? null,
      input.start_date,
      input.end_date,
      input.total_budget,
      input.currency,
      status,
      input.targeting ?? null,
    ]
  );

  return result.rows[0];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const result = await pool.query(
    `SELECT * FROM campaigns WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}
