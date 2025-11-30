// src/modules/screens/screens.service.ts
import { db } from "../../db/client";
import { pool } from "../../db";
import { screens, organisations, players, heartbeats, playEvents, creatives, campaigns, regions, vehicles, publisherProfiles, screenLocationHistory, flights, flightCreatives } from "../../db/schema";
import { eq, desc, and, gte, sql, isNull } from "drizzle-orm";

// Phase 3B: Screen code generation helper
async function generateScreenCode(): Promise<string> {
  // Query the max numeric part of existing codes
  const [result] = await db
    .select({ maxCode: sql<string>`MAX(code)` })
    .from(screens);

  const maxCode = result?.maxCode;
  
  if (!maxCode || !maxCode.startsWith('SCR-')) {
    return 'SCR-00001';
  }
  
  // Extract numeric part and increment
  const numericPart = parseInt(maxCode.substring(4), 10);
  const nextNumber = numericPart + 1;
  
  // Zero-pad to 5 digits
  return `SCR-${nextNumber.toString().padStart(5, '0')}`;
}

export async function listScreens(filters?: {
  publisherOrgId?: string;
  regionCode?: string;
  status?: string;
}) {
  const conditions = [];

  if (filters?.publisherOrgId) {
    conditions.push(eq(screens.publisherOrgId, filters.publisherOrgId));
  }
  if (filters?.regionCode) {
    conditions.push(eq(screens.regionCode, filters.regionCode));
  }
  if (filters?.status) {
    conditions.push(eq(screens.status, filters.status as any));
  }

  const query = db
    .select({
      id: screens.id,
      code: screens.code, // Phase 3B: Screen code
      name: screens.name,
      city: screens.city,
      regionCode: screens.regionCode,
      status: screens.status,
      publisherOrgId: screens.publisherOrgId,
      publisherOrgName: organisations.name,
    })
    .from(screens)
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id));

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

export async function listScreensWithPlayerInfo(filters?: {
  publisherOrgId?: string;
  regionCode?: string;
  status?: string;
}) {
  const conditions = [];

  if (filters?.publisherOrgId) {
    conditions.push(eq(screens.publisherOrgId, filters.publisherOrgId));
  }
  if (filters?.regionCode) {
    conditions.push(eq(screens.regionCode, filters.regionCode));
  }
  if (filters?.status) {
    conditions.push(eq(screens.status, filters.status as any));
  }

  const query = db
    .select({
      id: screens.id,
      code: screens.code, // Phase 3B: Screen code
      name: screens.name,
      city: screens.city,
      regionCode: screens.regionCode,
      status: screens.status,
      publisherOrgId: screens.publisherOrgId,
      publisherOrgName: organisations.name,
      playerId: players.id,
      lastHeartbeatAt: sql<Date | null>`(
        SELECT MAX(h.timestamp) 
        FROM ${heartbeats} h 
        WHERE h.screen_id = ${screens.id}
      )`,
      // Phase 3A: Publisher profile data
      publisherId: screens.publisherId,
      publisherProfileId: publisherProfiles.id,
      publisherType: publisherProfiles.publisherType,
      publisherFullName: publisherProfiles.fullName,
      publisherPhone: publisherProfiles.phoneNumber,
      publisherEmail: publisherProfiles.email,
      publisherOrganisationId: publisherProfiles.organisationId,
      // Phase 1: Extended metadata (nullable fields)
      screenClassification: screens.screenClassification,
      vehicleId: screens.vehicleId,
      structureType: screens.structureType,
      sizeDescription: screens.sizeDescription,
      illuminationType: screens.illuminationType,
      address: screens.address,
      venueName: screens.venueName,
      venueType: screens.venueType,
      venueAddress: screens.venueAddress,
      latitude: screens.latitude,
      longitude: screens.longitude,
      // Phase 3B: Last seen timestamp for vehicle screens
      lastSeenAt: screens.lastSeenAt,
      // Vehicle data (joined)
      vehicle: {
        id: vehicles.id,
        name: vehicles.name,
        licensePlate: vehicles.licensePlate,
        makeModel: vehicles.makeModel,
        externalId: vehicles.externalId,
        city: vehicles.city,
        region: vehicles.region,
        isActive: vehicles.isActive,
      },
    })
    .from(screens)
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
    .leftJoin(players, and(eq(players.screenId, screens.id), eq(players.isActive, true)))
    .leftJoin(vehicles, eq(screens.vehicleId, vehicles.id))
    .leftJoin(publisherProfiles, eq(screens.publisherId, publisherProfiles.id));

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

export async function createScreen(input: {
  publisherOrgId: string;
  publisherId?: string; // Phase 3A
  name?: string; // Phase 3B: Name is now optional (code is the primary identifier)
  screenType: string;
  resolutionWidth: number;
  resolutionHeight: number;
  city: string;
  regionCode: string;
  lat: string;
  lng: string;
}) {
  // Phase 3B: Auto-generate screen code
  const code = await generateScreenCode();
  
  const [created] = await db
    .insert(screens)
    .values({
      code, // Phase 3B: Auto-generated code
      publisherOrgId: input.publisherOrgId,
      publisherId: input.publisherId || null, // Phase 3A
      name: input.name || null, // Phase 3B: Name is optional
      screenType: input.screenType,
      resolutionWidth: input.resolutionWidth,
      resolutionHeight: input.resolutionHeight,
      city: input.city,
      regionCode: input.regionCode,
      lat: input.lat,
      lng: input.lng,
    })
    .returning();

  return created;
}

export async function getScreen(id: string) {
  const [row] = await db.select().from(screens).where(eq(screens.id, id));
  return row ?? null;
}

export async function getScreenDetail(screenId: string) {
  const [screen] = await db
    .select({
      id: screens.id,
      name: screens.name,
      city: screens.city,
      regionCode: screens.regionCode,
      status: screens.status,
      publisherOrgId: screens.publisherOrgId,
      publisherOrgName: organisations.name,
      screenType: screens.screenType,
      resolutionWidth: screens.resolutionWidth,
      resolutionHeight: screens.resolutionHeight,
      lat: screens.lat,
      lng: screens.lng,
      // Phase 1: Extended metadata (nullable fields)
      screenClassification: screens.screenClassification,
      vehicleId: screens.vehicleId,
      structureType: screens.structureType,
      sizeDescription: screens.sizeDescription,
      illuminationType: screens.illuminationType,
      address: screens.address,
      venueName: screens.venueName,
      venueType: screens.venueType,
      venueAddress: screens.venueAddress,
      latitude: screens.latitude,
      longitude: screens.longitude,
      // Vehicle data (joined)
      vehicle: {
        id: vehicles.id,
        name: vehicles.name,
        externalId: vehicles.externalId,
        licensePlate: vehicles.licensePlate,
        makeModel: vehicles.makeModel,
        city: vehicles.city,
        region: vehicles.region,
        isActive: vehicles.isActive,
      },
    })
    .from(screens)
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
    .leftJoin(vehicles, eq(screens.vehicleId, vehicles.id))
    .where(eq(screens.id, screenId));

  if (!screen) return null;

  const [player] = await db
    .select({
      id: players.id,
      lastSeenAt: players.lastSeenAt,
      softwareVersion: players.softwareVersion,
      configHash: players.configHash,
    })
    .from(players)
    .where(and(eq(players.screenId, screenId), eq(players.isActive, true)))
    .limit(1);

  let lastHeartbeatAt: Date | null = null;
  if (player) {
    const [latestHeartbeat] = await db
      .select({ timestamp: heartbeats.timestamp })
      .from(heartbeats)
      .where(eq(heartbeats.playerId, player.id))
      .orderBy(desc(heartbeats.timestamp))
      .limit(1);

    lastHeartbeatAt = latestHeartbeat?.timestamp || null;
  }

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [stats24h] = await db
    .select({
      playCount: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .where(and(eq(playEvents.screenId, screenId), gte(playEvents.startedAt, last24h)));

  const [stats7d] = await db
    .select({
      playCount: sql<number>`COUNT(*)::int`,
    })
    .from(playEvents)
    .where(and(eq(playEvents.screenId, screenId), gte(playEvents.startedAt, last7d)));

  const recentPlayEvents = await db
    .select({
      timestamp: playEvents.startedAt,
      creativeId: playEvents.creativeId,
      creativeName: creatives.name,
      campaignId: playEvents.campaignId,
      campaignName: campaigns.name,
      playStatus: playEvents.playStatus,
    })
    .from(playEvents)
    .leftJoin(creatives, eq(playEvents.creativeId, creatives.id))
    .leftJoin(campaigns, eq(playEvents.campaignId, campaigns.id))
    .where(eq(playEvents.screenId, screenId))
    .orderBy(desc(playEvents.startedAt))
    .limit(20);

  return {
    screen,
    player: player
      ? {
          ...player,
          lastHeartbeatAt,
          isOnline: lastHeartbeatAt
            ? now.getTime() - lastHeartbeatAt.getTime() < 2 * 60 * 1000
            : false,
        }
      : null,
    stats: {
      playCount24h: stats24h?.playCount || 0,
      playCount7d: stats7d?.playCount || 0,
    },
    recentPlayEvents,
  };
}

export async function getScreenHeartbeats(
  screenId: string,
  from?: Date,
  to?: Date
) {
  const [player] = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.screenId, screenId))
    .limit(1);

  if (!player) return [];

  const defaultFrom = from || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const defaultTo = to || new Date();

  return db
    .select({
      timestamp: heartbeats.timestamp,
      status: heartbeats.status,
      softwareVersion: heartbeats.softwareVersion,
      storageFreeMb: heartbeats.storageFreeMb,
      cpuUsage: heartbeats.cpuUsage,
      networkType: heartbeats.networkType,
      signalStrength: heartbeats.signalStrength,
    })
    .from(heartbeats)
    .where(
      and(
        eq(heartbeats.playerId, player.id),
        gte(heartbeats.timestamp, defaultFrom),
        sql`${heartbeats.timestamp} <= ${defaultTo}`
      )
    )
    .orderBy(desc(heartbeats.timestamp));
}

export async function getScreenPlayEvents(
  screenId: string,
  params?: {
    from?: Date;
    to?: Date;
    limit?: number;
  }
) {
  const defaultFrom = params?.from || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const defaultTo = params?.to || new Date();
  const limit = params?.limit || 50;

  return db
    .select({
      timestamp: playEvents.startedAt,
      creativeId: playEvents.creativeId,
      creativeName: creatives.name,
      campaignId: playEvents.campaignId,
      campaignName: campaigns.name,
      playStatus: playEvents.playStatus,
      durationSeconds: playEvents.durationSeconds,
    })
    .from(playEvents)
    .leftJoin(creatives, eq(playEvents.creativeId, creatives.id))
    .leftJoin(campaigns, eq(playEvents.campaignId, campaigns.id))
    .where(
      and(
        eq(playEvents.screenId, screenId),
        gte(playEvents.startedAt, defaultFrom),
        sql`${playEvents.startedAt} <= ${defaultTo}`
      )
    )
    .orderBy(desc(playEvents.startedAt))
    .limit(limit);
}

export async function getScreenLocationHistory(
  screenId: string,
  from: Date,
  to: Date
) {
  const history = await db
    .select({
      recordedAt: screenLocationHistory.recordedAt,
      latitude: screenLocationHistory.latitude,
      longitude: screenLocationHistory.longitude,
    })
    .from(screenLocationHistory)
    .where(
      and(
        eq(screenLocationHistory.screenId, screenId),
        gte(screenLocationHistory.recordedAt, from),
        sql`${screenLocationHistory.recordedAt} <= ${to}`
      )
    )
    .orderBy(screenLocationHistory.recordedAt);

  return history.map(h => ({
    recordedAt: h.recordedAt.toISOString(),
    latitude: parseFloat(h.latitude as string),
    longitude: parseFloat(h.longitude as string),
  }));
}

export async function listPlayers() {
  return db
    .select({
      id: players.id,
      screenId: players.screenId,
      screenName: screens.name,
      lastSeenAt: players.lastSeenAt,
      softwareVersion: players.softwareVersion,
      lastHeartbeatAt: sql<Date | null>`(
        SELECT MAX(h.timestamp) 
        FROM ${heartbeats} h 
        WHERE h.player_id = ${players.id}
      )`,
    })
    .from(players)
    .leftJoin(screens, eq(players.screenId, screens.id));
}

export async function getPlayerDetail(playerId: string) {
  const [player] = await db
    .select({
      id: players.id,
      screenId: players.screenId,
      screenName: screens.name,
      lastSeenAt: players.lastSeenAt,
      softwareVersion: players.softwareVersion,
      configHash: players.configHash,
    })
    .from(players)
    .leftJoin(screens, eq(players.screenId, screens.id))
    .where(eq(players.id, playerId));

  if (!player) return null;

  const [latestHeartbeat] = await db
    .select({ timestamp: heartbeats.timestamp })
    .from(heartbeats)
    .where(eq(heartbeats.playerId, playerId))
    .orderBy(desc(heartbeats.timestamp))
    .limit(1);

  const recentHeartbeats = await db
    .select({
      timestamp: heartbeats.timestamp,
      status: heartbeats.status,
      softwareVersion: heartbeats.softwareVersion,
      storageFreeMb: heartbeats.storageFreeMb,
      cpuUsage: heartbeats.cpuUsage,
    })
    .from(heartbeats)
    .where(eq(heartbeats.playerId, playerId))
    .orderBy(desc(heartbeats.timestamp))
    .limit(10);

  const recentPlayEvents = await db
    .select({
      timestamp: playEvents.startedAt,
      creativeId: playEvents.creativeId,
      creativeName: creatives.name,
      campaignId: playEvents.campaignId,
      campaignName: campaigns.name,
      playStatus: playEvents.playStatus,
    })
    .from(playEvents)
    .leftJoin(creatives, eq(playEvents.creativeId, creatives.id))
    .leftJoin(campaigns, eq(playEvents.campaignId, campaigns.id))
    .where(eq(playEvents.playerId, playerId))
    .orderBy(desc(playEvents.startedAt))
    .limit(20);

  const now = new Date();
  const lastHeartbeatAt = latestHeartbeat?.timestamp || null;

  return {
    player: {
      ...player,
      lastHeartbeatAt,
      isOnline: lastHeartbeatAt
        ? now.getTime() - lastHeartbeatAt.getTime() < 2 * 60 * 1000
        : false,
    },
    recentHeartbeats,
    recentPlayEvents,
  };
}

// Helper functions for CRUD operations

export async function validateRegionExists(regionCode: string): Promise<boolean> {
  const [region] = await db
    .select({ code: regions.code })
    .from(regions)
    .where(eq(regions.code, regionCode))
    .limit(1);
  return !!region;
}

export async function validatePublisherOrg(orgId: string): Promise<{ valid: boolean; type?: string }> {
  const [org] = await db
    .select({ type: organisations.type })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);
  
  if (!org) return { valid: false };
  return { valid: org.type === 'publisher', type: org.type };
}

export async function getPlayerAssignment(playerId: string): Promise<{ screenId: string } | null> {
  const [player] = await db
    .select({ screenId: players.screenId })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  return player || null;
}

export async function unassignPlayerFromScreen(playerId: string): Promise<void> {
  // Note: Players table has screenId as NOT NULL foreign key
  // We can't actually set it to null due to schema constraints
  // In a real scenario, you'd either need to:
  // 1. Change the schema to allow nullable screenId
  // 2. Delete the player record
  // 3. Keep a separate "assignment" table
  // For now, we'll throw an error if trying to unassign
  throw new Error("Cannot unassign player: screenId is required in schema. Player must be assigned to a screen.");
}

export async function updatePlayerScreenAssignment(playerId: string, newScreenId: string): Promise<void> {
  await db
    .update(players)
    .set({ screenId: newScreenId })
    .where(eq(players.id, playerId));
}

export async function getAvailablePlayers(): Promise<Array<{ id: string; currentScreenId: string | null; currentScreenName: string | null }>> {
  return db
    .select({
      id: players.id,
      currentScreenId: players.screenId,
      currentScreenName: screens.name,
    })
    .from(players)
    .leftJoin(screens, eq(players.screenId, screens.id));
}

export async function getPublisherOrganisations(): Promise<Array<{ id: string; name: string }>> {
  return db
    .select({
      id: organisations.id,
      name: organisations.name,
    })
    .from(organisations)
    .where(eq(organisations.type, 'publisher'));
}

export async function getRegionsList(): Promise<Array<{ id: string; code: string; name: string }>> {
  return db
    .select({
      id: regions.id,
      code: regions.code,
      name: regions.name,
    })
    .from(regions)
    .orderBy(regions.name);
}

export async function getVehiclesList(publisherOrgId?: string): Promise<Array<{ 
  id: string; 
  name: string;
  externalId: string | null;
  licensePlate: string | null;
  makeModel: string | null;
  city: string | null;
  region: string | null;
  isActive: boolean;
  publisherOrgId: string;
  publisherOrgName: string | null;
}>> {
  const query = db
    .select({
      id: vehicles.id,
      name: vehicles.name,
      externalId: vehicles.externalId,
      licensePlate: vehicles.licensePlate,
      makeModel: vehicles.makeModel,
      city: vehicles.city,
      region: vehicles.region,
      isActive: vehicles.isActive,
      publisherOrgId: vehicles.publisherOrgId,
      publisherOrgName: organisations.name,
    })
    .from(vehicles)
    .leftJoin(organisations, eq(vehicles.publisherOrgId, organisations.id));

  if (publisherOrgId) {
    return query.where(eq(vehicles.publisherOrgId, publisherOrgId));
  }

  return query;
}

// Updated createScreen function with simpler interface for CMS
export async function createScreenForCMS(input: {
  name?: string; // Phase 3B: Name is now optional (code is the primary identifier)
  city: string;
  regionCode: string;
  publisherOrgId: string;
  publisherId?: string; // Phase 3A: New publisher profile reference
  status?: 'active' | 'inactive' | 'maintenance';
  playerId?: string;
  // Phase 2: Classification metadata
  screenClassification?: string;
  vehicleId?: string;
  structureType?: string;
  sizeDescription?: string;
  illuminationType?: string;
  address?: string;
  venueName?: string;
  venueType?: string;
  venueAddress?: string;
  latitude?: number;
  longitude?: number;
}) {
  // Phase 3B: Auto-generate screen code
  const code = await generateScreenCode();
  
  // Create screen with a temporary placeholder initially
  // We'll update it after player assignment if needed
  const [created] = await db
    .insert(screens)
    .values({
      code, // Phase 3B: Auto-generated code
      publisherOrgId: input.publisherOrgId,
      publisherId: input.publisherId || null, // Phase 3A
      name: input.name || null, // Phase 3B: Name is optional
      city: input.city,
      regionCode: input.regionCode,
      status: input.status || 'active',
      // Default values for hidden fields
      screenType: 'digital_display',
      resolutionWidth: 1920,
      resolutionHeight: 1080,
      lat: '0.0',
      lng: '0.0',
      // Phase 2: Classification metadata
      screenClassification: input.screenClassification || 'vehicle',
      vehicleId: input.vehicleId || null,
      structureType: input.structureType || null,
      sizeDescription: input.sizeDescription || null,
      illuminationType: input.illuminationType || null,
      address: input.address || null,
      venueName: input.venueName || null,
      venueType: input.venueType || null,
      venueAddress: input.venueAddress || null,
      latitude: input.latitude ? input.latitude.toString() : null,
      longitude: input.longitude ? input.longitude.toString() : null,
    })
    .returning();

  // Handle player assignment if provided
  // This will reassign the player from its current screen to this new screen
  if (input.playerId && created) {
    await updatePlayerScreenAssignment(input.playerId, created.id);
  }

  return created;
}

// Update screen function (atomic transaction)
export async function updateScreenData(screenId: string, input: {
  name?: string;
  city?: string;
  regionCode?: string;
  publisherOrgId?: string;
  publisherId?: string | null; // Phase 3A
  status?: 'active' | 'inactive' | 'maintenance';
  playerId?: string | null;
  // Phase 2: Classification metadata
  screenClassification?: string;
  vehicleId?: string | null;
  structureType?: string | null;
  sizeDescription?: string | null;
  illuminationType?: string | null;
  address?: string | null;
  venueName?: string | null;
  venueType?: string | null;
  venueAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}, currentPlayerId?: string) {
  // Wrap entire update operation in a single transaction for atomicity
  return await db.transaction(async (tx) => {
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.regionCode !== undefined) updateData.regionCode = input.regionCode;
    if (input.publisherOrgId !== undefined) updateData.publisherOrgId = input.publisherOrgId;
    if (input.publisherId !== undefined) updateData.publisherId = input.publisherId || null; // Phase 3A
    if (input.status !== undefined) updateData.status = input.status;
    
    // Phase 2: Classification metadata
    if (input.screenClassification !== undefined) updateData.screenClassification = input.screenClassification;
    if (input.vehicleId !== undefined) updateData.vehicleId = input.vehicleId || null;
    if (input.structureType !== undefined) updateData.structureType = input.structureType || null;
    if (input.sizeDescription !== undefined) updateData.sizeDescription = input.sizeDescription || null;
    if (input.illuminationType !== undefined) updateData.illuminationType = input.illuminationType || null;
    if (input.address !== undefined) updateData.address = input.address || null;
    if (input.venueName !== undefined) updateData.venueName = input.venueName || null;
    if (input.venueType !== undefined) updateData.venueType = input.venueType || null;
    if (input.venueAddress !== undefined) updateData.venueAddress = input.venueAddress || null;
    if (input.latitude !== undefined) updateData.latitude = input.latitude ? input.latitude.toString() : null;
    if (input.longitude !== undefined) updateData.longitude = input.longitude ? input.longitude.toString() : null;

    // Update screen fields if there are any changes
    let updated;
    if (Object.keys(updateData).length > 0) {
      [updated] = await tx
        .update(screens)
        .set(updateData)
        .where(eq(screens.id, screenId))
        .returning();
    } else {
      // If no screen fields to update, just fetch current screen
      [updated] = await tx.select().from(screens).where(eq(screens.id, screenId));
    }

    // Handle player assignment changes within the same transaction
    if (input.playerId !== undefined && input.playerId !== currentPlayerId) {
      if (input.playerId === null || input.playerId === '') {
        // User wants to unassign - not supported due to schema constraints
        // Players table requires screenId, so we cannot set it to null
        // This is a limitation of the current schema
        throw new Error("Cannot unassign player: screenId is required. Player must always be assigned to a screen.");
      } else {
        // Need to swap players to maintain one-player-per-screen
        if (currentPlayerId) {
          // There's already a player on this screen - swap them (within transaction)
          const [playerA] = await tx.select({ screenId: players.screenId }).from(players).where(eq(players.id, currentPlayerId));
          const [playerB] = await tx.select({ screenId: players.screenId }).from(players).where(eq(players.id, input.playerId));
          
          if (!playerA || !playerB) {
            throw new Error("One or both players not found");
          }

          // Check if they're already on the same screen (no swap needed)
          if (playerA.screenId !== playerB.screenId) {
            // Atomic swap within the outer transaction
            await tx.update(players).set({ screenId: playerB.screenId }).where(eq(players.id, currentPlayerId));
            await tx.update(players).set({ screenId: playerA.screenId }).where(eq(players.id, input.playerId));
          }
        } else {
          // No current player on this screen - just assign the new player (within transaction)
          await tx.update(players).set({ screenId: screenId }).where(eq(players.id, input.playerId));
        }
      }
    }

    return updated;
  });
}

export interface PlaylistPreviewCreative {
  creative_id: string;
  name: string;
  file_url: string;
  weight: number;
  duration_seconds: number;
}

export interface PlaylistPreviewFlight {
  flight_id: string;
  name: string;
  start_datetime: string;
  end_datetime: string;
}

export interface PlaylistPreviewResponse {
  screen_id: string;
  generated_at: string;
  region: string;
  fallback_used: boolean;
  creatives: PlaylistPreviewCreative[];
  flights: PlaylistPreviewFlight[];
}

export async function getPlaylistPreview(screenId: string): Promise<PlaylistPreviewResponse> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const screenRow = await client.query(
      `
      SELECT
        s.id AS screen_id,
        s.region_code
      FROM public.screens s
      WHERE s.id = $1
      `,
      [screenId]
    );

    if (screenRow.rowCount === 0) {
      throw new Error("Screen not found");
    }

    const { screen_id, region_code } = screenRow.rows[0];

    const flightsResult = await client.query(
      `
      SELECT DISTINCT 
        f.id, 
        f.name,
        f.start_datetime,
        f.end_datetime,
        f.campaign_id
      FROM public.flights f
      WHERE f.status = 'active'
        AND now() BETWEEN f.start_datetime AND f.end_datetime
        AND (
          (f.target_type = 'screen' AND f.target_id = $1)
          OR (f.target_type = 'screen_group' AND EXISTS (
            SELECT 1 FROM public.screen_group_memberships sgm
            WHERE sgm.screen_id = $1 AND sgm.group_id = f.target_id
          ))
        )
      `,
      [screenId]
    );

    const regionRow = await client.query(
      `
      SELECT r.requires_pre_approval
      FROM public.regions r
      WHERE r.code = $1
      `,
      [region_code]
    );

    const requiresPreApproval = regionRow.rowCount && regionRow.rowCount > 0 
      ? regionRow.rows[0].requires_pre_approval 
      : false;

    const activeFlights: PlaylistPreviewFlight[] = flightsResult.rows.map(row => ({
      flight_id: row.id,
      name: row.name,
      start_datetime: row.start_datetime,
      end_datetime: row.end_datetime,
    }));

    const creativeWeightMap = new Map<string, { 
      creative_id: string;
      name: string;
      file_url: string;
      duration_seconds: number;
      weight: number;
    }>();

    let fallbackUsed = false;

    if (flightsResult.rowCount && flightsResult.rowCount > 0) {
      const flightIds = flightsResult.rows.map((r) => r.id);

      const creativesResult = await client.query(
        `
        SELECT DISTINCT
          c.id AS creative_id,
          c.name,
          c.file_url,
          c.duration_seconds,
          fc.weight,
          ca.approval_code
        FROM public.flight_creatives fc
        JOIN public.creatives c ON c.id = fc.creative_id
        JOIN public.creative_approvals ca ON ca.creative_id = c.id
        JOIN public.regions r ON r.id = ca.region_id
        WHERE fc.flight_id = ANY($1::uuid[])
          AND r.code = $2
          AND ca.status = 'approved'
          ${requiresPreApproval ? "AND ca.approval_code IS NOT NULL" : ""}
        `,
        [flightIds, region_code]
      );

      for (const row of creativesResult.rows) {
        const existingWeight = creativeWeightMap.get(row.creative_id)?.weight || 0;
        creativeWeightMap.set(row.creative_id, {
          creative_id: row.creative_id,
          name: row.name,
          file_url: row.file_url,
          duration_seconds: row.duration_seconds,
          weight: existingWeight + (row.weight || 1),
        });
      }
    }

    if (creativeWeightMap.size === 0) {
      const fallbackResult = await client.query(
        `
        SELECT
          c.id AS creative_id,
          c.name,
          c.file_url,
          c.duration_seconds,
          ca.approval_code
        FROM public.creatives c
        JOIN public.creative_approvals ca ON ca.creative_id = c.id
        JOIN public.regions r ON r.id = ca.region_id
        JOIN public.campaigns camp ON camp.id = c.campaign_id
        WHERE r.code = $1
          AND ca.status = 'approved'
          AND camp.status = 'active'
        ORDER BY c.created_at DESC
        LIMIT 1
        `,
        [region_code]
      );

      if (fallbackResult.rowCount && fallbackResult.rowCount > 0) {
        const fb = fallbackResult.rows[0];
        const isCompliant = !requiresPreApproval || (fb.approval_code != null && fb.approval_code !== '');
        
        if (isCompliant) {
          creativeWeightMap.set(fb.creative_id, {
            creative_id: fb.creative_id,
            name: fb.name,
            file_url: fb.file_url,
            duration_seconds: fb.duration_seconds,
            weight: 1,
          });
          fallbackUsed = true;
        }
      }
    }

    await client.query("COMMIT");

    return {
      screen_id,
      generated_at: new Date().toISOString(),
      region: region_code,
      fallback_used: fallbackUsed,
      creatives: Array.from(creativeWeightMap.values()),
      flights: activeFlights,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface LastPlayEvent {
  creative_id: string;
  creative_name: string | null;
  started_at: string;
  duration_seconds: number;
  play_status: string;
  lat: number | null;
  lng: number | null;
}

export async function getLastPlayEvents(screenId: string, limit: number = 20): Promise<LastPlayEvent[]> {
  const events = await db
    .select({
      creativeId: playEvents.creativeId,
      creativeName: creatives.name,
      startedAt: playEvents.startedAt,
      durationSeconds: playEvents.durationSeconds,
      playStatus: playEvents.playStatus,
      lat: playEvents.lat,
      lng: playEvents.lng,
    })
    .from(playEvents)
    .leftJoin(creatives, eq(playEvents.creativeId, creatives.id))
    .where(eq(playEvents.screenId, screenId))
    .orderBy(desc(playEvents.startedAt))
    .limit(limit);

  return events.map(e => ({
    creative_id: e.creativeId,
    creative_name: e.creativeName,
    started_at: e.startedAt.toISOString(),
    duration_seconds: e.durationSeconds,
    play_status: e.playStatus,
    lat: e.lat ? parseFloat(e.lat as string) : null,
    lng: e.lng ? parseFloat(e.lng as string) : null,
  }));
}

export interface DisconnectPlayerResult {
  screen_id: string;
  player_id: string;
}

export async function disconnectPlayerFromScreen(screenId: string): Promise<DisconnectPlayerResult> {
  const [activePlayer] = await db
    .select({
      id: players.id,
      isActive: players.isActive,
    })
    .from(players)
    .where(and(
      eq(players.screenId, screenId),
      eq(players.isActive, true)
    ))
    .limit(1);

  if (!activePlayer) {
    throw new Error("No active player linked to this screen");
  }

  await db
    .update(players)
    .set({
      isActive: false,
      revokedAt: new Date(),
    })
    .where(eq(players.id, activePlayer.id));

  await db
    .update(screens)
    .set({
      lastSeenAt: null,
    })
    .where(eq(screens.id, screenId));

  return {
    screen_id: screenId,
    player_id: activePlayer.id,
  };
}

export async function getActivePlayerForScreen(screenId: string): Promise<{ id: string } | null> {
  const [player] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(
      eq(players.screenId, screenId),
      eq(players.isActive, true)
    ))
    .limit(1);

  return player || null;
}

export interface ScreenGroupMembership {
  groupId: string;
  groupName: string;
  publisherOrgId: string;
  publisherName: string;
  description: string | null;
  isArchived: boolean;
  screenCount: number;
  addedAt: Date;
  addedByUserId: string | null;
  addedByUserName: string | null;
}

export async function getScreenGroups(screenId: string): Promise<{
  groups: ScreenGroupMembership[];
  totalGroups: number;
}> {
  const { screenGroups, screenGroupMemberships, users } = await import("../../db/schema");
  
  const memberships = await db
    .select({
      groupId: screenGroups.id,
      groupName: screenGroups.name,
      publisherOrgId: screenGroups.orgId,
      publisherName: organisations.name,
      description: screenGroups.description,
      isArchived: screenGroups.isArchived,
      addedAt: screenGroupMemberships.addedAt,
      addedByUserId: screenGroupMemberships.addedByUserId,
      addedByUserName: users.fullName,
      screenCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM ${screenGroupMemberships} sgm2
        WHERE sgm2.group_id = ${screenGroups.id}
      )`,
    })
    .from(screenGroupMemberships)
    .innerJoin(screenGroups, eq(screenGroupMemberships.groupId, screenGroups.id))
    .leftJoin(organisations, eq(screenGroups.orgId, organisations.id))
    .leftJoin(users, eq(screenGroupMemberships.addedByUserId, users.id))
    .where(eq(screenGroupMemberships.screenId, screenId))
    .orderBy(desc(screenGroupMemberships.addedAt));

  const groups: ScreenGroupMembership[] = memberships.map(m => ({
    groupId: m.groupId,
    groupName: m.groupName,
    publisherOrgId: m.publisherOrgId,
    publisherName: m.publisherName || "",
    description: m.description,
    isArchived: m.isArchived,
    screenCount: m.screenCount,
    addedAt: m.addedAt,
    addedByUserId: m.addedByUserId,
    addedByUserName: m.addedByUserName,
  }));

  return {
    groups,
    totalGroups: groups.length,
  };
}
