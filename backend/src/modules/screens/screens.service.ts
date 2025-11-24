// src/modules/screens/screens.service.ts
import { db } from "../../db/client";
import { screens, organisations, players, heartbeats, playEvents, creatives, campaigns } from "../../db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

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
    })
    .from(screens)
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
    .leftJoin(players, eq(players.screenId, screens.id));

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
    })
    .from(screens)
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
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
