// src/modules/organisations/organisations.service.ts
import { db } from "../../db/client";
import { organisations } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function listOrganisations() {
  return db.select().from(organisations);
}

export async function createOrganisation(input: {
  name: string;
  type: "advertiser" | "publisher" | "beamer_internal";
  billingEmail: string;
  country: string;
}) {
  const [created] = await db
    .insert(organisations)
    .values({
      name: input.name,
      type: input.type,
      billingEmail: input.billingEmail,
      country: input.country,
    })
    .returning();

  return created;
}

export async function getOrganisation(id: string) {
  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, id));

  return org ?? null;
}
