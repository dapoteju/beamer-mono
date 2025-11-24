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
  publisherProfiles,
  organisations,
  screenLocationHistory,
} from "../../db/schema";
import { eq, sql, and, desc, gte, lte, asc, inArray } from "drizzle-orm";

export interface CampaignReport {
  campaignId: string;
  startDate: string;
  endDate: string;
  totalImpressions: number;
  byScreen: Array<{ 
    screenId: string; 
    screenName?: string; 
    screenType?: string;
    screenClassification?: string;
    publisherName?: string;
    publisherType?: string;
    impressions: number;
  }>;
  byDay: Array<{ date: string; impressions: number }>;
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

  // Ensure we always have valid date strings
  const effectiveStartDate = startDate || campaignData.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const effectiveEndDate = endDate || campaignData.endDate || new Date().toISOString().split('T')[0];

  const dateConditions = [];
  if (effectiveStartDate) {
    dateConditions.push(gte(sql`DATE(${playEvents.startedAt})`, effectiveStartDate));
  }
  if (effectiveEndDate) {
    dateConditions.push(lte(sql`DATE(${playEvents.startedAt})`, effectiveEndDate));
  }

  const playEventsWhere = dateConditions.length > 0
    ? and(eq(playEvents.campaignId, campaignId), ...dateConditions)
    : eq(playEvents.campaignId, campaignId);

  const totalImpressionsResult = await db
    .select({
      count: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .where(playEventsWhere);

  const totalImpressions = totalImpressionsResult[0]?.count || 0;

  const impressionsByScreenResult = await db
    .select({
      screenId: screens.id,
      screenName: screens.name,
      screenType: screens.screenType,
      screenClassification: screens.screenClassification,
      publisherName: sql<string>`COALESCE(${publisherProfiles.fullName}, ${organisations.name}, 'Unknown')`,
      publisherType: sql<string>`COALESCE(${publisherProfiles.publisherType}::text, ${organisations.type}::text, 'Unknown')`,
      impressions: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .innerJoin(screens, eq(playEvents.screenId, screens.id))
    .leftJoin(publisherProfiles, eq(screens.publisherId, publisherProfiles.id))
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
    .where(playEventsWhere)
    .groupBy(
      screens.id, 
      screens.name, 
      screens.screenType, 
      screens.screenClassification,
      publisherProfiles.fullName,
      publisherProfiles.publisherType,
      organisations.name,
      organisations.type
    );

  const impressionsByDayResult = await db.execute(sql`
    SELECT
      DATE(${playEvents.startedAt}) AS date,
      COUNT(*)::int AS impressions
    FROM ${playEvents}
    WHERE ${playEvents.campaignId} = ${campaignId}
      ${effectiveStartDate ? sql`AND DATE(${playEvents.startedAt}) >= ${effectiveStartDate}` : sql``}
      ${effectiveEndDate ? sql`AND DATE(${playEvents.startedAt}) <= ${effectiveEndDate}` : sql``}
    GROUP BY DATE(${playEvents.startedAt})
    ORDER BY date ASC
  `);

  return {
    campaignId: campaignData.id,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    totalImpressions,
    byScreen: impressionsByScreenResult.map((r) => ({
      screenId: r.screenId,
      screenName: r.screenName || undefined,
      screenType: r.screenType || undefined,
      screenClassification: r.screenClassification || undefined,
      publisherName: r.publisherName || undefined,
      publisherType: r.publisherType || undefined,
      impressions: r.impressions,
    })),
    byDay: impressionsByDayResult.rows.map((row: any) => ({
      date: row.date,
      impressions: row.impressions,
    })),
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
    screen_name: screenData.name || screenData.code || 'Unknown', // Phase 3B: Name is optional, fallback to code
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

export interface CampaignMobilityReport {
  campaignId: string;
  startDate: string;
  endDate: string;
  screens: Array<{
    screenId: string;
    screenName?: string | null;
    screenType?: string | null;
    screenClassification?: string | null;
    publisherName?: string | null;
    publisherType?: string | null;
    points: Array<{
      lat: number;
      lng: number;
      recordedAt: string;
    }>;
  }>;
}

export async function getCampaignMobilityReport(
  campaignId: string,
  startDate?: string,
  endDate?: string
): Promise<CampaignMobilityReport | null> {
  const campaign = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  if (campaign.length === 0) {
    return null;
  }

  const campaignData = campaign[0];

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let effectiveStartDate = startDate || campaignData.startDate || thirtyDaysAgo;
  let effectiveEndDate = endDate || campaignData.endDate || today;

  const startDateObj = new Date(effectiveStartDate);
  const endDateObj = new Date(effectiveEndDate);
  
  if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    throw new Error("Invalid date format provided");
  }

  if (startDateObj > endDateObj) {
    effectiveStartDate = effectiveEndDate;
    effectiveEndDate = startDate || campaignData.startDate || thirtyDaysAgo;
    if (new Date(effectiveStartDate) > new Date(effectiveEndDate)) {
      effectiveEndDate = effectiveStartDate;
    }
  }

  const campaignScreensResult = await db
    .selectDistinct({ screenId: playEvents.screenId })
    .from(playEvents)
    .where(eq(playEvents.campaignId, campaignId));

  const campaignScreenIds = campaignScreensResult.map(r => r.screenId);

  if (campaignScreenIds.length === 0) {
    return {
      campaignId: campaignData.id,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      screens: [],
    };
  }

  const locationHistoryResult = await db
    .select({
      screenId: screenLocationHistory.screenId,
      latitude: screenLocationHistory.latitude,
      longitude: screenLocationHistory.longitude,
      recordedAt: screenLocationHistory.recordedAt,
    })
    .from(screenLocationHistory)
    .where(
      and(
        inArray(screenLocationHistory.screenId, campaignScreenIds),
        gte(screenLocationHistory.recordedAt, new Date(effectiveStartDate)),
        lte(screenLocationHistory.recordedAt, new Date(effectiveEndDate + 'T23:59:59.999Z'))
      )
    )
    .orderBy(asc(screenLocationHistory.recordedAt));

  const screenIdsWithHistory = [...new Set(locationHistoryResult.map(r => r.screenId))];

  if (screenIdsWithHistory.length === 0) {
    return {
      campaignId: campaignData.id,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      screens: [],
    };
  }

  const screenMetadataResult = await db
    .select({
      screenId: screens.id,
      screenName: screens.name,
      screenType: screens.screenType,
      screenClassification: screens.screenClassification,
      publisherName: sql<string>`COALESCE(${publisherProfiles.fullName}, ${organisations.name}, 'Unknown')`,
      publisherType: sql<string>`COALESCE(${publisherProfiles.publisherType}::text, ${organisations.type}::text, 'Unknown')`,
    })
    .from(screens)
    .leftJoin(publisherProfiles, eq(screens.publisherId, publisherProfiles.id))
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
    .where(inArray(screens.id, screenIdsWithHistory));

  const screenMetadataMap = new Map(
    screenMetadataResult.map(s => [s.screenId, s])
  );

  const pointsByScreen = new Map<string, Array<{ lat: number; lng: number; recordedAt: string }>>();
  
  for (const row of locationHistoryResult) {
    const screenId = row.screenId;
    if (!pointsByScreen.has(screenId)) {
      pointsByScreen.set(screenId, []);
    }
    pointsByScreen.get(screenId)!.push({
      lat: parseFloat(row.latitude),
      lng: parseFloat(row.longitude),
      recordedAt: row.recordedAt.toISOString(),
    });
  }

  const screensWithMobility = screenIdsWithHistory.map(screenId => {
    const metadata = screenMetadataMap.get(screenId);
    const points = pointsByScreen.get(screenId) || [];
    const screenClassification = metadata?.screenClassification || metadata?.screenType || null;
    
    return {
      screenId,
      screenName: metadata?.screenName || null,
      screenType: screenClassification,
      screenClassification: screenClassification,
      publisherName: metadata?.publisherName || null,
      publisherType: metadata?.publisherType || null,
      points,
    };
  });

  screensWithMobility.sort((a, b) => b.points.length - a.points.length);

  return {
    campaignId: campaignData.id,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    screens: screensWithMobility,
  };
}
