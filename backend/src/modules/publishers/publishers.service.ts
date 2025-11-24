// backend/src/modules/publishers/publishers.service.ts
import { db } from "../../db/client";
import { publisherProfiles, organisations, screens, vehicles } from "../../db/schema";
import { eq, sql, and, or } from "drizzle-orm";

export interface PublisherProfileInput {
  publisherType: "organisation" | "individual";
  organisationId?: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface PublisherProfileDetail {
  id: string;
  publisherType: "organisation" | "individual";
  organisationId: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  organisation: {
    id: string;
    name: string;
    billingEmail: string;
    country: string;
  } | null;
  screenCount: number;
  vehicleCount: number;
}

export async function listPublisherProfiles(): Promise<PublisherProfileDetail[]> {
  const profiles = await db
    .select({
      id: publisherProfiles.id,
      publisherType: publisherProfiles.publisherType,
      organisationId: publisherProfiles.organisationId,
      fullName: publisherProfiles.fullName,
      phoneNumber: publisherProfiles.phoneNumber,
      email: publisherProfiles.email,
      address: publisherProfiles.address,
      notes: publisherProfiles.notes,
      createdAt: publisherProfiles.createdAt,
      updatedAt: publisherProfiles.updatedAt,
      orgId: organisations.id,
      orgName: organisations.name,
      orgBillingEmail: organisations.billingEmail,
      orgCountry: organisations.country,
    })
    .from(publisherProfiles)
    .leftJoin(organisations, eq(publisherProfiles.organisationId, organisations.id));

  // Get counts for each publisher
  const enriched = await Promise.all(
    profiles.map(async (profile: typeof profiles[0]) => {
      const [screenCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(screens)
        .where(eq(screens.publisherId, profile.id));

      const [vehicleCountResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vehicles)
        .where(
          profile.organisationId
            ? eq(vehicles.publisherOrgId, profile.organisationId)
            : sql`false`
        );

      return {
        id: profile.id,
        publisherType: profile.publisherType,
        organisationId: profile.organisationId,
        fullName: profile.fullName,
        phoneNumber: profile.phoneNumber,
        email: profile.email,
        address: profile.address,
        notes: profile.notes,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        organisation: profile.orgId && profile.orgName && profile.orgBillingEmail && profile.orgCountry
          ? {
              id: profile.orgId,
              name: profile.orgName,
              billingEmail: profile.orgBillingEmail,
              country: profile.orgCountry,
            }
          : null,
        screenCount: Number(screenCountResult?.count || 0),
        vehicleCount: Number(vehicleCountResult?.count || 0),
      };
    })
  );

  return enriched;
}

export async function getPublisherProfile(id: string): Promise<PublisherProfileDetail | null> {
  const [profile] = await db
    .select({
      id: publisherProfiles.id,
      publisherType: publisherProfiles.publisherType,
      organisationId: publisherProfiles.organisationId,
      fullName: publisherProfiles.fullName,
      phoneNumber: publisherProfiles.phoneNumber,
      email: publisherProfiles.email,
      address: publisherProfiles.address,
      notes: publisherProfiles.notes,
      createdAt: publisherProfiles.createdAt,
      updatedAt: publisherProfiles.updatedAt,
      orgId: organisations.id,
      orgName: organisations.name,
      orgBillingEmail: organisations.billingEmail,
      orgCountry: organisations.country,
    })
    .from(publisherProfiles)
    .leftJoin(organisations, eq(publisherProfiles.organisationId, organisations.id))
    .where(eq(publisherProfiles.id, id));

  if (!profile) return null;

  // Get counts
  const [screenCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(screens)
    .where(eq(screens.publisherId, profile.id));

  const [vehicleCountResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(vehicles)
    .where(
      profile.organisationId
        ? eq(vehicles.publisherOrgId, profile.organisationId)
        : sql`false`
    );

  return {
    id: profile.id,
    publisherType: profile.publisherType,
    organisationId: profile.organisationId,
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber,
    email: profile.email,
    address: profile.address,
    notes: profile.notes,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    organisation: profile.orgId && profile.orgName && profile.orgBillingEmail && profile.orgCountry
      ? {
          id: profile.orgId,
          name: profile.orgName,
          billingEmail: profile.orgBillingEmail,
          country: profile.orgCountry,
        }
      : null,
    screenCount: Number(screenCountResult?.count || 0),
    vehicleCount: Number(vehicleCountResult?.count || 0),
  };
}

export async function createPublisherProfile(
  input: PublisherProfileInput
): Promise<PublisherProfileDetail> {
  // Phase 3A: Validate organisationId if provided
  if (input.organisationId) {
    const [org] = await db
      .select({ organisationCategory: organisations.organisationCategory })
      .from(organisations)
      .where(eq(organisations.id, input.organisationId));

    if (!org) {
      throw new Error("Organisation not found");
    }
    if (org.organisationCategory !== "publisher") {
      throw new Error(`Invalid organisation: must be a publisher organisation, found ${org.organisationCategory}`);
    }
  }

  const [created] = await db
    .insert(publisherProfiles)
    .values({
      publisherType: input.publisherType,
      organisationId: input.organisationId || null,
      fullName: input.fullName || null,
      phoneNumber: input.phoneNumber || null,
      email: input.email || null,
      address: input.address || null,
      notes: input.notes || null,
    })
    .returning();

  const detail = await getPublisherProfile(created.id);
  if (!detail) {
    throw new Error("Failed to create publisher profile");
  }

  return detail;
}

export async function updatePublisherProfile(
  id: string,
  input: Partial<PublisherProfileInput>
): Promise<PublisherProfileDetail> {
  // Phase 3A: Validate organisationId if provided
  if (input.organisationId !== undefined && input.organisationId) {
    const [org] = await db
      .select({ organisationCategory: organisations.organisationCategory })
      .from(organisations)
      .where(eq(organisations.id, input.organisationId));

    if (!org) {
      throw new Error("Organisation not found");
    }
    if (org.organisationCategory !== "publisher") {
      throw new Error(`Invalid organisation: must be a publisher organisation, found ${org.organisationCategory}`);
    }
  }

  const updateData: any = { updatedAt: new Date() };

  if (input.publisherType !== undefined) updateData.publisherType = input.publisherType;
  if (input.organisationId !== undefined) updateData.organisationId = input.organisationId || null;
  if (input.fullName !== undefined) updateData.fullName = input.fullName || null;
  if (input.phoneNumber !== undefined) updateData.phoneNumber = input.phoneNumber || null;
  if (input.email !== undefined) updateData.email = input.email || null;
  if (input.address !== undefined) updateData.address = input.address || null;
  if (input.notes !== undefined) updateData.notes = input.notes || null;

  await db
    .update(publisherProfiles)
    .set(updateData)
    .where(eq(publisherProfiles.id, id));

  const detail = await getPublisherProfile(id);
  if (!detail) {
    throw new Error("Publisher profile not found after update");
  }

  return detail;
}

export async function deletePublisherProfile(id: string): Promise<void> {
  await db.delete(publisherProfiles).where(eq(publisherProfiles.id, id));
}

// Get publisher organisations for dropdown (only org-category=publisher)
export async function getPublisherOrganisations(): Promise<Array<{
  id: string;
  name: string;
  billingEmail: string;
  country: string;
}>> {
  return await db
    .select({
      id: organisations.id,
      name: organisations.name,
      billingEmail: organisations.billingEmail,
      country: organisations.country,
    })
    .from(organisations)
    .where(eq(organisations.organisationCategory, "publisher"));
}

export async function getPublisherDropdownOptions(): Promise<Array<{
  id: string;
  label: string;
  publisherType: "organisation" | "individual";
  organisationId: string | null;
}>> {
  const profiles = await db
    .select({
      id: publisherProfiles.id,
      publisherType: publisherProfiles.publisherType,
      organisationId: publisherProfiles.organisationId,
      fullName: publisherProfiles.fullName,
      organisationName: organisations.name,
    })
    .from(publisherProfiles)
    .leftJoin(organisations, eq(publisherProfiles.organisationId, organisations.id));

  return profiles.map((p) => ({
    id: p.id,
    label:
      p.publisherType === "organisation"
        ? `${p.organisationName || "Unknown Org"} (Organisation)`
        : `${p.fullName || "Unknown"} (Individual)`,
    publisherType: p.publisherType,
    organisationId: p.organisationId,
  }));
}
