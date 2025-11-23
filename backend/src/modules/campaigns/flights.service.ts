import { db } from "../../db";
import { flights, flightCreatives } from "../../db/schema";
import { eq } from "drizzle-orm";

export class FlightsService {
  async createFlight(input: any) {
    const [flight] = await db
      .insert(flights)
      .values({
        campaignId: input.campaignId,
        name: input.name,
        startDatetime: new Date(input.start_datetime),
        endDatetime: new Date(input.end_datetime),
        targetType: input.target_type,
        targetId: input.target_id,
        maxImpressions: input.max_impressions ?? null,
        status: "scheduled",
      })
      .returning();

    return flight;
  }

  async listFlightsForCampaign(campaignId: string) {
    return await db.select().from(flights).where(eq(flights.campaignId, campaignId));
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
