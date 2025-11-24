"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listScreens = listScreens;
exports.listScreensWithPlayerInfo = listScreensWithPlayerInfo;
exports.createScreen = createScreen;
exports.getScreen = getScreen;
exports.getScreenDetail = getScreenDetail;
exports.getScreenHeartbeats = getScreenHeartbeats;
exports.getScreenPlayEvents = getScreenPlayEvents;
exports.listPlayers = listPlayers;
exports.getPlayerDetail = getPlayerDetail;
// src/modules/screens/screens.service.ts
const client_1 = require("../../db/client");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function listScreens(filters) {
    const conditions = [];
    if (filters?.publisherOrgId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.screens.publisherOrgId, filters.publisherOrgId));
    }
    if (filters?.regionCode) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.screens.regionCode, filters.regionCode));
    }
    if (filters?.status) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.screens.status, filters.status));
    }
    const query = client_1.db
        .select({
        id: schema_1.screens.id,
        name: schema_1.screens.name,
        city: schema_1.screens.city,
        regionCode: schema_1.screens.regionCode,
        status: schema_1.screens.status,
        publisherOrgId: schema_1.screens.publisherOrgId,
        publisherOrgName: schema_1.organisations.name,
    })
        .from(schema_1.screens)
        .leftJoin(schema_1.organisations, (0, drizzle_orm_1.eq)(schema_1.screens.publisherOrgId, schema_1.organisations.id));
    if (conditions.length > 0) {
        return query.where((0, drizzle_orm_1.and)(...conditions));
    }
    return query;
}
async function listScreensWithPlayerInfo(filters) {
    const conditions = [];
    if (filters?.publisherOrgId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.screens.publisherOrgId, filters.publisherOrgId));
    }
    if (filters?.regionCode) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.screens.regionCode, filters.regionCode));
    }
    if (filters?.status) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.screens.status, filters.status));
    }
    const query = client_1.db
        .select({
        id: schema_1.screens.id,
        name: schema_1.screens.name,
        city: schema_1.screens.city,
        regionCode: schema_1.screens.regionCode,
        status: schema_1.screens.status,
        publisherOrgId: schema_1.screens.publisherOrgId,
        publisherOrgName: schema_1.organisations.name,
        playerId: schema_1.players.id,
        lastHeartbeatAt: (0, drizzle_orm_1.sql) `(
        SELECT MAX(h.timestamp) 
        FROM ${schema_1.heartbeats} h 
        WHERE h.screen_id = ${schema_1.screens.id}
      )`,
    })
        .from(schema_1.screens)
        .leftJoin(schema_1.organisations, (0, drizzle_orm_1.eq)(schema_1.screens.publisherOrgId, schema_1.organisations.id))
        .leftJoin(schema_1.players, (0, drizzle_orm_1.eq)(schema_1.players.screenId, schema_1.screens.id));
    if (conditions.length > 0) {
        return query.where((0, drizzle_orm_1.and)(...conditions));
    }
    return query;
}
async function createScreen(input) {
    const [created] = await client_1.db
        .insert(schema_1.screens)
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
async function getScreen(id) {
    const [row] = await client_1.db.select().from(schema_1.screens).where((0, drizzle_orm_1.eq)(schema_1.screens.id, id));
    return row ?? null;
}
async function getScreenDetail(screenId) {
    const [screen] = await client_1.db
        .select({
        id: schema_1.screens.id,
        name: schema_1.screens.name,
        city: schema_1.screens.city,
        regionCode: schema_1.screens.regionCode,
        status: schema_1.screens.status,
        publisherOrgId: schema_1.screens.publisherOrgId,
        publisherOrgName: schema_1.organisations.name,
        screenType: schema_1.screens.screenType,
        resolutionWidth: schema_1.screens.resolutionWidth,
        resolutionHeight: schema_1.screens.resolutionHeight,
        lat: schema_1.screens.lat,
        lng: schema_1.screens.lng,
    })
        .from(schema_1.screens)
        .leftJoin(schema_1.organisations, (0, drizzle_orm_1.eq)(schema_1.screens.publisherOrgId, schema_1.organisations.id))
        .where((0, drizzle_orm_1.eq)(schema_1.screens.id, screenId));
    if (!screen)
        return null;
    const [player] = await client_1.db
        .select({
        id: schema_1.players.id,
        lastSeenAt: schema_1.players.lastSeenAt,
        softwareVersion: schema_1.players.softwareVersion,
        configHash: schema_1.players.configHash,
    })
        .from(schema_1.players)
        .where((0, drizzle_orm_1.eq)(schema_1.players.screenId, screenId))
        .limit(1);
    let lastHeartbeatAt = null;
    if (player) {
        const [latestHeartbeat] = await client_1.db
            .select({ timestamp: schema_1.heartbeats.timestamp })
            .from(schema_1.heartbeats)
            .where((0, drizzle_orm_1.eq)(schema_1.heartbeats.playerId, player.id))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.heartbeats.timestamp))
            .limit(1);
        lastHeartbeatAt = latestHeartbeat?.timestamp || null;
    }
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [stats24h] = await client_1.db
        .select({
        playCount: (0, drizzle_orm_1.sql) `COUNT(*)::int`,
    })
        .from(schema_1.playEvents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playEvents.screenId, screenId), (0, drizzle_orm_1.gte)(schema_1.playEvents.startedAt, last24h)));
    const [stats7d] = await client_1.db
        .select({
        playCount: (0, drizzle_orm_1.sql) `COUNT(*)::int`,
    })
        .from(schema_1.playEvents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playEvents.screenId, screenId), (0, drizzle_orm_1.gte)(schema_1.playEvents.startedAt, last7d)));
    const recentPlayEvents = await client_1.db
        .select({
        timestamp: schema_1.playEvents.startedAt,
        creativeId: schema_1.playEvents.creativeId,
        creativeName: schema_1.creatives.name,
        campaignId: schema_1.playEvents.campaignId,
        campaignName: schema_1.campaigns.name,
        playStatus: schema_1.playEvents.playStatus,
    })
        .from(schema_1.playEvents)
        .leftJoin(schema_1.creatives, (0, drizzle_orm_1.eq)(schema_1.playEvents.creativeId, schema_1.creatives.id))
        .leftJoin(schema_1.campaigns, (0, drizzle_orm_1.eq)(schema_1.playEvents.campaignId, schema_1.campaigns.id))
        .where((0, drizzle_orm_1.eq)(schema_1.playEvents.screenId, screenId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.playEvents.startedAt))
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
async function getScreenHeartbeats(screenId, from, to) {
    const [player] = await client_1.db
        .select({ id: schema_1.players.id })
        .from(schema_1.players)
        .where((0, drizzle_orm_1.eq)(schema_1.players.screenId, screenId))
        .limit(1);
    if (!player)
        return [];
    const defaultFrom = from || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const defaultTo = to || new Date();
    return client_1.db
        .select({
        timestamp: schema_1.heartbeats.timestamp,
        status: schema_1.heartbeats.status,
        softwareVersion: schema_1.heartbeats.softwareVersion,
        storageFreeMb: schema_1.heartbeats.storageFreeMb,
        cpuUsage: schema_1.heartbeats.cpuUsage,
        networkType: schema_1.heartbeats.networkType,
        signalStrength: schema_1.heartbeats.signalStrength,
    })
        .from(schema_1.heartbeats)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.heartbeats.playerId, player.id), (0, drizzle_orm_1.gte)(schema_1.heartbeats.timestamp, defaultFrom), (0, drizzle_orm_1.sql) `${schema_1.heartbeats.timestamp} <= ${defaultTo}`))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.heartbeats.timestamp));
}
async function getScreenPlayEvents(screenId, params) {
    const defaultFrom = params?.from || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const defaultTo = params?.to || new Date();
    const limit = params?.limit || 50;
    return client_1.db
        .select({
        timestamp: schema_1.playEvents.startedAt,
        creativeId: schema_1.playEvents.creativeId,
        creativeName: schema_1.creatives.name,
        campaignId: schema_1.playEvents.campaignId,
        campaignName: schema_1.campaigns.name,
        playStatus: schema_1.playEvents.playStatus,
        durationSeconds: schema_1.playEvents.durationSeconds,
    })
        .from(schema_1.playEvents)
        .leftJoin(schema_1.creatives, (0, drizzle_orm_1.eq)(schema_1.playEvents.creativeId, schema_1.creatives.id))
        .leftJoin(schema_1.campaigns, (0, drizzle_orm_1.eq)(schema_1.playEvents.campaignId, schema_1.campaigns.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.playEvents.screenId, screenId), (0, drizzle_orm_1.gte)(schema_1.playEvents.startedAt, defaultFrom), (0, drizzle_orm_1.sql) `${schema_1.playEvents.startedAt} <= ${defaultTo}`))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.playEvents.startedAt))
        .limit(limit);
}
async function listPlayers() {
    return client_1.db
        .select({
        id: schema_1.players.id,
        screenId: schema_1.players.screenId,
        screenName: schema_1.screens.name,
        lastSeenAt: schema_1.players.lastSeenAt,
        softwareVersion: schema_1.players.softwareVersion,
        lastHeartbeatAt: (0, drizzle_orm_1.sql) `(
        SELECT MAX(h.timestamp) 
        FROM ${schema_1.heartbeats} h 
        WHERE h.player_id = ${schema_1.players.id}
      )`,
    })
        .from(schema_1.players)
        .leftJoin(schema_1.screens, (0, drizzle_orm_1.eq)(schema_1.players.screenId, schema_1.screens.id));
}
async function getPlayerDetail(playerId) {
    const [player] = await client_1.db
        .select({
        id: schema_1.players.id,
        screenId: schema_1.players.screenId,
        screenName: schema_1.screens.name,
        lastSeenAt: schema_1.players.lastSeenAt,
        softwareVersion: schema_1.players.softwareVersion,
        configHash: schema_1.players.configHash,
    })
        .from(schema_1.players)
        .leftJoin(schema_1.screens, (0, drizzle_orm_1.eq)(schema_1.players.screenId, schema_1.screens.id))
        .where((0, drizzle_orm_1.eq)(schema_1.players.id, playerId));
    if (!player)
        return null;
    const [latestHeartbeat] = await client_1.db
        .select({ timestamp: schema_1.heartbeats.timestamp })
        .from(schema_1.heartbeats)
        .where((0, drizzle_orm_1.eq)(schema_1.heartbeats.playerId, playerId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.heartbeats.timestamp))
        .limit(1);
    const recentHeartbeats = await client_1.db
        .select({
        timestamp: schema_1.heartbeats.timestamp,
        status: schema_1.heartbeats.status,
        softwareVersion: schema_1.heartbeats.softwareVersion,
        storageFreeMb: schema_1.heartbeats.storageFreeMb,
        cpuUsage: schema_1.heartbeats.cpuUsage,
    })
        .from(schema_1.heartbeats)
        .where((0, drizzle_orm_1.eq)(schema_1.heartbeats.playerId, playerId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.heartbeats.timestamp))
        .limit(10);
    const recentPlayEvents = await client_1.db
        .select({
        timestamp: schema_1.playEvents.startedAt,
        creativeId: schema_1.playEvents.creativeId,
        creativeName: schema_1.creatives.name,
        campaignId: schema_1.playEvents.campaignId,
        campaignName: schema_1.campaigns.name,
        playStatus: schema_1.playEvents.playStatus,
    })
        .from(schema_1.playEvents)
        .leftJoin(schema_1.creatives, (0, drizzle_orm_1.eq)(schema_1.playEvents.creativeId, schema_1.creatives.id))
        .leftJoin(schema_1.campaigns, (0, drizzle_orm_1.eq)(schema_1.playEvents.campaignId, schema_1.campaigns.id))
        .where((0, drizzle_orm_1.eq)(schema_1.playEvents.playerId, playerId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.playEvents.startedAt))
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
