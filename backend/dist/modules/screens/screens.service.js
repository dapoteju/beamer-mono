"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listScreens = listScreens;
exports.createScreen = createScreen;
exports.getScreen = getScreen;
// src/modules/screens/screens.service.ts
const client_1 = require("../../db/client");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function listScreens() {
    return client_1.db.select().from(schema_1.screens);
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
