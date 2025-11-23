"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrganisations = listOrganisations;
exports.createOrganisation = createOrganisation;
exports.getOrganisation = getOrganisation;
// src/modules/organisations/organisations.service.ts
const client_1 = require("../../db/client");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
async function listOrganisations() {
    return client_1.db.select().from(schema_1.organisations);
}
async function createOrganisation(input) {
    const [created] = await client_1.db
        .insert(schema_1.organisations)
        .values({
        name: input.name,
        type: input.type,
        billingEmail: input.billingEmail,
        country: input.country,
    })
        .returning();
    return created;
}
async function getOrganisation(id) {
    const [org] = await client_1.db
        .select()
        .from(schema_1.organisations)
        .where((0, drizzle_orm_1.eq)(schema_1.organisations.id, id));
    return org ?? null;
}
