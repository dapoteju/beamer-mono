// backend/src/modules/advertisers/advertisers.service.ts
import { db } from "../../db/client";
import { organisations, campaigns } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export interface AdvertiserInput {
  name: string;
  billingEmail: string;
  country: string;
}

export interface AdvertiserDetail {
  id: string;
  name: string;
  billingEmail: string;
  country: string;
  createdAt: Date;
  campaignCount: number;
}

export async function listAdvertisers(): Promise<AdvertiserDetail[]> {
  const advertisers = await db
    .select({
      id: organisations.id,
      name: organisations.name,
      billingEmail: organisations.billingEmail,
      country: organisations.country,
      createdAt: organisations.createdAt,
    })
    .from(organisations)
    .where(eq(organisations.organisationCategory, "advertiser"));

  // Get campaign counts
  const enriched = await Promise.all(
    advertisers.map(async (advertiser: typeof advertisers[0]) => {
      const [campaignCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(campaigns)
        .where(eq(campaigns.advertiserOrgId, advertiser.id));

      return {
        id: advertiser.id,
        name: advertiser.name,
        billingEmail: advertiser.billingEmail,
        country: advertiser.country,
        createdAt: advertiser.createdAt,
        campaignCount: Number(campaignCountResult?.count || 0),
      };
    })
  );

  return enriched;
}

export async function getAdvertiser(id: string): Promise<AdvertiserDetail | null> {
  const [advertiser] = await db
    .select({
      id: organisations.id,
      name: organisations.name,
      billingEmail: organisations.billingEmail,
      country: organisations.country,
      createdAt: organisations.createdAt,
    })
    .from(organisations)
    .where(eq(organisations.id, id));

  if (!advertiser) return null;

  // Verify it's an advertiser organisation
  const [org] = await db
    .select({ organisationCategory: organisations.organisationCategory })
    .from(organisations)
    .where(eq(organisations.id, id));

  if (org?.organisationCategory !== "advertiser") return null;

  // Get campaign count
  const [campaignCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaigns)
    .where(eq(campaigns.advertiserOrgId, id));

  return {
    id: advertiser.id,
    name: advertiser.name,
    billingEmail: advertiser.billingEmail,
    country: advertiser.country,
    createdAt: advertiser.createdAt,
    campaignCount: Number(campaignCountResult?.count || 0),
  };
}

export async function createAdvertiser(input: AdvertiserInput): Promise<AdvertiserDetail> {
  const [created] = await db
    .insert(organisations)
    .values({
      name: input.name,
      billingEmail: input.billingEmail,
      country: input.country,
      type: "advertiser", // Legacy field
      organisationCategory: "advertiser", // Phase 3A field
    })
    .returning();

  const detail = await getAdvertiser(created.id);
  if (!detail) {
    throw new Error("Failed to create advertiser");
  }

  return detail;
}

export async function updateAdvertiser(
  id: string,
  input: Partial<AdvertiserInput>
): Promise<AdvertiserDetail> {
  const updateData: any = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.billingEmail !== undefined) updateData.billingEmail = input.billingEmail;
  if (input.country !== undefined) updateData.country = input.country;

  if (Object.keys(updateData).length > 0) {
    await db
      .update(organisations)
      .set(updateData)
      .where(eq(organisations.id, id));
  }

  const detail = await getAdvertiser(id);
  if (!detail) {
    throw new Error("Advertiser not found after update");
  }

  return detail;
}

export async function deleteAdvertiser(id: string): Promise<void> {
  // Phase 3A: Hard delete - FK constraints in DB will prevent deletion if dependencies exist
  // TODO: Consider implementing soft delete or transaction-based dependency check for better UX
  await db.delete(organisations).where(eq(organisations.id, id));
}
