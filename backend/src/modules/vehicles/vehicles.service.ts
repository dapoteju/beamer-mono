import { db } from "../../db/client";
import { vehicles, screens, organisations } from "../../db/schema";
import { eq, and, sql, ilike, or } from "drizzle-orm";

export interface VehicleDto {
  id: string;
  name: string;
  publisherOrgId: string;
  publisherOrgName: string | null;
  externalId: string | null;
  licensePlate: string | null;
  makeModel: string | null;
  city: string | null;
  region: string | null;
  isActive: boolean;
  screensCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVehicleInput {
  publisherOrgId: string;
  name: string;
  externalId?: string;
  licensePlate?: string;
  makeModel?: string;
  city?: string;
  region?: string;
}

export interface UpdateVehicleInput {
  name?: string;
  externalId?: string | null;
  licensePlate?: string | null;
  makeModel?: string | null;
  city?: string | null;
  region?: string | null;
  isActive?: boolean;
}

export interface ListVehiclesFilters {
  publisherOrgId?: string;
  q?: string;
  city?: string;
  region?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listVehicles(filters: ListVehiclesFilters): Promise<{ items: VehicleDto[]; count: number }> {
  const conditions = [];

  if (filters.publisherOrgId) {
    conditions.push(eq(vehicles.publisherOrgId, filters.publisherOrgId));
  }

  if (filters.q) {
    conditions.push(
      or(
        ilike(vehicles.name, `%${filters.q}%`),
        ilike(vehicles.licensePlate, `%${filters.q}%`),
        ilike(vehicles.externalId, `%${filters.q}%`),
        ilike(vehicles.makeModel, `%${filters.q}%`)
      )
    );
  }

  if (filters.city) {
    conditions.push(ilike(vehicles.city, `%${filters.city}%`));
  }

  if (filters.region) {
    conditions.push(ilike(vehicles.region, `%${filters.region}%`));
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(vehicles.isActive, filters.isActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(vehicles)
    .where(whereClause);

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const items = await db
    .select({
      id: vehicles.id,
      name: vehicles.name,
      publisherOrgId: vehicles.publisherOrgId,
      publisherOrgName: organisations.name,
      externalId: vehicles.externalId,
      licensePlate: vehicles.licensePlate,
      makeModel: vehicles.makeModel,
      city: vehicles.city,
      region: vehicles.region,
      isActive: vehicles.isActive,
      createdAt: vehicles.createdAt,
      updatedAt: vehicles.updatedAt,
      screensCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM screens 
        WHERE screens.vehicle_id = ${vehicles.id}
      )`,
    })
    .from(vehicles)
    .leftJoin(organisations, eq(vehicles.publisherOrgId, organisations.id))
    .where(whereClause)
    .orderBy(vehicles.name)
    .limit(pageSize)
    .offset(offset);

  return {
    items: items as VehicleDto[],
    count: countResult?.count || 0,
  };
}

export async function getVehicleById(id: string): Promise<VehicleDto | null> {
  const [vehicle] = await db
    .select({
      id: vehicles.id,
      name: vehicles.name,
      publisherOrgId: vehicles.publisherOrgId,
      publisherOrgName: organisations.name,
      externalId: vehicles.externalId,
      licensePlate: vehicles.licensePlate,
      makeModel: vehicles.makeModel,
      city: vehicles.city,
      region: vehicles.region,
      isActive: vehicles.isActive,
      createdAt: vehicles.createdAt,
      updatedAt: vehicles.updatedAt,
      screensCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM screens 
        WHERE screens.vehicle_id = ${vehicles.id}
      )`,
    })
    .from(vehicles)
    .leftJoin(organisations, eq(vehicles.publisherOrgId, organisations.id))
    .where(eq(vehicles.id, id));

  return vehicle as VehicleDto | null;
}

export async function createVehicle(input: CreateVehicleInput): Promise<VehicleDto> {
  const [created] = await db
    .insert(vehicles)
    .values({
      name: input.name,
      publisherOrgId: input.publisherOrgId,
      externalId: input.externalId || null,
      licensePlate: input.licensePlate || null,
      makeModel: input.makeModel || null,
      city: input.city || null,
      region: input.region || null,
      isActive: true,
    })
    .returning();

  return getVehicleById(created.id) as Promise<VehicleDto>;
}

export async function updateVehicle(id: string, input: UpdateVehicleInput): Promise<VehicleDto> {
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateData.name = input.name;
  if (input.externalId !== undefined) updateData.externalId = input.externalId;
  if (input.licensePlate !== undefined) updateData.licensePlate = input.licensePlate;
  if (input.makeModel !== undefined) updateData.makeModel = input.makeModel;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.region !== undefined) updateData.region = input.region;
  if (input.isActive !== undefined) updateData.isActive = input.isActive;

  await db
    .update(vehicles)
    .set(updateData)
    .where(eq(vehicles.id, id));

  return getVehicleById(id) as Promise<VehicleDto>;
}

export async function deactivateVehicle(id: string, force: boolean = false): Promise<{ success: boolean; message?: string }> {
  const activeScreensCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(screens)
    .where(and(eq(screens.vehicleId, id), eq(screens.isActive, true)));

  const count = activeScreensCount[0]?.count || 0;

  if (count > 0 && !force) {
    return {
      success: false,
      message: `Cannot deactivate vehicle: ${count} active screen(s) linked. Use force=true to unlink screens.`,
    };
  }

  if (force && count > 0) {
    await db
      .update(screens)
      .set({ vehicleId: null })
      .where(eq(screens.vehicleId, id));
  }

  await db
    .update(vehicles)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(vehicles.id, id));

  return { success: true };
}

export async function getVehicleScreens(vehicleId: string): Promise<Array<{
  id: string;
  code: string;
  name: string | null;
  widthPx: number;
  heightPx: number;
  orientation: string;
  screenType: string;
  city: string;
  region: string;
  isActive: boolean;
  isOnline: boolean;
  lastSeenAt: Date | null;
}>> {
  const vehicleScreens = await db
    .select({
      id: screens.id,
      code: screens.code,
      name: screens.name,
      widthPx: screens.widthPx,
      heightPx: screens.heightPx,
      orientation: screens.orientation,
      screenType: screens.screenType,
      city: screens.city,
      region: screens.regionCode,
      isActive: screens.isActive,
      lastSeenAt: screens.lastSeenAt,
    })
    .from(screens)
    .where(eq(screens.vehicleId, vehicleId))
    .orderBy(screens.code);

  const now = new Date();

  return vehicleScreens.map(s => ({
    ...s,
    region: s.region,
    isOnline: s.lastSeenAt
      ? now.getTime() - new Date(s.lastSeenAt).getTime() < 2 * 60 * 1000
      : false,
  }));
}

export async function validatePublisherOrg(orgId: string): Promise<{ valid: boolean; type?: string }> {
  const [org] = await db
    .select({ type: organisations.type })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);

  if (!org) return { valid: false };
  return { valid: org.type === 'publisher', type: org.type };
}
