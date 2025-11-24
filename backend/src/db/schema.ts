// src/db/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  pgEnum,
  text,
  date,
  jsonb,
  numeric,
  unique,
  boolean,
} from "drizzle-orm/pg-core";

// --- Enums ---

export const orgTypeEnum = pgEnum("org_type", [
  "advertiser",
  "publisher",
  "beamer_internal",
]);

export const screenStatusEnum = pgEnum("screen_status", [
  "active",
  "inactive",
  "maintenance",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "ops",
  "viewer",
]);

// --- Organisations ---

export const organisations = pgTable("organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: orgTypeEnum("type").notNull(),
  billingEmail: varchar("billing_email", { length: 255 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(), // ISO country code
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Screens ---

export const screens = pgTable("screens", {
  id: uuid("id").primaryKey().defaultRandom(),
  publisherOrgId: uuid("publisher_org_id")
    .notNull()
    .references(() => organisations.id),
  name: varchar("name", { length: 255 }).notNull(),
  screenType: varchar("screen_type", { length: 50 }).notNull(), // taxi_top, billboard, etc.
  resolutionWidth: integer("resolution_width").notNull(),
  resolutionHeight: integer("resolution_height").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  regionCode: varchar("region_code", { length: 10 }).notNull(), // e.g. NG, KE
  lat: varchar("lat", { length: 50 }).notNull(),
  lng: varchar("lng", { length: 50 }).notNull(),
  status: screenStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Campaigns ---

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey(),
  advertiserOrgId: uuid("advertiser_org_id")
    .notNull()
    .references(() => organisations.id),
  name: text("name").notNull(),
  objective: text("objective"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalBudget: integer("total_budget").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  targetingJson: jsonb("targeting_json"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Bookings (forward declaration for flights reference) ---

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  advertiserOrgId: uuid("advertiser_org_id")
    .notNull()
    .references(() => organisations.id),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  currency: varchar("currency", { length: 255 }).notNull(),
  billingModel: varchar("billing_model", { length: 255 }).notNull(),
  rate: integer("rate").notNull(),
  agreedImpressions: integer("agreed_impressions"),
  agreedAmountMinor: integer("agreed_amount_minor"),
  status: varchar("status", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Flights ---

export const flights = pgTable("flights", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  defaultBookingId: uuid("default_booking_id")
    .references(() => bookings.id),
  name: text("name").notNull(),
  startDatetime: timestamp("start_datetime", { withTimezone: true }).notNull(),
  endDatetime: timestamp("end_datetime", { withTimezone: true }).notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  maxImpressions: integer("max_impressions"),
  status: text("status").notNull().default("scheduled"),
});

// --- Flight Creatives ---

export const flightCreatives = pgTable("flight_creatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  flightId: uuid("flight_id")
    .notNull()
    .references(() => flights.id, { onDelete: "cascade" }),
  creativeId: uuid("creative_id").notNull(),
  weight: integer("weight").notNull().default(1),
});

// --- Creatives ---

export const creatives = pgTable("creatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  status: text("status").notNull().default("pending_review"),
  regionsRequired: text("regions_required").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Regions ---

export const regions = pgTable("regions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  regulatorName: text("regulator_name"),
  requiresPreApproval: boolean("requires_pre_approval"),
  regulationNotes: text("regulation_notes"),
  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});

// --- Users ---

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organisations.id),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Creative Approvals ---

export const creativeApprovals = pgTable(
  "creative_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creativeId: uuid("creative_id")
      .notNull()
      .references(() => creatives.id, { onDelete: "cascade" }),
    regionId: uuid("region_id")
      .notNull()
      .references(() => regions.id),
    status: text("status").notNull(),
    approvalCode: text("approval_code"),
    documents: jsonb("documents"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueCreativeRegion: unique().on(table.creativeId, table.regionId),
  })
);

// --- Players ---

export const players = pgTable("players", {
  id: text("id").primaryKey(),
  screenId: uuid("screen_id")
    .notNull()
    .references(() => screens.id),
  authToken: text("auth_token").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  softwareVersion: text("software_version"),
  configHash: text("config_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Play Events ---

export const playEvents = pgTable("play_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  screenId: uuid("screen_id")
    .notNull()
    .references(() => screens.id),
  creativeId: uuid("creative_id")
    .notNull()
    .references(() => creatives.id),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id),
  flightId: uuid("flight_id").references(() => flights.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  playStatus: text("play_status").notNull(),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Heartbeats ---

export const heartbeats = pgTable("heartbeats", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  screenId: uuid("screen_id")
    .notNull()
    .references(() => screens.id),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  status: text("status").notNull(),
  softwareVersion: varchar("software_version", { length: 50 }),
  storageFreeMb: integer("storage_free_mb"),
  cpuUsage: numeric("cpu_usage", { precision: 5, scale: 2 }),
  networkType: varchar("network_type", { length: 20 }),
  signalStrength: integer("signal_strength"),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// --- Screen Groups ---

export const screenGroups = pgTable("screen_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  publisherOrgId: uuid("publisher_org_id")
    .notNull()
    .references(() => organisations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const screenGroupMembers = pgTable(
  "screen_group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => screenGroups.id, { onDelete: "cascade" }),
    screenId: uuid("screen_id")
      .notNull()
      .references(() => screens.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueGroupScreen: unique().on(table.groupId, table.screenId),
  })
);

// --- Booking-Flights Junction Table ---

export const bookingFlights = pgTable(
  "booking_flights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    flightId: uuid("flight_id")
      .notNull()
      .references(() => flights.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uniqueBookingFlight: unique().on(table.bookingId, table.flightId),
  })
);

// --- Invoices ---

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  issuedDate: date("issued_date").notNull(),
  dueDate: date("due_date").notNull(),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
