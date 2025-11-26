import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { db } from "../db/client";
import { screenGroups } from "../db/schema";
import { eq } from "drizzle-orm";

export interface GroupAccessRequest extends AuthRequest {
  groupPublisherOrgId?: string;
}

export function isBeamerInternal(req: AuthRequest): boolean {
  return req.user?.orgType === "beamer_internal";
}

export function canAccessGroup(req: AuthRequest, groupPublisherOrgId: string): boolean {
  if (!req.user) return false;
  if (isBeamerInternal(req)) return true;
  return req.user.orgId === groupPublisherOrgId;
}

export function canModifyGroup(req: AuthRequest, groupPublisherOrgId: string): boolean {
  if (!req.user) return false;
  if (isBeamerInternal(req)) return true;
  if (req.user.orgId === groupPublisherOrgId) {
    return req.user.role === "admin" || req.user.role === "ops";
  }
  return false;
}

export async function getGroupPublisherOrgId(groupId: string): Promise<string | null> {
  const [group] = await db
    .select({ publisherOrgId: screenGroups.orgId })
    .from(screenGroups)
    .where(eq(screenGroups.id, groupId))
    .limit(1);
  return group?.publisherOrgId || null;
}

export async function requirePublisherAccess(
  req: GroupAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const groupId = req.params.id;
    
    if (!groupId) {
      res.status(400).json({ message: "Group ID is required" });
      return;
    }

    const [group] = await db
      .select({ 
        publisherOrgId: screenGroups.orgId,
        isArchived: screenGroups.isArchived 
      })
      .from(screenGroups)
      .where(eq(screenGroups.id, groupId))
      .limit(1);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!isBeamerInternal(req) && user.orgId !== group.publisherOrgId) {
      res.status(403).json({ message: "Forbidden: cross-publisher access denied" });
      return;
    }

    req.groupPublisherOrgId = group.publisherOrgId;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requirePublisherModifyAccess(
  req: GroupAccessRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const groupId = req.params.id;
    
    if (!groupId) {
      res.status(400).json({ message: "Group ID is required" });
      return;
    }

    const [group] = await db
      .select({ 
        publisherOrgId: screenGroups.orgId,
        isArchived: screenGroups.isArchived 
      })
      .from(screenGroups)
      .where(eq(screenGroups.id, groupId))
      .limit(1);

    if (!group) {
      res.status(404).json({ message: "Group not found" });
      return;
    }

    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!canModifyGroup(req, group.publisherOrgId)) {
      res.status(403).json({ message: "Forbidden: cross-publisher access denied" });
      return;
    }

    req.groupPublisherOrgId = group.publisherOrgId;
    next();
  } catch (err) {
    next(err);
  }
}

export async function validateGroupIdsForPublisher(
  groupIds: string[],
  req: AuthRequest
): Promise<{ valid: boolean; invalidGroupIds: string[]; error?: string }> {
  if (groupIds.length === 0) {
    return { valid: true, invalidGroupIds: [] };
  }

  if (isBeamerInternal(req)) {
    return { valid: true, invalidGroupIds: [] };
  }

  const userOrgId = req.user?.orgId;
  if (!userOrgId) {
    return { valid: false, invalidGroupIds: groupIds, error: "User organization not found" };
  }

  const groups = await db
    .select({ id: screenGroups.id, publisherOrgId: screenGroups.orgId })
    .from(screenGroups)
    .where(eq(screenGroups.orgId, userOrgId));

  const validGroupIds = new Set(groups.map(g => g.id));
  const invalidGroupIds = groupIds.filter(id => !validGroupIds.has(id));

  if (invalidGroupIds.length > 0) {
    return { 
      valid: false, 
      invalidGroupIds, 
      error: "Cross-publisher access denied for some groups" 
    };
  }

  return { valid: true, invalidGroupIds: [] };
}
