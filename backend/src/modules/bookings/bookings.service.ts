// src/modules/bookings/bookings.service.ts
import { db } from "../../db/client";
import { bookings } from "../../db/schema";
import { eq, desc, and } from "drizzle-orm";

export type BillingModel = "fixed" | "cpm" | "cpd" | "share_of_loop";
export type BookingStatus = "pending" | "active" | "completed" | "cancelled";

export interface CreateBookingInput {
  advertiserOrgId: string;
  campaignId: string;
  currency: string;
  billingModel: BillingModel;
  rate: number;
  agreedImpressions?: number | null;
  agreedAmountMinor?: number | null;
  startDate: string;
  endDate: string;
  status?: BookingStatus;
}

export interface UpdateBookingInput {
  billingModel?: BillingModel;
  rate?: number;
  agreedImpressions?: number | null;
  agreedAmountMinor?: number | null;
  currency?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
}

export interface ListBookingsFilters {
  advertiserOrgId?: string;
  campaignId?: string;
}

export async function createBooking(input: CreateBookingInput) {
  const result = await db.insert(bookings).values({
    advertiserOrgId: input.advertiserOrgId,
    campaignId: input.campaignId,
    currency: input.currency,
    billingModel: input.billingModel,
    rate: input.rate,
    agreedImpressions: input.agreedImpressions ?? null,
    agreedAmountMinor: input.agreedAmountMinor ?? null,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status ?? "pending",
  }).returning();

  return result[0];
}

export async function getBookingById(id: string) {
  const result = await db.select().from(bookings).where(eq(bookings.id, id));
  return result[0] || null;
}

export async function listBookings(filters: ListBookingsFilters) {
  const conditions = [];

  if (filters.advertiserOrgId) {
    conditions.push(eq(bookings.advertiserOrgId, filters.advertiserOrgId));
  }

  if (filters.campaignId) {
    conditions.push(eq(bookings.campaignId, filters.campaignId));
  }

  const query = db.select().from(bookings);

  const result = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(bookings.createdAt))
    : await query.orderBy(desc(bookings.createdAt));

  return result;
}

export async function updateBooking(id: string, input: UpdateBookingInput) {
  const updateData: any = {};

  if (input.billingModel !== undefined) updateData.billingModel = input.billingModel;
  if (input.rate !== undefined) updateData.rate = input.rate;
  if (input.agreedImpressions !== undefined) updateData.agreedImpressions = input.agreedImpressions;
  if (input.agreedAmountMinor !== undefined) updateData.agreedAmountMinor = input.agreedAmountMinor;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.startDate !== undefined) updateData.startDate = input.startDate;
  if (input.endDate !== undefined) updateData.endDate = input.endDate;
  if (input.status !== undefined) updateData.status = input.status;

  if (Object.keys(updateData).length === 0) {
    return getBookingById(id);
  }

  const [booking] = await db
    .update(bookings)
    .set(updateData)
    .where(eq(bookings.id, id))
    .returning();

  return booking ?? null;
}
