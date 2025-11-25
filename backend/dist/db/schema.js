"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoices = exports.passwordResetTokens = exports.screenLocationHistory = exports.bookingFlights = exports.screenGroupMembers = exports.screenGroups = exports.heartbeats = exports.playEvents = exports.players = exports.creativeApprovals = exports.users = exports.regions = exports.creatives = exports.flightCreatives = exports.flights = exports.bookings = exports.campaigns = exports.screens = exports.vehicles = exports.publisherProfiles = exports.publisherTypeEnum = exports.organisations = exports.userRoleEnum = exports.screenStatusEnum = exports.orgTypeEnum = void 0;
// src/db/schema.ts
const pg_core_1 = require("drizzle-orm/pg-core");
// --- Enums ---
exports.orgTypeEnum = (0, pg_core_1.pgEnum)("org_type", [
    "advertiser",
    "publisher",
    "beamer_internal",
]);
exports.screenStatusEnum = (0, pg_core_1.pgEnum)("screen_status", [
    "active",
    "inactive",
    "maintenance",
]);
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", [
    "admin",
    "ops",
    "viewer",
]);
// --- Organisations ---
exports.organisations = (0, pg_core_1.pgTable)("organisations", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    type: (0, exports.orgTypeEnum)("type").notNull(),
    billingEmail: (0, pg_core_1.varchar)("billing_email", { length: 255 }).notNull(),
    country: (0, pg_core_1.varchar)("country", { length: 2 }).notNull(), // ISO country code
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    // Phase 3A: Organisation category for publisher/advertiser separation
    organisationCategory: (0, exports.orgTypeEnum)("organisation_category").notNull().default("advertiser"),
});
// --- Publisher Profiles (Phase 3A) ---
exports.publisherTypeEnum = (0, pg_core_1.pgEnum)("publisher_type", [
    "organisation",
    "individual",
]);
exports.publisherProfiles = (0, pg_core_1.pgTable)("publisher_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    organisationId: (0, pg_core_1.uuid)("organisation_id").references(() => exports.organisations.id),
    publisherType: (0, exports.publisherTypeEnum)("publisher_type").notNull(),
    fullName: (0, pg_core_1.text)("full_name"),
    phoneNumber: (0, pg_core_1.text)("phone_number"),
    email: (0, pg_core_1.text)("email"),
    address: (0, pg_core_1.text)("address"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Vehicles (Phase 1: Vehicle metadata) ---
exports.vehicles = (0, pg_core_1.pgTable)("vehicles", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    publisherOrgId: (0, pg_core_1.uuid)("publisher_org_id")
        .notNull()
        .references(() => exports.organisations.id),
    identifier: (0, pg_core_1.text)("identifier"),
    licencePlate: (0, pg_core_1.text)("licence_plate"),
    make: (0, pg_core_1.text)("make"),
    model: (0, pg_core_1.text)("model"),
    year: (0, pg_core_1.text)("year"),
    colour: (0, pg_core_1.text)("colour"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Screens ---
exports.screens = (0, pg_core_1.pgTable)("screens", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    // Phase 3B: Auto-generated screen code (primary identifier)
    code: (0, pg_core_1.text)("code").notNull().unique(),
    // Publisher org ID remains NOT NULL for data integrity (Phase 3A dual-FK strategy)
    publisherOrgId: (0, pg_core_1.uuid)("publisher_org_id")
        .notNull()
        .references(() => exports.organisations.id),
    // Phase 3B: Name is now optional (code is the primary identifier)
    name: (0, pg_core_1.varchar)("name", { length: 255 }),
    screenType: (0, pg_core_1.varchar)("screen_type", { length: 50 }).notNull(), // taxi_top, billboard, etc.
    resolutionWidth: (0, pg_core_1.integer)("resolution_width").notNull(),
    resolutionHeight: (0, pg_core_1.integer)("resolution_height").notNull(),
    city: (0, pg_core_1.varchar)("city", { length: 100 }).notNull(),
    regionCode: (0, pg_core_1.varchar)("region_code", { length: 10 }).notNull(), // e.g. NG, KE
    lat: (0, pg_core_1.varchar)("lat", { length: 50 }).notNull(),
    lng: (0, pg_core_1.varchar)("lng", { length: 50 }).notNull(),
    status: (0, exports.screenStatusEnum)("status").notNull().default("active"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    // Phase 3A: New publisher profile reference (nullable for migration, will be required later)
    publisherId: (0, pg_core_1.uuid)("publisher_id").references(() => exports.publisherProfiles.id),
    // Phase 1: Extended metadata (all nullable, non-breaking)
    screenClassification: (0, pg_core_1.text)("screen_classification").default("vehicle"), // vehicle, billboard, indoor
    vehicleId: (0, pg_core_1.text)("vehicle_id").references(() => exports.vehicles.id),
    // Billboard/static OOH metadata
    structureType: (0, pg_core_1.text)("structure_type"),
    sizeDescription: (0, pg_core_1.text)("size_description"),
    illuminationType: (0, pg_core_1.text)("illumination_type"),
    address: (0, pg_core_1.text)("address"),
    // Indoor metadata
    venueName: (0, pg_core_1.text)("venue_name"),
    venueType: (0, pg_core_1.text)("venue_type"),
    venueAddress: (0, pg_core_1.text)("venue_address"),
    // Geographic coordinates (nullable, more precise than existing lat/lng strings)
    latitude: (0, pg_core_1.numeric)("latitude", { precision: 10, scale: 7 }),
    longitude: (0, pg_core_1.numeric)("longitude", { precision: 10, scale: 7 }),
    // Phase 3B: Last known position timestamp (for vehicle screens)
    lastSeenAt: (0, pg_core_1.timestamp)("last_seen_at", { withTimezone: true }),
});
// --- Campaigns ---
exports.campaigns = (0, pg_core_1.pgTable)("campaigns", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    advertiserOrgId: (0, pg_core_1.uuid)("advertiser_org_id")
        .notNull()
        .references(() => exports.organisations.id),
    name: (0, pg_core_1.text)("name").notNull(),
    objective: (0, pg_core_1.text)("objective"),
    startDate: (0, pg_core_1.date)("start_date").notNull(),
    endDate: (0, pg_core_1.date)("end_date").notNull(),
    totalBudget: (0, pg_core_1.integer)("total_budget").notNull(),
    currency: (0, pg_core_1.text)("currency").notNull(),
    status: (0, pg_core_1.text)("status").notNull(),
    targetingJson: (0, pg_core_1.jsonb)("targeting_json"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Bookings (forward declaration for flights reference) ---
exports.bookings = (0, pg_core_1.pgTable)("bookings", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    advertiserOrgId: (0, pg_core_1.uuid)("advertiser_org_id")
        .notNull()
        .references(() => exports.organisations.id),
    campaignId: (0, pg_core_1.uuid)("campaign_id")
        .notNull()
        .references(() => exports.campaigns.id),
    startDate: (0, pg_core_1.date)("start_date").notNull(),
    endDate: (0, pg_core_1.date)("end_date").notNull(),
    currency: (0, pg_core_1.varchar)("currency", { length: 255 }).notNull(),
    billingModel: (0, pg_core_1.varchar)("billing_model", { length: 255 }).notNull(),
    rate: (0, pg_core_1.integer)("rate").notNull(),
    agreedImpressions: (0, pg_core_1.integer)("agreed_impressions"),
    agreedAmountMinor: (0, pg_core_1.integer)("agreed_amount_minor"),
    status: (0, pg_core_1.varchar)("status", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Flights ---
exports.flights = (0, pg_core_1.pgTable)("flights", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    campaignId: (0, pg_core_1.uuid)("campaign_id")
        .notNull()
        .references(() => exports.campaigns.id, { onDelete: "cascade" }),
    defaultBookingId: (0, pg_core_1.uuid)("default_booking_id")
        .references(() => exports.bookings.id),
    name: (0, pg_core_1.text)("name").notNull(),
    startDatetime: (0, pg_core_1.timestamp)("start_datetime", { withTimezone: true }).notNull(),
    endDatetime: (0, pg_core_1.timestamp)("end_datetime", { withTimezone: true }).notNull(),
    targetType: (0, pg_core_1.text)("target_type").notNull(),
    targetId: (0, pg_core_1.uuid)("target_id").notNull(),
    maxImpressions: (0, pg_core_1.integer)("max_impressions"),
    status: (0, pg_core_1.text)("status").notNull().default("scheduled"),
});
// --- Flight Creatives ---
exports.flightCreatives = (0, pg_core_1.pgTable)("flight_creatives", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    flightId: (0, pg_core_1.uuid)("flight_id")
        .notNull()
        .references(() => exports.flights.id, { onDelete: "cascade" }),
    creativeId: (0, pg_core_1.uuid)("creative_id").notNull(),
    weight: (0, pg_core_1.integer)("weight").notNull().default(1),
});
// --- Creatives ---
exports.creatives = (0, pg_core_1.pgTable)("creatives", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    campaignId: (0, pg_core_1.uuid)("campaign_id")
        .notNull()
        .references(() => exports.campaigns.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    fileUrl: (0, pg_core_1.text)("file_url").notNull(),
    mimeType: (0, pg_core_1.varchar)("mime_type", { length: 100 }).notNull(),
    durationSeconds: (0, pg_core_1.integer)("duration_seconds").notNull(),
    width: (0, pg_core_1.integer)("width").notNull(),
    height: (0, pg_core_1.integer)("height").notNull(),
    status: (0, pg_core_1.text)("status").notNull().default("pending_review"),
    regionsRequired: (0, pg_core_1.text)("regions_required").array().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Regions ---
exports.regions = (0, pg_core_1.pgTable)("regions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)("name").notNull(),
    code: (0, pg_core_1.text)("code").notNull().unique(),
    regulatorName: (0, pg_core_1.text)("regulator_name"),
    requiresPreApproval: (0, pg_core_1.boolean)("requires_pre_approval"),
    regulationNotes: (0, pg_core_1.text)("regulation_notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at")
        .defaultNow()
        .notNull(),
});
// --- Users ---
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.text)("password_hash").notNull(),
    fullName: (0, pg_core_1.varchar)("full_name", { length: 255 }).notNull(),
    orgId: (0, pg_core_1.uuid)("org_id")
        .notNull()
        .references(() => exports.organisations.id),
    role: (0, exports.userRoleEnum)("role").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Creative Approvals ---
exports.creativeApprovals = (0, pg_core_1.pgTable)("creative_approvals", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    creativeId: (0, pg_core_1.uuid)("creative_id")
        .notNull()
        .references(() => exports.creatives.id, { onDelete: "cascade" }),
    regionId: (0, pg_core_1.uuid)("region_id")
        .notNull()
        .references(() => exports.regions.id),
    status: (0, pg_core_1.text)("status").notNull(),
    approvalCode: (0, pg_core_1.text)("approval_code"),
    documents: (0, pg_core_1.jsonb)("documents"),
    approvedByUserId: (0, pg_core_1.uuid)("approved_by_user_id").references(() => exports.users.id),
    approvedAt: (0, pg_core_1.timestamp)("approved_at", { withTimezone: true }),
    rejectedReason: (0, pg_core_1.text)("rejected_reason"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => ({
    uniqueCreativeRegion: (0, pg_core_1.unique)().on(table.creativeId, table.regionId),
}));
// --- Players ---
exports.players = (0, pg_core_1.pgTable)("players", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    screenId: (0, pg_core_1.uuid)("screen_id")
        .notNull()
        .references(() => exports.screens.id),
    authToken: (0, pg_core_1.text)("auth_token").notNull(),
    lastSeenAt: (0, pg_core_1.timestamp)("last_seen_at", { withTimezone: true }),
    softwareVersion: (0, pg_core_1.text)("software_version"),
    configHash: (0, pg_core_1.text)("config_hash"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Play Events ---
exports.playEvents = (0, pg_core_1.pgTable)("play_events", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    playerId: (0, pg_core_1.text)("player_id")
        .notNull()
        .references(() => exports.players.id),
    screenId: (0, pg_core_1.uuid)("screen_id")
        .notNull()
        .references(() => exports.screens.id),
    creativeId: (0, pg_core_1.uuid)("creative_id")
        .notNull()
        .references(() => exports.creatives.id),
    campaignId: (0, pg_core_1.uuid)("campaign_id")
        .notNull()
        .references(() => exports.campaigns.id),
    flightId: (0, pg_core_1.uuid)("flight_id").references(() => exports.flights.id),
    startedAt: (0, pg_core_1.timestamp)("started_at", { withTimezone: true }).notNull(),
    durationSeconds: (0, pg_core_1.integer)("duration_seconds").notNull(),
    playStatus: (0, pg_core_1.text)("play_status").notNull(),
    lat: (0, pg_core_1.numeric)("lat", { precision: 10, scale: 7 }),
    lng: (0, pg_core_1.numeric)("lng", { precision: 10, scale: 7 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Heartbeats ---
exports.heartbeats = (0, pg_core_1.pgTable)("heartbeats", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    playerId: (0, pg_core_1.text)("player_id")
        .notNull()
        .references(() => exports.players.id),
    screenId: (0, pg_core_1.uuid)("screen_id")
        .notNull()
        .references(() => exports.screens.id),
    timestamp: (0, pg_core_1.timestamp)("timestamp", { withTimezone: true }).notNull(),
    status: (0, pg_core_1.text)("status").notNull(),
    softwareVersion: (0, pg_core_1.varchar)("software_version", { length: 50 }),
    storageFreeMb: (0, pg_core_1.integer)("storage_free_mb"),
    cpuUsage: (0, pg_core_1.numeric)("cpu_usage", { precision: 5, scale: 2 }),
    networkType: (0, pg_core_1.varchar)("network_type", { length: 20 }),
    signalStrength: (0, pg_core_1.integer)("signal_strength"),
    lat: (0, pg_core_1.numeric)("lat", { precision: 10, scale: 7 }),
    lng: (0, pg_core_1.numeric)("lng", { precision: 10, scale: 7 }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Screen Groups ---
exports.screenGroups = (0, pg_core_1.pgTable)("screen_groups", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    publisherOrgId: (0, pg_core_1.uuid)("publisher_org_id")
        .notNull()
        .references(() => exports.organisations.id),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
exports.screenGroupMembers = (0, pg_core_1.pgTable)("screen_group_members", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    groupId: (0, pg_core_1.uuid)("group_id")
        .notNull()
        .references(() => exports.screenGroups.id, { onDelete: "cascade" }),
    screenId: (0, pg_core_1.uuid)("screen_id")
        .notNull()
        .references(() => exports.screens.id, { onDelete: "cascade" }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => ({
    uniqueGroupScreen: (0, pg_core_1.unique)().on(table.groupId, table.screenId),
}));
// --- Booking-Flights Junction Table ---
exports.bookingFlights = (0, pg_core_1.pgTable)("booking_flights", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    bookingId: (0, pg_core_1.uuid)("booking_id")
        .notNull()
        .references(() => exports.bookings.id, { onDelete: "cascade" }),
    flightId: (0, pg_core_1.uuid)("flight_id")
        .notNull()
        .references(() => exports.flights.id, { onDelete: "cascade" }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (table) => ({
    uniqueBookingFlight: (0, pg_core_1.unique)().on(table.bookingId, table.flightId),
}));
// --- Screen Location History (Phase 3B) ---
exports.screenLocationHistory = (0, pg_core_1.pgTable)("screen_location_history", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    screenId: (0, pg_core_1.uuid)("screen_id")
        .notNull()
        .references(() => exports.screens.id, { onDelete: "cascade" }),
    playerId: (0, pg_core_1.text)("player_id").references(() => exports.players.id),
    recordedAt: (0, pg_core_1.timestamp)("recorded_at", { withTimezone: true }).notNull(),
    latitude: (0, pg_core_1.numeric)("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: (0, pg_core_1.numeric)("longitude", { precision: 10, scale: 7 }).notNull(),
    source: (0, pg_core_1.text)("source").notNull().default("heartbeat"),
});
// --- Password Reset Tokens ---
exports.passwordResetTokens = (0, pg_core_1.pgTable)("password_reset_tokens", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at", { withTimezone: true }).notNull(),
    usedAt: (0, pg_core_1.timestamp)("used_at", { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
// --- Invoices ---
exports.invoices = (0, pg_core_1.pgTable)("invoices", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    bookingId: (0, pg_core_1.uuid)("booking_id")
        .notNull()
        .references(() => exports.bookings.id),
    invoiceNumber: (0, pg_core_1.varchar)("invoice_number", { length: 50 }).notNull().unique(),
    issuedDate: (0, pg_core_1.date)("issued_date").notNull(),
    dueDate: (0, pg_core_1.date)("due_date").notNull(),
    totalAmount: (0, pg_core_1.integer)("total_amount").notNull(),
    currency: (0, pg_core_1.text)("currency").notNull(),
    status: (0, pg_core_1.text)("status").notNull(),
    paidAt: (0, pg_core_1.timestamp)("paid_at", { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
