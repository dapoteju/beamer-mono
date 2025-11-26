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
  screenGroupMemberships,
} from "../../db/schema";
import { eq, sql, and, desc, gte, lte, asc, inArray, or } from "drizzle-orm";

// --- Compliance Report Types ---

export type ComplianceScreenStatus = "OK" | "NO_DELIVERY" | "OFFLINE";

export interface CampaignComplianceReport {
  campaignId: string;
  startDate: string;
  endDate: string;
  summary: {
    totalScreensScheduled: number;
    screensWithImpressions: number;
    screensWithZeroImpressions: number;
    screensWithoutHeartbeats: number;
    totalImpressions: number;
    activeDays: number;
    daysWithImpressions: number;
    daysWithHeartbeats: number;
  };
  byDay: Array<{
    date: string;
    impressions: number;
    hasActiveFlight: boolean;
    scheduledScreens: number;
    activeScreens: number;
    offlineScreens: number;
  }>;
  byScreen: Array<{
    screenId: string;
    screenName?: string | null;
    screenType?: string | null;
    publisherName?: string | null;
    publisherType?: string | null;
    impressions: number;
    hasHeartbeats: boolean;
    firstImpressionAt?: string | null;
    lastImpressionAt?: string | null;
    status: ComplianceScreenStatus;
  }>;
}

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

export interface CampaignExposureReport {
  campaignId: string;
  startDate: string;
  endDate: string;
  totalImpressions: number;
  totalExposureLocations: number;
  points: Array<{
    lat: number;
    lng: number;
    impressions: number;
  }>;
  byScreen: Array<{
    screenId: string;
    screenName?: string | null;
    screenType?: string | null;
    publisherName?: string | null;
    publisherType?: string | null;
    impressions: number;
    exposureLocations: number;
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

export async function getCampaignExposureReport(
  campaignId: string,
  startDate?: string,
  endDate?: string
): Promise<CampaignExposureReport | null> {
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
    throw new Error("Start date must be before or equal to end date");
  }

  const dateConditions = [
    eq(playEvents.campaignId, campaignId),
    gte(sql`DATE(${playEvents.startedAt})`, effectiveStartDate),
    lte(sql`DATE(${playEvents.startedAt})`, effectiveEndDate),
  ];

  const playEventsResult = await db
    .select({
      id: playEvents.id,
      screenId: playEvents.screenId,
      startedAt: playEvents.startedAt,
    })
    .from(playEvents)
    .where(and(...dateConditions));

  if (playEventsResult.length === 0) {
    return {
      campaignId: campaignData.id,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      totalImpressions: 0,
      totalExposureLocations: 0,
      points: [],
      byScreen: [],
    };
  }

  const screenIds = [...new Set(playEventsResult.map(p => p.screenId))];

  const screensResult = await db
    .select({
      id: screens.id,
      name: screens.name,
      screenType: screens.screenType,
      screenClassification: screens.screenClassification,
      lat: screens.lat,
      lng: screens.lng,
      publisherName: sql<string>`COALESCE(${publisherProfiles.fullName}, ${organisations.name}, 'Unknown')`,
      publisherType: sql<string>`COALESCE(${publisherProfiles.publisherType}::text, ${organisations.type}::text, 'Unknown')`,
    })
    .from(screens)
    .leftJoin(publisherProfiles, eq(screens.publisherId, publisherProfiles.id))
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
    .where(inArray(screens.id, screenIds));

  const screenMap = new Map(screensResult.map(s => [s.id, s]));

  const mobileScreenIds = screensResult
    .filter(s => s.screenClassification === 'vehicle')
    .map(s => s.id);

  let locationHistoryMap = new Map<string, Array<{ lat: number; lng: number; recordedAt: Date }>>();
  
  if (mobileScreenIds.length > 0) {
    const locationHistory = await db
      .select({
        screenId: screenLocationHistory.screenId,
        latitude: screenLocationHistory.latitude,
        longitude: screenLocationHistory.longitude,
        recordedAt: screenLocationHistory.recordedAt,
      })
      .from(screenLocationHistory)
      .where(
        and(
          inArray(screenLocationHistory.screenId, mobileScreenIds),
          gte(screenLocationHistory.recordedAt, new Date(effectiveStartDate)),
          lte(screenLocationHistory.recordedAt, new Date(effectiveEndDate + 'T23:59:59.999Z'))
        )
      )
      .orderBy(asc(screenLocationHistory.recordedAt));

    for (const loc of locationHistory) {
      if (!locationHistoryMap.has(loc.screenId)) {
        locationHistoryMap.set(loc.screenId, []);
      }
      locationHistoryMap.get(loc.screenId)!.push({
        lat: parseFloat(loc.latitude),
        lng: parseFloat(loc.longitude),
        recordedAt: loc.recordedAt,
      });
    }
  }

  const exposurePointsMap = new Map<string, number>();
  const screenExposureMap = new Map<string, { impressions: number; locations: Set<string> }>();

  for (const screenId of screenIds) {
    screenExposureMap.set(screenId, { impressions: 0, locations: new Set() });
  }

  const roundCoord = (val: number, decimals: number = 4): number => {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  };

  for (const event of playEventsResult) {
    const screen = screenMap.get(event.screenId);
    if (!screen) continue;

    const screenExposure = screenExposureMap.get(event.screenId)!;
    screenExposure.impressions++;

    let lat: number | null = null;
    let lng: number | null = null;

    if (screen.screenClassification === 'vehicle') {
      const screenLocations = locationHistoryMap.get(event.screenId);
      if (screenLocations && screenLocations.length > 0 && event.startedAt) {
        const eventTime = event.startedAt.getTime();
        let closestLocation = screenLocations[0];
        let closestDiff = Math.abs(screenLocations[0].recordedAt.getTime() - eventTime);

        for (const loc of screenLocations) {
          const diff = Math.abs(loc.recordedAt.getTime() - eventTime);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestLocation = loc;
          }
          if (diff < 60000) break;
        }

        if (closestDiff <= 3600000) {
          lat = closestLocation.lat;
          lng = closestLocation.lng;
        }
      }
    } else {
      if (screen.lat && screen.lng) {
        lat = parseFloat(screen.lat);
        lng = parseFloat(screen.lng);
      }
    }

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      const roundedLat = roundCoord(lat);
      const roundedLng = roundCoord(lng);
      const key = `${roundedLat},${roundedLng}`;
      
      exposurePointsMap.set(key, (exposurePointsMap.get(key) || 0) + 1);
      screenExposure.locations.add(key);
    }
  }

  const points = Array.from(exposurePointsMap.entries()).map(([key, impressions]) => {
    const [lat, lng] = key.split(',').map(Number);
    return { lat, lng, impressions };
  });

  points.sort((a, b) => b.impressions - a.impressions);

  const byScreen = screenIds.map(screenId => {
    const screen = screenMap.get(screenId);
    const exposure = screenExposureMap.get(screenId)!;
    
    return {
      screenId,
      screenName: screen?.name || null,
      screenType: screen?.screenClassification || screen?.screenType || null,
      publisherName: screen?.publisherName || null,
      publisherType: screen?.publisherType || null,
      impressions: exposure.impressions,
      exposureLocations: exposure.locations.size,
    };
  });

  byScreen.sort((a, b) => b.impressions - a.impressions);

  const totalImpressions = playEventsResult.length;
  const totalExposureLocations = points.length;

  return {
    campaignId: campaignData.id,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    totalImpressions,
    totalExposureLocations,
    points,
    byScreen,
  };
}

export async function getCampaignComplianceReport(
  campaignId: string,
  startDate?: string,
  endDate?: string
): Promise<CampaignComplianceReport | null> {
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
    throw new Error("Start date must be before or equal to end date");
  }

  // Step 1: Find all flights for this campaign that overlap with the date range
  const campaignFlights = await db
    .select()
    .from(flights)
    .where(
      and(
        eq(flights.campaignId, campaignId),
        lte(flights.startDatetime, new Date(effectiveEndDate + 'T23:59:59.999Z')),
        gte(flights.endDatetime, new Date(effectiveStartDate))
      )
    );

  // Step 2: Determine all scheduled screens from flights
  // Flights can target: 'screen' directly, or 'screen_group'
  // Pre-compute a mapping of each flight ID to its resolved screen IDs
  const scheduledScreenIds = new Set<string>();
  const flightToScreens = new Map<string, Set<string>>();
  const screenGroupCache = new Map<string, Set<string>>();

  for (const flight of campaignFlights) {
    const flightScreens = new Set<string>();
    
    if (flight.targetType === 'screen') {
      flightScreens.add(flight.targetId);
      scheduledScreenIds.add(flight.targetId);
    } else if (flight.targetType === 'screen_group') {
      // Get all screens in this group (use cache if available)
      let groupScreenIds = screenGroupCache.get(flight.targetId);
      if (!groupScreenIds) {
        const groupScreens = await db
          .select({ screenId: screenGroupMemberships.screenId })
          .from(screenGroupMemberships)
          .where(eq(screenGroupMemberships.groupId, flight.targetId));
        
        groupScreenIds = new Set<string>();
        for (const gs of groupScreens) {
          groupScreenIds.add(gs.screenId);
        }
        screenGroupCache.set(flight.targetId, groupScreenIds);
      }
      
      for (const screenId of groupScreenIds) {
        flightScreens.add(screenId);
        scheduledScreenIds.add(screenId);
      }
    }
    
    flightToScreens.set(flight.id, flightScreens);
  }

  const scheduledScreenIdsArray = Array.from(scheduledScreenIds);

  // If no screens scheduled, return early with empty report
  if (scheduledScreenIdsArray.length === 0) {
    // Generate byDay with all dates in range
    const byDay: Array<{ date: string; impressions: number; hasActiveFlight: boolean; scheduledScreens: number; activeScreens: number; offlineScreens: number }> = [];
    const current = new Date(effectiveStartDate);
    const end = new Date(effectiveEndDate);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      byDay.push({ date: dateStr, impressions: 0, hasActiveFlight: false, scheduledScreens: 0, activeScreens: 0, offlineScreens: 0 });
      current.setDate(current.getDate() + 1);
    }

    return {
      campaignId: campaignData.id,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      summary: {
        totalScreensScheduled: 0,
        screensWithImpressions: 0,
        screensWithZeroImpressions: 0,
        screensWithoutHeartbeats: 0,
        totalImpressions: 0,
        activeDays: 0,
        daysWithImpressions: 0,
        daysWithHeartbeats: 0,
      },
      byDay,
      byScreen: [],
    };
  }

  // Step 3: Get impressions per screen for this campaign in the date range
  const impressionsByScreenResult = await db
    .select({
      screenId: playEvents.screenId,
      impressions: sql<number>`COUNT(*)::int`,
      firstImpressionAt: sql<string>`MIN(${playEvents.startedAt})::text`,
      lastImpressionAt: sql<string>`MAX(${playEvents.startedAt})::text`,
    })
    .from(playEvents)
    .where(
      and(
        eq(playEvents.campaignId, campaignId),
        inArray(playEvents.screenId, scheduledScreenIdsArray),
        gte(sql`DATE(${playEvents.startedAt})`, effectiveStartDate),
        lte(sql`DATE(${playEvents.startedAt})`, effectiveEndDate)
      )
    )
    .groupBy(playEvents.screenId);

  const impressionsByScreen = new Map(
    impressionsByScreenResult.map(r => [r.screenId, {
      impressions: r.impressions,
      firstImpressionAt: r.firstImpressionAt,
      lastImpressionAt: r.lastImpressionAt,
    }])
  );

  // Step 4: Get impressions per day for this campaign
  const impressionsByDayResult = await db.execute(sql`
    SELECT
      DATE(${playEvents.startedAt}) AS date,
      COUNT(*)::int AS impressions
    FROM ${playEvents}
    WHERE ${playEvents.campaignId} = ${campaignId}
      AND DATE(${playEvents.startedAt}) >= ${effectiveStartDate}
      AND DATE(${playEvents.startedAt}) <= ${effectiveEndDate}
    GROUP BY DATE(${playEvents.startedAt})
    ORDER BY date ASC
  `);

  const impressionsByDay = new Map(
    impressionsByDayResult.rows.map((row: any) => [row.date, row.impressions])
  );

  // Step 5: Get heartbeat status for each scheduled screen in the date range
  const heartbeatsByScreenResult = await db
    .select({
      screenId: heartbeats.screenId,
      hasHeartbeats: sql<boolean>`true`,
    })
    .from(heartbeats)
    .where(
      and(
        inArray(heartbeats.screenId, scheduledScreenIdsArray),
        gte(heartbeats.timestamp, new Date(effectiveStartDate)),
        lte(heartbeats.timestamp, new Date(effectiveEndDate + 'T23:59:59.999Z'))
      )
    )
    .groupBy(heartbeats.screenId);

  const heartbeatsByScreen = new Set(heartbeatsByScreenResult.map(r => r.screenId));

  // Step 5b: Get heartbeats per screen per day for daily compliance tracking
  const heartbeatsByScreenByDayResult = scheduledScreenIdsArray.length > 0 
    ? await db
        .select({
          screenId: heartbeats.screenId,
          date: sql<string>`DATE(${heartbeats.timestamp})::text`,
        })
        .from(heartbeats)
        .where(
          and(
            inArray(heartbeats.screenId, scheduledScreenIdsArray),
            gte(heartbeats.timestamp, new Date(effectiveStartDate)),
            lte(heartbeats.timestamp, new Date(effectiveEndDate + 'T23:59:59.999Z'))
          )
        )
        .groupBy(heartbeats.screenId, sql`DATE(${heartbeats.timestamp})`)
    : [];

  // Build a map of date -> Set<screenId> for screens with heartbeats
  const heartbeatsByDay = new Map<string, Set<string>>();
  for (const row of heartbeatsByScreenByDayResult) {
    const dateStr = row.date;
    if (!heartbeatsByDay.has(dateStr)) {
      heartbeatsByDay.set(dateStr, new Set());
    }
    heartbeatsByDay.get(dateStr)!.add(row.screenId);
  }

  // Step 6: Get screen metadata for all scheduled screens
  const screenMetadataResult = await db
    .select({
      screenId: screens.id,
      screenName: screens.name,
      screenType: screens.screenClassification,
      publisherName: sql<string>`COALESCE(${publisherProfiles.fullName}, ${organisations.name}, 'Unknown')`,
      publisherType: sql<string>`COALESCE(${publisherProfiles.publisherType}::text, ${organisations.type}::text, 'Unknown')`,
    })
    .from(screens)
    .leftJoin(publisherProfiles, eq(screens.publisherId, publisherProfiles.id))
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
    .where(inArray(screens.id, scheduledScreenIdsArray));

  const screenMetadataMap = new Map(
    screenMetadataResult.map(s => [s.screenId, s])
  );

  // Step 7: Build byDay array with hasActiveFlight flag and heartbeat-based metrics
  const byDay: Array<{ date: string; impressions: number; hasActiveFlight: boolean; scheduledScreens: number; activeScreens: number; offlineScreens: number }> = [];
  const current = new Date(effectiveStartDate);
  const end = new Date(effectiveEndDate);
  
  let activeDays = 0;
  let daysWithImpressions = 0;
  let daysWithHeartbeats = 0;

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    const dayStart = new Date(dateStr);
    const dayEnd = new Date(dateStr + 'T23:59:59.999Z');

    // Determine which screens are scheduled for this specific day
    // Use the pre-computed flightToScreens mapping for each active flight
    const scheduledScreensForDay = new Set<string>();
    for (const flight of campaignFlights) {
      const flightStart = new Date(flight.startDatetime);
      const flightEnd = new Date(flight.endDatetime);
      if (flightStart <= dayEnd && flightEnd >= dayStart) {
        // Flight is active on this day - add all its resolved screens
        const flightScreens = flightToScreens.get(flight.id);
        if (flightScreens) {
          for (const screenId of flightScreens) {
            scheduledScreensForDay.add(screenId);
          }
        }
      }
    }

    // Check if any flight is active on this day
    const hasActiveFlight = scheduledScreensForDay.size > 0;
    const scheduledScreensCount = scheduledScreensForDay.size;

    // Get screens with heartbeats on this day
    const screensWithHeartbeatsToday = heartbeatsByDay.get(dateStr) || new Set<string>();
    const activeScreens = [...scheduledScreensForDay].filter(sid => screensWithHeartbeatsToday.has(sid)).length;
    const offlineScreens = scheduledScreensCount - activeScreens;

    const impressions = impressionsByDay.get(dateStr) || 0;
    
    if (hasActiveFlight) activeDays++;
    if (impressions > 0) daysWithImpressions++;
    if (activeScreens > 0) daysWithHeartbeats++;

    byDay.push({
      date: dateStr,
      impressions,
      hasActiveFlight,
      scheduledScreens: scheduledScreensCount,
      activeScreens,
      offlineScreens,
    });

    current.setDate(current.getDate() + 1);
  }

  // Step 8: Build byScreen array with status
  const byScreen: CampaignComplianceReport['byScreen'] = [];
  let totalImpressions = 0;
  let screensWithImpressions = 0;
  let screensWithZeroImpressions = 0;
  let screensWithoutHeartbeats = 0;

  for (const screenId of scheduledScreenIdsArray) {
    const metadata = screenMetadataMap.get(screenId);
    const impressionData = impressionsByScreen.get(screenId);
    const impressions = impressionData?.impressions || 0;
    const hasHeartbeats = heartbeatsByScreen.has(screenId);

    totalImpressions += impressions;

    if (impressions > 0) {
      screensWithImpressions++;
    } else {
      screensWithZeroImpressions++;
    }

    if (!hasHeartbeats) {
      screensWithoutHeartbeats++;
    }

    // Compute status
    let status: ComplianceScreenStatus;
    if (impressions > 0 && hasHeartbeats) {
      status = "OK";
    } else if (impressions === 0 && hasHeartbeats) {
      status = "NO_DELIVERY";
    } else if (impressions === 0 && !hasHeartbeats) {
      status = "OFFLINE";
    } else {
      // impressions > 0 but no heartbeats - treat as OK (player might not send heartbeats)
      status = "OK";
    }

    byScreen.push({
      screenId,
      screenName: metadata?.screenName || null,
      screenType: metadata?.screenType || null,
      publisherName: metadata?.publisherName || null,
      publisherType: metadata?.publisherType || null,
      impressions,
      hasHeartbeats,
      firstImpressionAt: impressionData?.firstImpressionAt || null,
      lastImpressionAt: impressionData?.lastImpressionAt || null,
      status,
    });
  }

  // Sort byScreen: OFFLINE first, then NO_DELIVERY, then OK, then by impressions desc
  const statusPriority: Record<ComplianceScreenStatus, number> = {
    "OFFLINE": 0,
    "NO_DELIVERY": 1,
    "OK": 2,
  };

  byScreen.sort((a, b) => {
    const statusDiff = statusPriority[a.status] - statusPriority[b.status];
    if (statusDiff !== 0) return statusDiff;
    return b.impressions - a.impressions;
  });

  return {
    campaignId: campaignData.id,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    summary: {
      totalScreensScheduled: scheduledScreenIdsArray.length,
      screensWithImpressions,
      screensWithZeroImpressions,
      screensWithoutHeartbeats,
      totalImpressions,
      activeDays,
      daysWithImpressions,
      daysWithHeartbeats,
    },
    byDay,
    byScreen,
  };
}
