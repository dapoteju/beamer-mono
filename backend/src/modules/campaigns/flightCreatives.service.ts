import { db } from "../../db/client";
import { flightCreatives, flights, creatives, campaigns } from "../../db/schema";
import { eq, and, inArray } from "drizzle-orm";

export interface FlightCreative {
  id: string;
  flightId: string;
  creativeId: string;
  weight: number;
  creative?: {
    id: string;
    name: string;
    fileUrl: string;
    mimeType: string;
    durationSeconds: number;
    width: number;
    height: number;
    status: string;
  };
}

export interface FlightCreativeInput {
  creative_id: string;
  weight: number;
}

export interface FlightForCreative {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  endsAt: string;
  campaignId: string;
  campaignName: string;
}

export class FlightCreativesService {
  async getFlightById(flightId: string) {
    const result = await db.select().from(flights).where(eq(flights.id, flightId)).limit(1);
    return result[0] ?? null;
  }

  async getCampaignById(campaignId: string) {
    const result = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
    return result[0] ?? null;
  }

  async listFlightCreatives(flightId: string): Promise<FlightCreative[]> {
    const results = await db
      .select({
        id: flightCreatives.id,
        flightId: flightCreatives.flightId,
        creativeId: flightCreatives.creativeId,
        weight: flightCreatives.weight,
        creative: {
          id: creatives.id,
          name: creatives.name,
          fileUrl: creatives.fileUrl,
          mimeType: creatives.mimeType,
          durationSeconds: creatives.durationSeconds,
          width: creatives.width,
          height: creatives.height,
          status: creatives.status,
        },
      })
      .from(flightCreatives)
      .leftJoin(creatives, eq(flightCreatives.creativeId, creatives.id))
      .where(eq(flightCreatives.flightId, flightId));

    return results.map((r) => ({
      id: r.id,
      flightId: r.flightId,
      creativeId: r.creativeId,
      weight: r.weight,
      creative: r.creative
        ? {
            id: r.creative.id,
            name: r.creative.name,
            fileUrl: r.creative.fileUrl,
            mimeType: r.creative.mimeType,
            durationSeconds: r.creative.durationSeconds,
            width: r.creative.width,
            height: r.creative.height,
            status: r.creative.status,
          }
        : undefined,
    }));
  }

  async setFlightCreatives(
    flightId: string,
    items: FlightCreativeInput[]
  ): Promise<FlightCreative[]> {
    await db.delete(flightCreatives).where(eq(flightCreatives.flightId, flightId));

    if (items.length === 0) {
      return [];
    }

    const insertValues = items.map((item) => ({
      flightId,
      creativeId: item.creative_id,
      weight: item.weight,
    }));

    await db.insert(flightCreatives).values(insertValues);

    return this.listFlightCreatives(flightId);
  }

  async updateFlightCreativeWeight(
    flightCreativeId: string,
    weight: number
  ): Promise<FlightCreative | null> {
    const [updated] = await db
      .update(flightCreatives)
      .set({ weight })
      .where(eq(flightCreatives.id, flightCreativeId))
      .returning();

    if (!updated) return null;

    const results = await db
      .select({
        id: flightCreatives.id,
        flightId: flightCreatives.flightId,
        creativeId: flightCreatives.creativeId,
        weight: flightCreatives.weight,
        creative: {
          id: creatives.id,
          name: creatives.name,
          fileUrl: creatives.fileUrl,
          mimeType: creatives.mimeType,
          durationSeconds: creatives.durationSeconds,
          width: creatives.width,
          height: creatives.height,
          status: creatives.status,
        },
      })
      .from(flightCreatives)
      .leftJoin(creatives, eq(flightCreatives.creativeId, creatives.id))
      .where(eq(flightCreatives.id, flightCreativeId))
      .limit(1);

    const r = results[0];
    if (!r) return null;

    return {
      id: r.id,
      flightId: r.flightId,
      creativeId: r.creativeId,
      weight: r.weight,
      creative: r.creative
        ? {
            id: r.creative.id,
            name: r.creative.name,
            fileUrl: r.creative.fileUrl,
            mimeType: r.creative.mimeType,
            durationSeconds: r.creative.durationSeconds,
            width: r.creative.width,
            height: r.creative.height,
            status: r.creative.status,
          }
        : undefined,
    };
  }

  async deleteFlightCreative(flightCreativeId: string): Promise<boolean> {
    const result = await db
      .delete(flightCreatives)
      .where(eq(flightCreatives.id, flightCreativeId))
      .returning();

    return result.length > 0;
  }

  async getFlightCreativeById(flightCreativeId: string) {
    const result = await db
      .select()
      .from(flightCreatives)
      .where(eq(flightCreatives.id, flightCreativeId))
      .limit(1);

    return result[0] ?? null;
  }

  async validateCreativesBelongToCampaign(
    campaignId: string,
    creativeIds: string[]
  ): Promise<boolean> {
    if (creativeIds.length === 0) return true;

    const found = await db
      .select({ id: creatives.id })
      .from(creatives)
      .where(
        and(
          eq(creatives.campaignId, campaignId),
          inArray(creatives.id, creativeIds)
        )
      );

    return found.length === creativeIds.length;
  }

  async addFlightCreatives(
    flightId: string,
    items: FlightCreativeInput[]
  ): Promise<FlightCreative[]> {
    if (items.length === 0) {
      return this.listFlightCreatives(flightId);
    }

    const existingCreatives = await db
      .select({ creativeId: flightCreatives.creativeId })
      .from(flightCreatives)
      .where(eq(flightCreatives.flightId, flightId));

    const existingCreativeIds = new Set(existingCreatives.map((c) => c.creativeId));

    const newItems = items.filter((item) => !existingCreativeIds.has(item.creative_id));

    if (newItems.length > 0) {
      const insertValues = newItems.map((item) => ({
        flightId,
        creativeId: item.creative_id,
        weight: item.weight,
      }));

      await db.insert(flightCreatives).values(insertValues);
    }

    return this.listFlightCreatives(flightId);
  }

  async removeFlightCreatives(
    flightId: string,
    creativeIds: string[]
  ): Promise<FlightCreative[]> {
    if (creativeIds.length === 0) {
      return this.listFlightCreatives(flightId);
    }

    await db
      .delete(flightCreatives)
      .where(
        and(
          eq(flightCreatives.flightId, flightId),
          inArray(flightCreatives.creativeId, creativeIds)
        )
      );

    return this.listFlightCreatives(flightId);
  }

  async getFlightsForCreative(creativeId: string): Promise<FlightForCreative[]> {
    const results = await db
      .select({
        id: flights.id,
        name: flights.name,
        status: flights.status,
        startsAt: flights.startDatetime,
        endsAt: flights.endDatetime,
        campaignId: flights.campaignId,
        campaignName: campaigns.name,
      })
      .from(flightCreatives)
      .innerJoin(flights, eq(flightCreatives.flightId, flights.id))
      .innerJoin(campaigns, eq(flights.campaignId, campaigns.id))
      .where(eq(flightCreatives.creativeId, creativeId));

    return results.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      startsAt: r.startsAt.toISOString(),
      endsAt: r.endsAt.toISOString(),
      campaignId: r.campaignId,
      campaignName: r.campaignName,
    }));
  }

  async getCreativeById(creativeId: string) {
    const result = await db.select().from(creatives).where(eq(creatives.id, creativeId)).limit(1);
    return result[0] ?? null;
  }
}
