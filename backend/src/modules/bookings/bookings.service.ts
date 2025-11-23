// src/modules/bookings/bookings.service.ts
import { db } from "../../db";
import { bookings } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export type BillingModel = "fixed" | "cpm" | "cpd" | "share_of_loop";
export type BookingStatus = "pending" | "active" | "completed" | "cancelled";

export interface CreateBookingInput {
  advertiser_org_id: string;
  campaign_id: string;
  currency: string;
  billing_model: BillingModel;
  rate: number;
  agreed_impressions?: number | null;
  agreed_amount_minor?: number | null;
  start_date: string;
  end_date: string;
}

export async function createBooking(input: CreateBookingInput) {
  const {
    advertiser_org_id,
    campaign_id,
    currency,
    billing_model,
    rate,
    agreed_impressions,
    agreed_amount_minor,
    start_date,
    end_date,
  } = input;

  const result = await db.insert(bookings).values({
    advertiserOrgId: advertiser_org_id,
    campaignId: campaign_id,
    currency,
    billingModel: billing_model,
    rate,
    agreedImpressions: agreed_impressions ?? null,
    agreedAmountMinor: agreed_amount_minor ?? null,
    startDate: start_date,
    endDate: end_date,
    status: "pending",
  }).returning();

  return result[0];
}

export async function getBookingById(id: string) {
  const result = await db.select().from(bookings).where(eq(bookings.id, id));
  return result[0] || null;
}

export async function listBookingsByAdvertiser(advertiserOrgId: string) {
  const result = await db.select()
    .from(bookings)
    .where(eq(bookings.advertiserOrgId, advertiserOrgId))
    .orderBy(desc(bookings.createdAt));
  return result;
}
