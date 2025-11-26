import { db } from "../../db/client";
import { 
  screenGroups, 
  screenGroupMemberships, 
  screens, 
  organisations, 
  users,
  players,
  heartbeats,
  flights,
  campaigns,
  playEvents
} from "../../db/schema";
import { eq, and, sql, desc, ilike, or, inArray, count } from "drizzle-orm";

export interface ScreenGroupWithCounts {
  id: string;
  orgId: string;
  orgName: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  screenCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScreenGroupDetail {
  id: string;
  orgId: string;
  orgName: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  screenCount: number;
  onlineCount: number;
  offlineCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  screenId: string;
  screenCode: string;
  screenName: string | null;
  city: string;
  regionCode: string;
  status: string;
  resolutionWidth: number;
  resolutionHeight: number;
  isOnline: boolean;
  lastSeenAt: Date | null;
  addedAt: Date;
  addedByUserId: string | null;
  addedByUserName: string | null;
  groupCount: number;
}

export async function listScreenGroups(params: {
  orgId?: string;
  q?: string;
  archived?: boolean;
  isBeamerInternal: boolean;
}): Promise<{ items: ScreenGroupWithCounts[]; count: number }> {
  const conditions = [];

  if (params.orgId) {
    conditions.push(eq(screenGroups.orgId, params.orgId));
  } else if (!params.isBeamerInternal) {
    return { items: [], count: 0 };
  }

  if (params.archived !== undefined) {
    conditions.push(eq(screenGroups.isArchived, params.archived));
  } else {
    conditions.push(eq(screenGroups.isArchived, false));
  }

  if (params.q) {
    conditions.push(
      or(
        ilike(screenGroups.name, `%${params.q}%`),
        ilike(screenGroups.description, `%${params.q}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const groups = await db
    .select({
      id: screenGroups.id,
      orgId: screenGroups.orgId,
      orgName: organisations.name,
      name: screenGroups.name,
      description: screenGroups.description,
      isArchived: screenGroups.isArchived,
      createdAt: screenGroups.createdAt,
      updatedAt: screenGroups.updatedAt,
      screenCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM ${screenGroupMemberships} 
        WHERE ${screenGroupMemberships.groupId} = ${screenGroups.id}
      )`,
    })
    .from(screenGroups)
    .leftJoin(organisations, eq(screenGroups.orgId, organisations.id))
    .where(whereClause)
    .orderBy(desc(screenGroups.updatedAt));

  return {
    items: groups as ScreenGroupWithCounts[],
    count: groups.length,
  };
}

export async function getScreenGroup(id: string): Promise<ScreenGroupDetail | null> {
  const [group] = await db
    .select({
      id: screenGroups.id,
      orgId: screenGroups.orgId,
      orgName: organisations.name,
      name: screenGroups.name,
      description: screenGroups.description,
      isArchived: screenGroups.isArchived,
      createdAt: screenGroups.createdAt,
      updatedAt: screenGroups.updatedAt,
    })
    .from(screenGroups)
    .leftJoin(organisations, eq(screenGroups.orgId, organisations.id))
    .where(eq(screenGroups.id, id));

  if (!group) return null;

  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

  const memberStats = await db
    .select({
      screenId: screenGroupMemberships.screenId,
      lastHeartbeat: sql<Date | null>`(
        SELECT MAX(h.timestamp) 
        FROM ${heartbeats} h 
        JOIN ${players} p ON h.player_id = p.id
        WHERE p.screen_id = ${screenGroupMemberships.screenId}
      )`,
    })
    .from(screenGroupMemberships)
    .where(eq(screenGroupMemberships.groupId, id));

  let onlineCount = 0;
  let offlineCount = 0;

  for (const member of memberStats) {
    if (member.lastHeartbeat && new Date(member.lastHeartbeat) > twoMinutesAgo) {
      onlineCount++;
    } else {
      offlineCount++;
    }
  }

  return {
    ...group,
    orgName: group.orgName || '',
    screenCount: memberStats.length,
    onlineCount,
    offlineCount,
  };
}

export async function createScreenGroup(input: {
  orgId: string;
  name: string;
  description?: string;
}): Promise<{ id: string; name: string }> {
  const existing = await db
    .select({ id: screenGroups.id })
    .from(screenGroups)
    .where(
      and(
        eq(screenGroups.orgId, input.orgId),
        sql`lower(${screenGroups.name}) = lower(${input.name})`,
        eq(screenGroups.isArchived, false)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error(`A group with name "${input.name}" already exists in this organisation`);
  }

  const [created] = await db
    .insert(screenGroups)
    .values({
      orgId: input.orgId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    })
    .returning({ id: screenGroups.id, name: screenGroups.name });

  return created;
}

export async function updateScreenGroup(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    isArchived?: boolean;
  }
): Promise<{ id: string; name: string }> {
  const [existing] = await db
    .select({ orgId: screenGroups.orgId, name: screenGroups.name })
    .from(screenGroups)
    .where(eq(screenGroups.id, id));

  if (!existing) {
    throw new Error("Screen group not found");
  }

  if (input.name && input.name !== existing.name) {
    const duplicate = await db
      .select({ id: screenGroups.id })
      .from(screenGroups)
      .where(
        and(
          eq(screenGroups.orgId, existing.orgId),
          sql`lower(${screenGroups.name}) = lower(${input.name})`,
          eq(screenGroups.isArchived, false),
          sql`${screenGroups.id} != ${id}`
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      throw new Error(`A group with name "${input.name}" already exists in this organisation`);
    }
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }
  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }
  if (input.isArchived !== undefined) {
    updateData.isArchived = input.isArchived;
  }

  const [updated] = await db
    .update(screenGroups)
    .set(updateData)
    .where(eq(screenGroups.id, id))
    .returning({ id: screenGroups.id, name: screenGroups.name });

  return updated;
}

export async function archiveScreenGroup(id: string): Promise<void> {
  const activeFlights = await db
    .select({ id: flights.id, name: flights.name })
    .from(flights)
    .where(
      and(
        eq(flights.targetType, "screen_group"),
        eq(flights.targetId, id),
        eq(flights.status, "active")
      )
    );

  if (activeFlights.length > 0) {
    throw new Error(
      `Cannot archive group: ${activeFlights.length} active flight(s) are targeting this group. Remove targeting first.`
    );
  }

  await db
    .update(screenGroups)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(screenGroups.id, id));
}

export async function deleteScreenGroup(id: string, force: boolean = false): Promise<void> {
  if (!force) {
    return archiveScreenGroup(id);
  }

  await db.delete(screenGroupMemberships).where(eq(screenGroupMemberships.groupId, id));
  await db.delete(screenGroups).where(eq(screenGroups.id, id));
}

export async function getGroupMembers(
  groupId: string,
  params: {
    status?: string;
    city?: string;
    region?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{ items: GroupMember[]; total: number }> {
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(screenGroupMemberships.groupId, groupId)];

  if (params.status) {
    conditions.push(eq(screens.status, params.status as any));
  }
  if (params.city) {
    conditions.push(eq(screens.city, params.city));
  }
  if (params.region) {
    conditions.push(eq(screens.regionCode, params.region));
  }
  if (params.q) {
    const searchCondition = or(
      ilike(screens.name, `%${params.q}%`),
      ilike(screens.code, `%${params.q}%`),
      ilike(screens.city, `%${params.q}%`)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

  const members = await db
    .select({
      screenId: screens.id,
      screenCode: screens.code,
      screenName: screens.name,
      city: screens.city,
      regionCode: screens.regionCode,
      status: screens.status,
      resolutionWidth: screens.resolutionWidth,
      resolutionHeight: screens.resolutionHeight,
      lastSeenAt: screens.lastSeenAt,
      addedAt: screenGroupMemberships.addedAt,
      addedByUserId: screenGroupMemberships.addedByUserId,
      addedByUserName: users.fullName,
      lastHeartbeat: sql<Date | null>`(
        SELECT MAX(h.timestamp) 
        FROM ${heartbeats} h 
        JOIN ${players} p ON h.player_id = p.id
        WHERE p.screen_id = ${screens.id} AND p.is_active = true
      )`,
      groupCount: sql<number>`(
        SELECT COUNT(*)::int 
        FROM ${screenGroupMemberships} sgm
        WHERE sgm.screen_id = ${screens.id}
      )`,
    })
    .from(screenGroupMemberships)
    .innerJoin(screens, eq(screenGroupMemberships.screenId, screens.id))
    .leftJoin(users, eq(screenGroupMemberships.addedByUserId, users.id))
    .where(and(...conditions))
    .orderBy(screens.name)
    .limit(pageSize)
    .offset(offset);

  const [countResult] = await db
    .select({ total: count() })
    .from(screenGroupMemberships)
    .innerJoin(screens, eq(screenGroupMemberships.screenId, screens.id))
    .where(and(...conditions));

  const formattedMembers: GroupMember[] = members.map((m) => ({
    screenId: m.screenId,
    screenCode: m.screenCode,
    screenName: m.screenName,
    city: m.city,
    regionCode: m.regionCode,
    status: m.status,
    resolutionWidth: m.resolutionWidth,
    resolutionHeight: m.resolutionHeight,
    isOnline: m.lastHeartbeat ? new Date(m.lastHeartbeat) > twoMinutesAgo : false,
    lastSeenAt: m.lastSeenAt,
    addedAt: m.addedAt,
    addedByUserId: m.addedByUserId,
    addedByUserName: m.addedByUserName,
    groupCount: m.groupCount,
  }));

  return {
    items: formattedMembers,
    total: countResult?.total || 0,
  };
}

export async function addGroupMembers(
  groupId: string,
  screenIds: string[],
  addedByUserId: string | null
): Promise<{ added: number; skipped: number }> {
  if (screenIds.length === 0) {
    return { added: 0, skipped: 0 };
  }

  const existing = await db
    .select({ screenId: screenGroupMemberships.screenId })
    .from(screenGroupMemberships)
    .where(
      and(
        eq(screenGroupMemberships.groupId, groupId),
        inArray(screenGroupMemberships.screenId, screenIds)
      )
    );

  const existingIds = new Set(existing.map((e) => e.screenId));
  const newIds = screenIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await db.insert(screenGroupMemberships).values(
      newIds.map((screenId) => ({
        groupId,
        screenId,
        addedByUserId,
      }))
    );

    await db
      .update(screenGroups)
      .set({ updatedAt: new Date() })
      .where(eq(screenGroups.id, groupId));
  }

  return {
    added: newIds.length,
    skipped: existingIds.size,
  };
}

export async function removeGroupMembers(
  groupId: string,
  screenIds: string[]
): Promise<{ removed: number }> {
  if (screenIds.length === 0) {
    return { removed: 0 };
  }

  const result = await db
    .delete(screenGroupMemberships)
    .where(
      and(
        eq(screenGroupMemberships.groupId, groupId),
        inArray(screenGroupMemberships.screenId, screenIds)
      )
    )
    .returning({ screenId: screenGroupMemberships.screenId });

  if (result.length > 0) {
    await db
      .update(screenGroups)
      .set({ updatedAt: new Date() })
      .where(eq(screenGroups.id, groupId));
  }

  return { removed: result.length };
}

export async function resolveScreenNamesToIds(
  orgId: string,
  screenIdentifiers: string[]
): Promise<{
  resolved: { identifier: string; id: string }[];
  notFound: string[];
}> {
  if (screenIdentifiers.length === 0) {
    return { resolved: [], notFound: [] };
  }

  const screensData = await db
    .select({
      id: screens.id,
      code: screens.code,
      name: screens.name,
    })
    .from(screens)
    .where(eq(screens.publisherOrgId, orgId));

  const resolved: { identifier: string; id: string }[] = [];
  const notFound: string[] = [];

  for (const identifier of screenIdentifiers) {
    const trimmed = identifier.trim();
    const found = screensData.find(
      (s) =>
        s.id === trimmed ||
        s.code?.toLowerCase() === trimmed.toLowerCase() ||
        s.name?.toLowerCase() === trimmed.toLowerCase()
    );

    if (found) {
      resolved.push({ identifier: trimmed, id: found.id });
    } else {
      notFound.push(trimmed);
    }
  }

  return { resolved, notFound };
}

export async function getGroupsTargetingFlights(groupId: string): Promise<
  Array<{
    flightId: string;
    flightName: string;
    campaignId: string;
    campaignName: string;
    status: string;
    startDatetime: Date;
    endDatetime: Date;
  }>
> {
  const targetingFlights = await db
    .select({
      flightId: flights.id,
      flightName: flights.name,
      campaignId: flights.campaignId,
      campaignName: campaigns.name,
      status: flights.status,
      startDatetime: flights.startDatetime,
      endDatetime: flights.endDatetime,
    })
    .from(flights)
    .innerJoin(campaigns, eq(flights.campaignId, campaigns.id))
    .where(
      and(
        eq(flights.targetType, "screen_group"),
        eq(flights.targetId, groupId)
      )
    )
    .orderBy(desc(flights.startDatetime));

  return targetingFlights;
}

export async function resolveGroupsToScreens(groupIds: string[]): Promise<string[]> {
  if (groupIds.length === 0) return [];

  const members = await db
    .select({ screenId: screenGroupMemberships.screenId })
    .from(screenGroupMemberships)
    .where(inArray(screenGroupMemberships.groupId, groupIds));

  const uniqueScreenIds = [...new Set(members.map((m) => m.screenId))];
  return uniqueScreenIds;
}

export async function getGroupHealth(groupId: string): Promise<{
  totalScreens: number;
  onlineCount: number;
  offlineCount: number;
  regionBreakdown: Record<string, number>;
  resolutionBreakdown: Record<string, number>;
  lastSeenRange: { oldest: Date | null; newest: Date | null };
}> {
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

  const members = await db
    .select({
      screenId: screens.id,
      regionCode: screens.regionCode,
      resolutionWidth: screens.resolutionWidth,
      resolutionHeight: screens.resolutionHeight,
      lastHeartbeat: sql<Date | null>`(
        SELECT MAX(h.timestamp) 
        FROM ${heartbeats} h 
        JOIN ${players} p ON h.player_id = p.id
        WHERE p.screen_id = ${screens.id} AND p.is_active = true
      )`,
    })
    .from(screenGroupMemberships)
    .innerJoin(screens, eq(screenGroupMemberships.screenId, screens.id))
    .where(eq(screenGroupMemberships.groupId, groupId));

  let onlineCount = 0;
  let offlineCount = 0;
  const regionBreakdown: Record<string, number> = {};
  const resolutionBreakdown: Record<string, number> = {};
  let oldestSeen: Date | null = null;
  let newestSeen: Date | null = null;

  for (const member of members) {
    const lastHb = member.lastHeartbeat ? new Date(member.lastHeartbeat) : null;

    if (lastHb && lastHb > twoMinutesAgo) {
      onlineCount++;
    } else {
      offlineCount++;
    }

    regionBreakdown[member.regionCode] = (regionBreakdown[member.regionCode] || 0) + 1;

    const resKey = `${member.resolutionWidth}x${member.resolutionHeight}`;
    resolutionBreakdown[resKey] = (resolutionBreakdown[resKey] || 0) + 1;

    if (lastHb) {
      if (!oldestSeen || lastHb < oldestSeen) oldestSeen = lastHb;
      if (!newestSeen || lastHb > newestSeen) newestSeen = lastHb;
    }
  }

  return {
    totalScreens: members.length,
    onlineCount,
    offlineCount,
    regionBreakdown,
    resolutionBreakdown,
    lastSeenRange: { oldest: oldestSeen, newest: newestSeen },
  };
}

export async function getReportByScreenGroup(
  campaignId: string
): Promise<
  Array<{
    groupId: string;
    groupName: string;
    impressions: number;
    plays: number;
    uniqueScreens: number;
  }>
> {
  const result = await db
    .select({
      groupId: screenGroups.id,
      groupName: screenGroups.name,
      screenId: playEvents.screenId,
    })
    .from(playEvents)
    .innerJoin(screenGroupMemberships, eq(playEvents.screenId, screenGroupMemberships.screenId))
    .innerJoin(screenGroups, eq(screenGroupMemberships.groupId, screenGroups.id))
    .where(eq(playEvents.campaignId, campaignId));

  const groupStats: Record<string, { 
    groupName: string; 
    plays: number; 
    screens: Set<string> 
  }> = {};

  for (const row of result) {
    if (!groupStats[row.groupId]) {
      groupStats[row.groupId] = {
        groupName: row.groupName,
        plays: 0,
        screens: new Set(),
      };
    }
    groupStats[row.groupId].plays++;
    groupStats[row.groupId].screens.add(row.screenId);
  }

  return Object.entries(groupStats).map(([groupId, stats]) => ({
    groupId,
    groupName: stats.groupName,
    impressions: stats.plays,
    plays: stats.plays,
    uniqueScreens: stats.screens.size,
  }));
}
