import { db } from "../../db/client";
import { flights, flightCreatives } from "../../db/schema";
import { eq } from "drizzle-orm";

export type FlightStatus = "scheduled" | "active" | "paused" | "completed";

export interface CreateFlightInput {
  campaignId: string;
  name: string;
  startDatetime: string;
  endDatetime: string;
  targetType: string;
  targetId: string;
  maxImpressions?: number | null;
  status?: FlightStatus;
}

export interface UpdateFlightInput {
  name?: string;
  startDatetime?: string;
  endDatetime?: string;
  targetType?: string;
  targetId?: string;
  maxImpressions?: number | null;
  status?: FlightStatus;
}

export class FlightsService {
  async createFlight(input: CreateFlightInput) {
    const [flight] = await db
      .insert(flights)
      .values({
        campaignId: input.campaignId,
        name: input.name,
        startDatetime: new Date(input.startDatetime),
        endDatetime: new Date(input.endDatetime),
        targetType: input.targetType,
        targetId: input.targetId,
        maxImpressions: input.maxImpressions ?? null,
        status: input.status ?? "scheduled",
      })
      .returning();

    return flight;
  }

  async listFlightsForCampaign(campaignId: string) {
    return await db.select().from(flights).where(eq(flights.campaignId, campaignId));
  }

  async getFlightById(id: string) {
    const result = await db.select().from(flights).where(eq(flights.id, id)).limit(1);
    return result[0] ?? null;
  }

  async updateFlight(id: string, input: UpdateFlightInput) {
    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.startDatetime !== undefined) updateData.startDatetime = new Date(input.startDatetime);
    if (input.endDatetime !== undefined) updateData.endDatetime = new Date(input.endDatetime);
    if (input.targetType !== undefined) updateData.targetType = input.targetType;
    if (input.targetId !== undefined) updateData.targetId = input.targetId;
    if (input.maxImpressions !== undefined) updateData.maxImpressions = input.maxImpressions;
    if (input.status !== undefined) updateData.status = input.status;

    if (Object.keys(updateData).length === 0) {
      return this.getFlightById(id);
    }

    const [flight] = await db
      .update(flights)
      .set(updateData)
      .where(eq(flights.id, id))
      .returning();

    return flight ?? null;
  }

  async updateFlightStatus(id: string, status: FlightStatus) {
    const [flight] = await db
      .update(flights)
      .set({ status })
      .where(eq(flights.id, id))
      .returning();

    return flight ?? null;
  }

  async attachCreative(flightId: string, creativeId: string, weight: number) {
    const [row] = await db
      .insert(flightCreatives)
      .values({
        flightId,
        creativeId,
        weight,
      })
      .returning();

    return row;
  }
}
