// src/modules/screens/screens.service.ts
import { db } from "../../db/client";
import { screens, organisations, players, heartbeats, playEvents, creatives, campaigns, regions, vehicles } from "../../db/schema";
import { eq, desc, and, gte, sql, isNull } from "drizzle-orm";

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
        licencePlate: vehicles.licencePlate,
        make: vehicles.make,
        model: vehicles.model,
        colour: vehicles.colour,
      },
    })
    .from(screens)
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
    .leftJoin(players, eq(players.screenId, screens.id))
    .leftJoin(vehicles, eq(screens.vehicleId, vehicles.id));

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}

export async function createScreen(input: {
  publisherOrgId: string;
  name: string;
  screenType: string;
  resolutionWidth: number;
  resolutionHeight: number;
  city: string;
  regionCode: string;
  lat: string;
  lng: string;
}) {
  const [created] = await db
    .insert(screens)
    .values({
      publisherOrgId: input.publisherOrgId,
      name: input.name,
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
        identifier: vehicles.identifier,
        licencePlate: vehicles.licencePlate,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
        colour: vehicles.colour,
        notes: vehicles.notes,
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
    .where(eq(players.screenId, screenId))
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

// Updated createScreen function with simpler interface for CMS
export async function createScreenForCMS(input: {
  name: string;
  city: string;
  regionCode: string;
  publisherOrgId: string;
  status?: 'active' | 'inactive' | 'maintenance';
  playerId?: string;
}) {
  // Create screen with a temporary placeholder initially
  // We'll update it after player assignment if needed
  const [created] = await db
    .insert(screens)
    .values({
      publisherOrgId: input.publisherOrgId,
      name: input.name,
      city: input.city,
      regionCode: input.regionCode,
      status: input.status || 'active',
      // Default values for hidden fields
      screenType: 'digital_display',
      resolutionWidth: 1920,
      resolutionHeight: 1080,
      lat: '0.0',
      lng: '0.0',
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
  status?: 'active' | 'inactive' | 'maintenance';
  playerId?: string | null;
}, currentPlayerId?: string) {
  // Wrap entire update operation in a single transaction for atomicity
  return await db.transaction(async (tx) => {
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.regionCode !== undefined) updateData.regionCode = input.regionCode;
    if (input.publisherOrgId !== undefined) updateData.publisherOrgId = input.publisherOrgId;
    if (input.status !== undefined) updateData.status = input.status;

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
