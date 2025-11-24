// src/modules/campaigns/campaigns.service.ts
import { db } from "../../db/client";
import { campaigns, flights, playEvents } from "../../db/schema";
import { eq, desc, and, gte, lte, sql, or, ilike } from "drizzle-orm";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export interface Campaign {
  id: string;
  advertiserOrgId: string;
  name: string;
  objective?: string | null;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status: CampaignStatus;
  targetingJson: any;
  createdAt: Date;
}

export interface ListCampaignsFilters {
  advertiserOrgId?: string;
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface CreateCampaignInput {
  advertiserOrgId: string;
  name: string;
  objective?: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status?: CampaignStatus;
  targetingJson?: any;
}

export interface UpdateCampaignInput {
  name?: string;
  objective?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  currency?: string;
  status?: CampaignStatus;
  targetingJson?: any;
}

export async function listCampaigns(filters: ListCampaignsFilters) {
  const conditions = [];

  if (filters.advertiserOrgId) {
    conditions.push(eq(campaigns.advertiserOrgId, filters.advertiserOrgId));
  }

  if (filters.status) {
    conditions.push(eq(campaigns.status, filters.status));
  }

  if (filters.from) {
    conditions.push(gte(campaigns.startDate, filters.from));
  }

  if (filters.to) {
    conditions.push(lte(campaigns.endDate, filters.to));
  }

  if (filters.search) {
    conditions.push(ilike(campaigns.name, `%${filters.search}%`));
  }

  const query = db.select().from(campaigns);

  const result = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(campaigns.createdAt))
    : await query.orderBy(desc(campaigns.createdAt));

  return result;
}

export async function createCampaign(input: CreateCampaignInput) {
  const [campaign] = await db
    .insert(campaigns)
    .values({
      id: crypto.randomUUID(),
      advertiserOrgId: input.advertiserOrgId,
      name: input.name,
      objective: input.objective ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      totalBudget: input.totalBudget,
      currency: input.currency,
      status: input.status ?? "draft",
      targetingJson: input.targetingJson ?? null,
    })
    .returning();

  return campaign;
}

export async function getCampaignById(id: string) {
  const result = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function getCampaignWithStats(campaignId: string) {
  const campaign = await getCampaignById(campaignId);
  
  if (!campaign) {
    return null;
  }

  const campaignFlights = await db
    .select()
    .from(flights)
    .where(eq(flights.campaignId, campaignId));

  const totalImpressionsResult = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .where(eq(playEvents.campaignId, campaignId));

  const totalImpressions = totalImpressionsResult[0]?.count || 0;

  return {
    ...campaign,
    flights: campaignFlights,
    stats: {
      totalImpressions,
    },
  };
}

export async function updateCampaign(id: string, input: UpdateCampaignInput) {
  const updateData: any = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.objective !== undefined) updateData.objective = input.objective;
  if (input.startDate !== undefined) updateData.startDate = input.startDate;
  if (input.endDate !== undefined) updateData.endDate = input.endDate;
  if (input.totalBudget !== undefined) updateData.totalBudget = input.totalBudget;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.targetingJson !== undefined) updateData.targetingJson = input.targetingJson;

  if (Object.keys(updateData).length === 0) {
    return getCampaignById(id);
  }

  const [campaign] = await db
    .update(campaigns)
    .set(updateData)
    .where(eq(campaigns.id, id))
    .returning();

  return campaign ?? null;
}

export async function updateCampaignStatus(id: string, status: CampaignStatus) {
  const [campaign] = await db
    .update(campaigns)
    .set({ status })
    .where(eq(campaigns.id, id))
    .returning();

  return campaign ?? null;
}
