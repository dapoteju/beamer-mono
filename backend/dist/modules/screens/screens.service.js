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
exports.validateRegionExists = validateRegionExists;
exports.validatePublisherOrg = validatePublisherOrg;
exports.getPlayerAssignment = getPlayerAssignment;
exports.unassignPlayerFromScreen = unassignPlayerFromScreen;
exports.updatePlayerScreenAssignment = updatePlayerScreenAssignment;
exports.getAvailablePlayers = getAvailablePlayers;
exports.getPublisherOrganisations = getPublisherOrganisations;
exports.getRegionsList = getRegionsList;
exports.getVehiclesList = getVehiclesList;
exports.createScreenForCMS = createScreenForCMS;
exports.updateScreenData = updateScreenData;
// src/modules/screens/screens.service.ts
const client_1 = require("../../db/client");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Phase 3B: Screen code generation helper
async function generateScreenCode() {
    // Query the max numeric part of existing codes
    const [result] = await client_1.db
        .select({ maxCode: (0, drizzle_orm_1.sql) `MAX(code)` })
        .from(schema_1.screens);
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
        code: schema_1.screens.code, // Phase 3B: Screen code
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
        code: schema_1.screens.code, // Phase 3B: Screen code
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
        // Phase 3A: Publisher profile data
        publisherId: schema_1.screens.publisherId,
        publisherProfileId: schema_1.publisherProfiles.id,
        publisherType: schema_1.publisherProfiles.publisherType,
        publisherFullName: schema_1.publisherProfiles.fullName,
        publisherPhone: schema_1.publisherProfiles.phoneNumber,
        publisherEmail: schema_1.publisherProfiles.email,
        publisherOrganisationId: schema_1.publisherProfiles.organisationId,
        // Phase 1: Extended metadata (nullable fields)
        screenClassification: schema_1.screens.screenClassification,
        vehicleId: schema_1.screens.vehicleId,
        structureType: schema_1.screens.structureType,
        sizeDescription: schema_1.screens.sizeDescription,
        illuminationType: schema_1.screens.illuminationType,
        address: schema_1.screens.address,
        venueName: schema_1.screens.venueName,
        venueType: schema_1.screens.venueType,
        venueAddress: schema_1.screens.venueAddress,
        latitude: schema_1.screens.latitude,
        longitude: schema_1.screens.longitude,
        // Vehicle data (joined)
        vehicle: {
            id: schema_1.vehicles.id,
            licencePlate: schema_1.vehicles.licencePlate,
            make: schema_1.vehicles.make,
            model: schema_1.vehicles.model,
            colour: schema_1.vehicles.colour,
        },
    })
        .from(schema_1.screens)
        .leftJoin(schema_1.organisations, (0, drizzle_orm_1.eq)(schema_1.screens.publisherOrgId, schema_1.organisations.id))
        .leftJoin(schema_1.players, (0, drizzle_orm_1.eq)(schema_1.players.screenId, schema_1.screens.id))
        .leftJoin(schema_1.vehicles, (0, drizzle_orm_1.eq)(schema_1.screens.vehicleId, schema_1.vehicles.id))
        .leftJoin(schema_1.publisherProfiles, (0, drizzle_orm_1.eq)(schema_1.screens.publisherId, schema_1.publisherProfiles.id));
    if (conditions.length > 0) {
        return query.where((0, drizzle_orm_1.and)(...conditions));
    }
    return query;
}
async function createScreen(input) {
    // Phase 3B: Auto-generate screen code
    const code = await generateScreenCode();
    const [created] = await client_1.db
        .insert(schema_1.screens)
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
        // Phase 1: Extended metadata (nullable fields)
        screenClassification: schema_1.screens.screenClassification,
        vehicleId: schema_1.screens.vehicleId,
        structureType: schema_1.screens.structureType,
        sizeDescription: schema_1.screens.sizeDescription,
        illuminationType: schema_1.screens.illuminationType,
        address: schema_1.screens.address,
        venueName: schema_1.screens.venueName,
        venueType: schema_1.screens.venueType,
        venueAddress: schema_1.screens.venueAddress,
        latitude: schema_1.screens.latitude,
        longitude: schema_1.screens.longitude,
        // Vehicle data (joined)
        vehicle: {
            id: schema_1.vehicles.id,
            identifier: schema_1.vehicles.identifier,
            licencePlate: schema_1.vehicles.licencePlate,
            make: schema_1.vehicles.make,
            model: schema_1.vehicles.model,
            year: schema_1.vehicles.year,
            colour: schema_1.vehicles.colour,
            notes: schema_1.vehicles.notes,
        },
    })
        .from(schema_1.screens)
        .leftJoin(schema_1.organisations, (0, drizzle_orm_1.eq)(schema_1.screens.publisherOrgId, schema_1.organisations.id))
        .leftJoin(schema_1.vehicles, (0, drizzle_orm_1.eq)(schema_1.screens.vehicleId, schema_1.vehicles.id))
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
// Helper functions for CRUD operations
async function validateRegionExists(regionCode) {
    const [region] = await client_1.db
        .select({ code: schema_1.regions.code })
        .from(schema_1.regions)
        .where((0, drizzle_orm_1.eq)(schema_1.regions.code, regionCode))
        .limit(1);
    return !!region;
}
async function validatePublisherOrg(orgId) {
    const [org] = await client_1.db
        .select({ type: schema_1.organisations.type })
        .from(schema_1.organisations)
        .where((0, drizzle_orm_1.eq)(schema_1.organisations.id, orgId))
        .limit(1);
    if (!org)
        return { valid: false };
    return { valid: org.type === 'publisher', type: org.type };
}
async function getPlayerAssignment(playerId) {
    const [player] = await client_1.db
        .select({ screenId: schema_1.players.screenId })
        .from(schema_1.players)
        .where((0, drizzle_orm_1.eq)(schema_1.players.id, playerId))
        .limit(1);
    return player || null;
}
async function unassignPlayerFromScreen(playerId) {
    // Note: Players table has screenId as NOT NULL foreign key
    // We can't actually set it to null due to schema constraints
    // In a real scenario, you'd either need to:
    // 1. Change the schema to allow nullable screenId
    // 2. Delete the player record
    // 3. Keep a separate "assignment" table
    // For now, we'll throw an error if trying to unassign
    throw new Error("Cannot unassign player: screenId is required in schema. Player must be assigned to a screen.");
}
async function updatePlayerScreenAssignment(playerId, newScreenId) {
    await client_1.db
        .update(schema_1.players)
        .set({ screenId: newScreenId })
        .where((0, drizzle_orm_1.eq)(schema_1.players.id, playerId));
}
async function getAvailablePlayers() {
    return client_1.db
        .select({
        id: schema_1.players.id,
        currentScreenId: schema_1.players.screenId,
        currentScreenName: schema_1.screens.name,
    })
        .from(schema_1.players)
        .leftJoin(schema_1.screens, (0, drizzle_orm_1.eq)(schema_1.players.screenId, schema_1.screens.id));
}
async function getPublisherOrganisations() {
    return client_1.db
        .select({
        id: schema_1.organisations.id,
        name: schema_1.organisations.name,
    })
        .from(schema_1.organisations)
        .where((0, drizzle_orm_1.eq)(schema_1.organisations.type, 'publisher'));
}
async function getRegionsList() {
    return client_1.db
        .select({
        id: schema_1.regions.id,
        code: schema_1.regions.code,
        name: schema_1.regions.name,
    })
        .from(schema_1.regions)
        .orderBy(schema_1.regions.name);
}
async function getVehiclesList(publisherOrgId) {
    const query = client_1.db
        .select({
        id: schema_1.vehicles.id,
        identifier: schema_1.vehicles.identifier,
        licencePlate: schema_1.vehicles.licencePlate,
        make: schema_1.vehicles.make,
        model: schema_1.vehicles.model,
        colour: schema_1.vehicles.colour,
        publisherOrgId: schema_1.vehicles.publisherOrgId,
        publisherOrgName: schema_1.organisations.name,
    })
        .from(schema_1.vehicles)
        .leftJoin(schema_1.organisations, (0, drizzle_orm_1.eq)(schema_1.vehicles.publisherOrgId, schema_1.organisations.id));
    if (publisherOrgId) {
        return query.where((0, drizzle_orm_1.eq)(schema_1.vehicles.publisherOrgId, publisherOrgId));
    }
    return query;
}
// Updated createScreen function with simpler interface for CMS
async function createScreenForCMS(input) {
    // Phase 3B: Auto-generate screen code
    const code = await generateScreenCode();
    // Create screen with a temporary placeholder initially
    // We'll update it after player assignment if needed
    const [created] = await client_1.db
        .insert(schema_1.screens)
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
async function updateScreenData(screenId, input, currentPlayerId) {
    // Wrap entire update operation in a single transaction for atomicity
    return await client_1.db.transaction(async (tx) => {
        const updateData = {};
        if (input.name !== undefined)
            updateData.name = input.name;
        if (input.city !== undefined)
            updateData.city = input.city;
        if (input.regionCode !== undefined)
            updateData.regionCode = input.regionCode;
        if (input.publisherOrgId !== undefined)
            updateData.publisherOrgId = input.publisherOrgId;
        if (input.publisherId !== undefined)
            updateData.publisherId = input.publisherId || null; // Phase 3A
        if (input.status !== undefined)
            updateData.status = input.status;
        // Phase 2: Classification metadata
        if (input.screenClassification !== undefined)
            updateData.screenClassification = input.screenClassification;
        if (input.vehicleId !== undefined)
            updateData.vehicleId = input.vehicleId || null;
        if (input.structureType !== undefined)
            updateData.structureType = input.structureType || null;
        if (input.sizeDescription !== undefined)
            updateData.sizeDescription = input.sizeDescription || null;
        if (input.illuminationType !== undefined)
            updateData.illuminationType = input.illuminationType || null;
        if (input.address !== undefined)
            updateData.address = input.address || null;
        if (input.venueName !== undefined)
            updateData.venueName = input.venueName || null;
        if (input.venueType !== undefined)
            updateData.venueType = input.venueType || null;
        if (input.venueAddress !== undefined)
            updateData.venueAddress = input.venueAddress || null;
        if (input.latitude !== undefined)
            updateData.latitude = input.latitude ? input.latitude.toString() : null;
        if (input.longitude !== undefined)
            updateData.longitude = input.longitude ? input.longitude.toString() : null;
        // Update screen fields if there are any changes
        let updated;
        if (Object.keys(updateData).length > 0) {
            [updated] = await tx
                .update(schema_1.screens)
                .set(updateData)
                .where((0, drizzle_orm_1.eq)(schema_1.screens.id, screenId))
                .returning();
        }
        else {
            // If no screen fields to update, just fetch current screen
            [updated] = await tx.select().from(schema_1.screens).where((0, drizzle_orm_1.eq)(schema_1.screens.id, screenId));
        }
        // Handle player assignment changes within the same transaction
        if (input.playerId !== undefined && input.playerId !== currentPlayerId) {
            if (input.playerId === null || input.playerId === '') {
                // User wants to unassign - not supported due to schema constraints
                // Players table requires screenId, so we cannot set it to null
                // This is a limitation of the current schema
                throw new Error("Cannot unassign player: screenId is required. Player must always be assigned to a screen.");
            }
            else {
                // Need to swap players to maintain one-player-per-screen
                if (currentPlayerId) {
                    // There's already a player on this screen - swap them (within transaction)
                    const [playerA] = await tx.select({ screenId: schema_1.players.screenId }).from(schema_1.players).where((0, drizzle_orm_1.eq)(schema_1.players.id, currentPlayerId));
                    const [playerB] = await tx.select({ screenId: schema_1.players.screenId }).from(schema_1.players).where((0, drizzle_orm_1.eq)(schema_1.players.id, input.playerId));
                    if (!playerA || !playerB) {
                        throw new Error("One or both players not found");
                    }
                    // Check if they're already on the same screen (no swap needed)
                    if (playerA.screenId !== playerB.screenId) {
                        // Atomic swap within the outer transaction
                        await tx.update(schema_1.players).set({ screenId: playerB.screenId }).where((0, drizzle_orm_1.eq)(schema_1.players.id, currentPlayerId));
                        await tx.update(schema_1.players).set({ screenId: playerA.screenId }).where((0, drizzle_orm_1.eq)(schema_1.players.id, input.playerId));
                    }
                }
                else {
                    // No current player on this screen - just assign the new player (within transaction)
                    await tx.update(schema_1.players).set({ screenId: screenId }).where((0, drizzle_orm_1.eq)(schema_1.players.id, input.playerId));
                }
            }
        }
        return updated;
    });
}
