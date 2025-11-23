// src/modules/screens/screens.service.ts
import { db } from "../../db/client";
import { screens } from "../../db/schema";
import { eq } from "drizzle-orm";

export async function listScreens() {
  return db.select().from(screens);
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
