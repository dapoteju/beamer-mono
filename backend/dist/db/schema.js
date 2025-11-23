"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.screens = exports.organisations = exports.screenStatusEnum = exports.orgTypeEnum = void 0;
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
});
// --- Screens ---
exports.screens = (0, pg_core_1.pgTable)("screens", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    publisherOrgId: (0, pg_core_1.uuid)("publisher_org_id")
        .notNull()
        .references(() => exports.organisations.id),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
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
});
