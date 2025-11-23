import { db } from "../../db";
import {
  campaigns,
  bookings,
  screens,
  creatives,
  playEvents,
  heartbeats,
  flights,
  creativeApprovals,
  regions,
} from "../../db/schema";
import { eq, sql, and, desc, gte, lte } from "drizzle-orm";

export interface CampaignReport {
  campaign_id: string;
  campaign_name: string;
  total_play_events: number;
  impressions_delivered: number;
  impressions_by_region: Array<{ region: string; impressions: number }>;
  impressions_by_flight: Array<{ flight_id: string; flight_name: string; impressions: number }>;
  compliance_status: Array<{ region: string; resolved_status: string; statuses: Array<{ status: string; count: number }> }>;
  start_date: string;
  end_date: string;
  total_budget: number;
  currency: string;
  status: string;
}

export interface BookingReport {
  booking_id: string;
  campaign_id: string;
  campaign_name: string;
  agreed_impressions: number | null;
  delivered_impressions: number;
  delivery_percentage: number;
  over_under_performance: number;
  by_region: Array<{ region: string; impressions: number }>;
  start_date: string;
  end_date: string;
  status: string;
  billing_model: string;
  rate: number;
  currency: string;
  compliance: Array<{ region: string; resolved_status: string; statuses: Array<{ status: string; count: number }> }>;
}

export interface ScreenReport {
  screen_id: string;
  screen_name: string;
  screen_type: string;
  city: string;
  region_code: string;
  status: string;
  most_recent_heartbeat: string | null;
  active_status: boolean;
  gps_location: { lat: string; lng: string };
  uptime_percentage: number;
  total_impressions: number;
  total_play_events: number;
  last_7_days_impressions: number;
}

export interface CreativeReport {
  creative_id: string;
  creative_name: string;
  campaign_id: string;
  campaign_name: string;
  number_of_plays: number;
  total_duration_played_seconds: number;
  total_duration_played_hours: number;
  delivery_timeline: Array<{ date: string; plays: number; duration_seconds: number }>;
  approval_status_by_region: Array<{ region: string; status: string; approval_code: string | null }>;
  file_url: string;
  mime_type: string;
  width: number;
  height: number;
  duration_seconds: number;
}

function getStatusPriority(status: string): number {
  if (status === 'approved') return 3;
  if (status === 'pending') return 2;
  if (status === 'rejected') return 1;
  return 0;
}

function rollupCompliance(
  complianceResults: Array<{ region: string; status: string }>
): Array<{ region: string; resolved_status: string; statuses: Array<{ status: string; count: number }> }> {
  const regionMap = new Map<string, Map<string, number>>();

  complianceResults.forEach((row) => {
    if (!regionMap.has(row.region)) {
      regionMap.set(row.region, new Map());
    }
    const statusMap = regionMap.get(row.region)!;
    statusMap.set(row.status, (statusMap.get(row.status) || 0) + 1);
  });

  const result: Array<{ region: string; resolved_status: string; statuses: Array<{ status: string; count: number }> }> = [];

  regionMap.forEach((statusMap, region) => {
    let resolvedStatus = '';
    let highestPriority = -1;

    statusMap.forEach((count, status) => {
      const priority = getStatusPriority(status);
      if (priority > highestPriority) {
        highestPriority = priority;
        resolvedStatus = status;
      }
    });

    const statuses: Array<{ status: string; count: number }> = [];
    statusMap.forEach((count, status) => {
      statuses.push({ status, count });
    });

    result.push({
      region,
      resolved_status: resolvedStatus,
      statuses,
    });
  });

  return result;
}

export async function getCampaignReport(
  campaignId: string,
  startDate?: string,
  endDate?: string
): Promise<CampaignReport | null> {
  const campaign = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (campaign.length === 0) {
    return null;
  }

  const campaignData = campaign[0];

  const dateConditions = [];
  if (startDate) {
    dateConditions.push(gte(sql`DATE(${playEvents.startedAt})`, startDate));
  }
  if (endDate) {
    dateConditions.push(lte(sql`DATE(${playEvents.startedAt})`, endDate));
  }

  const playEventsWhere = dateConditions.length > 0
    ? and(eq(playEvents.campaignId, campaignId), ...dateConditions)
    : eq(playEvents.campaignId, campaignId);

  const totalPlayEventsResult = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .where(playEventsWhere);

  const totalPlayEvents = totalPlayEventsResult[0]?.count || 0;

  const impressionsByRegionResult = await db
    .select({
      region: screens.regionCode,
      impressions: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .innerJoin(screens, eq(playEvents.screenId, screens.id))
    .where(playEventsWhere)
    .groupBy(screens.regionCode);

  const flightDateConditions = [];
  if (startDate) {
    flightDateConditions.push(gte(sql`DATE(${playEvents.startedAt})`, startDate));
  }
  if (endDate) {
    flightDateConditions.push(lte(sql`DATE(${playEvents.startedAt})`, endDate));
  }

  const flightWhere = flightDateConditions.length > 0
    ? and(eq(playEvents.campaignId, campaignId), sql`${playEvents.flightId} IS NOT NULL`, ...flightDateConditions)
    : and(eq(playEvents.campaignId, campaignId), sql`${playEvents.flightId} IS NOT NULL`);

  const impressionsByFlightResult = await db
    .select({
      flightId: flights.id,
      flightName: flights.name,
      impressions: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .innerJoin(flights, eq(playEvents.flightId, flights.id))
    .where(flightWhere)
    .groupBy(flights.id, flights.name);

  const complianceStatusResult = await db
    .select({
      region: regions.code,
      status: creativeApprovals.status,
    })
    .from(creatives)
    .innerJoin(creativeApprovals, eq(creatives.id, creativeApprovals.creativeId))
    .innerJoin(regions, eq(creativeApprovals.regionId, regions.id))
    .where(eq(creatives.campaignId, campaignId));

  const complianceStatus = rollupCompliance(complianceStatusResult);

  return {
    campaign_id: campaignData.id,
    campaign_name: campaignData.name,
    total_play_events: totalPlayEvents,
    impressions_delivered: totalPlayEvents,
    impressions_by_region: impressionsByRegionResult.map((r) => ({
      region: r.region,
      impressions: r.impressions,
    })),
    impressions_by_flight: impressionsByFlightResult.map((r) => ({
      flight_id: r.flightId,
      flight_name: r.flightName,
      impressions: r.impressions,
    })),
    compliance_status: complianceStatus,
    start_date: campaignData.startDate,
    end_date: campaignData.endDate,
    total_budget: campaignData.totalBudget,
    currency: campaignData.currency,
    status: campaignData.status,
  };
}

export async function getBookingReport(
  bookingId: string,
  startDate?: string,
  endDate?: string
): Promise<BookingReport | null> {
  const booking = await db
    .select({
      booking: bookings,
      campaign: campaigns,
    })
    .from(bookings)
    .innerJoin(campaigns, eq(bookings.campaignId, campaigns.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (booking.length === 0) {
    return null;
  }

  const bookingData = booking[0].booking;
  const campaignData = booking[0].campaign;

  const effectiveStartDate = startDate || bookingData.startDate;
  const effectiveEndDate = endDate || bookingData.endDate;

  // Temporary: Use campaign-level attribution until booking_flights migration is run
  // After migration, this will use booking_flights junction table for accurate attribution
  const deliveredImpressionsResult = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .where(
      and(
        eq(playEvents.campaignId, campaignData.id),
        gte(sql`DATE(${playEvents.startedAt})`, effectiveStartDate),
        lte(sql`DATE(${playEvents.startedAt})`, effectiveEndDate)
      )
    );

  const deliveredImpressions = deliveredImpressionsResult[0]?.count || 0;

  const agreedImpressions = bookingData.agreedImpressions || 0;
  const deliveryPercentage =
    agreedImpressions > 0 ? (deliveredImpressions / agreedImpressions) * 100 : 0;
  const overUnderPerformance = deliveredImpressions - agreedImpressions;

  // Temporary: Use campaign-level attribution until booking_flights migration is run
  const impressionsByRegionResult = await db
    .select({
      region: screens.regionCode,
      impressions: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .innerJoin(screens, eq(playEvents.screenId, screens.id))
    .where(
      and(
        eq(playEvents.campaignId, campaignData.id),
        gte(sql`DATE(${playEvents.startedAt})`, effectiveStartDate),
        lte(sql`DATE(${playEvents.startedAt})`, effectiveEndDate)
      )
    )
    .groupBy(screens.regionCode);

  const complianceStatusResult = await db
    .select({
      region: regions.code,
      status: creativeApprovals.status,
    })
    .from(creatives)
    .innerJoin(creativeApprovals, eq(creatives.id, creativeApprovals.creativeId))
    .innerJoin(regions, eq(creativeApprovals.regionId, regions.id))
    .where(eq(creatives.campaignId, campaignData.id));

  const compliance = rollupCompliance(complianceStatusResult);

  return {
    booking_id: bookingData.id,
    campaign_id: campaignData.id,
    campaign_name: campaignData.name,
    agreed_impressions: bookingData.agreedImpressions,
    delivered_impressions: deliveredImpressions,
    delivery_percentage: Math.round(deliveryPercentage * 100) / 100,
    over_under_performance: overUnderPerformance,
    by_region: impressionsByRegionResult.map((r) => ({
      region: r.region,
      impressions: r.impressions,
    })),
    start_date: effectiveStartDate,
    end_date: effectiveEndDate,
    status: bookingData.status,
    billing_model: bookingData.billingModel,
    rate: bookingData.rate,
    currency: bookingData.currency,
    compliance,
  };
}

export async function getScreenReport(
  screenId: string,
  startDate?: string,
  endDate?: string
): Promise<ScreenReport | null> {
  const screen = await db
    .select()
    .from(screens)
    .where(eq(screens.id, screenId))
    .limit(1);

  if (screen.length === 0) {
    return null;
  }

  const screenData = screen[0];

  const mostRecentHeartbeatResult = await db
    .select({
      timestamp: heartbeats.timestamp,
    })
    .from(heartbeats)
    .where(eq(heartbeats.screenId, screenId))
    .orderBy(desc(heartbeats.timestamp))
    .limit(1);

  const mostRecentHeartbeat = mostRecentHeartbeatResult[0]?.timestamp || null;

  const activeStatus = mostRecentHeartbeat
    ? new Date().getTime() - new Date(mostRecentHeartbeat).getTime() < 15 * 60 * 1000
    : false;

  const uptimeResult = await db.execute(sql`
    WITH heartbeat_stats AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'online') AS online_count,
        COUNT(*) AS total_count
      FROM ${heartbeats}
      WHERE ${heartbeats.screenId} = ${screenId}
        AND ${heartbeats.timestamp} >= NOW() - INTERVAL '7 days'
    )
    SELECT
      CASE
        WHEN total_count > 0 THEN (online_count::float / total_count * 100)::numeric(5,2)
        ELSE 0
      END AS uptime_percentage
    FROM heartbeat_stats
  `);

  const uptimePercentage = Number(uptimeResult.rows[0]?.uptime_percentage || 0);

  const totalDateConditions = [];
  if (startDate) {
    totalDateConditions.push(gte(sql`DATE(${playEvents.startedAt})`, startDate));
  }
  if (endDate) {
    totalDateConditions.push(lte(sql`DATE(${playEvents.startedAt})`, endDate));
  }

  const totalImpressionsWhere = totalDateConditions.length > 0
    ? and(eq(playEvents.screenId, screenId), ...totalDateConditions)
    : eq(playEvents.screenId, screenId);

  const totalImpressionsResult = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .where(totalImpressionsWhere);

  const totalImpressions = totalImpressionsResult[0]?.count || 0;

  const last7DaysImpressionsResult = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .where(
      and(
        eq(playEvents.screenId, screenId),
        sql`${playEvents.startedAt} >= NOW() - INTERVAL '7 days'`
      )
    );

  const last7DaysImpressions = last7DaysImpressionsResult[0]?.count || 0;

  return {
    screen_id: screenData.id,
    screen_name: screenData.name,
    screen_type: screenData.screenType,
    city: screenData.city,
    region_code: screenData.regionCode,
    status: screenData.status,
    most_recent_heartbeat: mostRecentHeartbeat ? mostRecentHeartbeat.toISOString() : null,
    active_status: activeStatus,
    gps_location: {
      lat: screenData.lat,
      lng: screenData.lng,
    },
    uptime_percentage: uptimePercentage,
    total_impressions: totalImpressions,
    total_play_events: totalImpressions,
    last_7_days_impressions: last7DaysImpressions,
  };
}

export async function getCreativeReport(
  creativeId: string,
  startDate?: string,
  endDate?: string
): Promise<CreativeReport | null> {
  const creative = await db
    .select({
      creative: creatives,
      campaign: campaigns,
    })
    .from(creatives)
    .innerJoin(campaigns, eq(creatives.campaignId, campaigns.id))
    .where(eq(creatives.id, creativeId))
    .limit(1);

  if (creative.length === 0) {
    return null;
  }

  const creativeData = creative[0].creative;
  const campaignData = creative[0].campaign;

  const dateConditions = [];
  if (startDate) {
    dateConditions.push(gte(sql`DATE(${playEvents.startedAt})`, startDate));
  }
  if (endDate) {
    dateConditions.push(lte(sql`DATE(${playEvents.startedAt})`, endDate));
  }

  const playEventsWhere = dateConditions.length > 0
    ? and(eq(playEvents.creativeId, creativeId), ...dateConditions)
    : eq(playEvents.creativeId, creativeId);

  const numberOfPlaysResult = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .where(playEventsWhere);

  const numberOfPlays = numberOfPlaysResult[0]?.count || 0;

  const totalDurationResult = await db
    .select({
      totalDuration: sql<number>`SUM(${playEvents.durationSeconds})::int`,
    })
    .from(playEvents)
    .where(playEventsWhere);

  const totalDurationSeconds = totalDurationResult[0]?.totalDuration || 0;
  const totalDurationHours = Math.round((totalDurationSeconds / 3600) * 100) / 100;

  const timelineConditions = [];
  if (startDate) {
    timelineConditions.push(sql`DATE(${playEvents.startedAt}) >= ${startDate}`);
  }
  if (endDate) {
    timelineConditions.push(sql`DATE(${playEvents.startedAt}) <= ${endDate}`);
  }

  const timelineWhereClause = timelineConditions.length > 0
    ? sql`WHERE ${playEvents.creativeId} = ${creativeId} AND ${sql.join(timelineConditions, sql` AND `)}`
    : sql`WHERE ${playEvents.creativeId} = ${creativeId}`;

  const deliveryTimelineResult = await db.execute(sql`
    SELECT
      DATE(${playEvents.startedAt}) AS date,
      COUNT(*)::int AS plays,
      SUM(${playEvents.durationSeconds})::int AS duration_seconds
    FROM ${playEvents}
    ${timelineWhereClause}
    GROUP BY DATE(${playEvents.startedAt})
    ORDER BY date DESC
    LIMIT 30
  `);

  const deliveryTimeline = deliveryTimelineResult.rows.map((row: any) => ({
    date: row.date,
    plays: row.plays,
    duration_seconds: row.duration_seconds,
  }));

  const approvalStatusResult = await db
    .select({
      region: regions.code,
      status: creativeApprovals.status,
      approvalCode: creativeApprovals.approvalCode,
    })
    .from(creativeApprovals)
    .innerJoin(regions, eq(creativeApprovals.regionId, regions.id))
    .where(eq(creativeApprovals.creativeId, creativeId));

  const approvalStatusByRegion = approvalStatusResult.map((r) => ({
    region: r.region,
    status: r.status,
    approval_code: r.approvalCode,
  }));

  return {
    creative_id: creativeData.id,
    creative_name: creativeData.name,
    campaign_id: campaignData.id,
    campaign_name: campaignData.name,
    number_of_plays: numberOfPlays,
    total_duration_played_seconds: totalDurationSeconds,
    total_duration_played_hours: totalDurationHours,
    delivery_timeline: deliveryTimeline,
    approval_status_by_region: approvalStatusByRegion,
    file_url: creativeData.fileUrl,
    mime_type: creativeData.mimeType,
    width: creativeData.width,
    height: creativeData.height,
    duration_seconds: creativeData.durationSeconds,
  };
}
