import { Router, Response, NextFunction } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import {
  listScreenGroups,
  getScreenGroup,
  createScreenGroup,
  updateScreenGroup,
  archiveScreenGroup,
  deleteScreenGroup,
  getGroupMembers,
  addGroupMembers,
  removeGroupMembers,
  resolveScreenNamesToIds,
  getGroupsTargetingFlights,
  getGroupHealth,
} from "./screenGroups.service";
import { db } from "../../db/client";
import { screenGroups, organisations } from "../../db/schema";
import { eq } from "drizzle-orm";

export const screenGroupsRouter = Router();

function isBeamerInternal(req: AuthRequest): boolean {
  return req.user?.orgType === "beamer_internal";
}

function canAccessGroup(req: AuthRequest, groupOrgId: string): boolean {
  if (!req.user) return false;
  if (isBeamerInternal(req)) return true;
  return req.user.orgId === groupOrgId;
}

function canModifyGroup(req: AuthRequest, groupOrgId: string): boolean {
  if (!req.user) return false;
  if (isBeamerInternal(req)) return true;
  if (req.user.orgId === groupOrgId) {
    return req.user.role === "admin" || req.user.role === "ops";
  }
  return false;
}

async function validateOrgId(orgId: string): Promise<boolean> {
  const [org] = await db
    .select({ id: organisations.id })
    .from(organisations)
    .where(eq(organisations.id, orgId))
    .limit(1);
  return !!org;
}

async function getGroupOrgId(groupId: string): Promise<string | null> {
  const [group] = await db
    .select({ orgId: screenGroups.orgId })
    .from(screenGroups)
    .where(eq(screenGroups.id, groupId))
    .limit(1);
  return group?.orgId || null;
}

screenGroupsRouter.get(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let orgId = req.query.org_id as string | undefined;
      const q = req.query.q as string | undefined;
      const archived = req.query.archived === "true";

      if (!isBeamerInternal(req)) {
        orgId = req.user!.orgId;
      }

      if (!orgId && !isBeamerInternal(req)) {
        return res.status(400).json({ 
          error: "org_id is required for non-internal users" 
        });
      }

      const result = await listScreenGroups({
        orgId,
        q,
        archived,
        isBeamerInternal: isBeamerInternal(req),
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

screenGroupsRouter.post(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { org_id, name, description } = req.body;

      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "name is required" });
      }

      if (name.length > 100) {
        return res.status(400).json({ error: "name must be 100 characters or less" });
      }

      if (name.trim().length === 0) {
        return res.status(400).json({ error: "name cannot be blank" });
      }

      let orgId = org_id;
      if (!isBeamerInternal(req)) {
        orgId = req.user!.orgId;
      }

      if (!orgId) {
        return res.status(400).json({ error: "org_id is required" });
      }

      const orgExists = await validateOrgId(orgId);
      if (!orgExists) {
        return res.status(400).json({ error: "Organisation not found" });
      }

      if (!canModifyGroup(req, orgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const created = await createScreenGroup({
        orgId,
        name: name.trim(),
        description: description?.trim(),
      });

      res.status(201).json({
        status: "success",
        data: created,
        message: `Created screen group "${created.name}"`,
      });
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        return res.status(409).json({ error: err.message });
      }
      next(err);
    }
  }
);

screenGroupsRouter.get(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const groupId = req.params.id;
      const group = await getScreenGroup(groupId);

      if (!group) {
        return res.status(404).json({ error: "Screen group not found" });
      }

      if (!canAccessGroup(req, group.orgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      res.json({ status: "success", data: group });
    } catch (err) {
      next(err);
    }
  }
);

screenGroupsRouter.patch(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const groupId = req.params.id;
      const { name, description, is_archived } = req.body;

      const groupOrgId = await getGroupOrgId(groupId);
      if (!groupOrgId) {
        return res.status(404).json({ error: "Screen group not found" });
      }

      if (!canModifyGroup(req, groupOrgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          return res.status(400).json({ error: "name cannot be blank" });
        }
        if (name.length > 100) {
          return res.status(400).json({ error: "name must be 100 characters or less" });
        }
      }

      const updated = await updateScreenGroup(groupId, {
        name: name?.trim(),
        description: description !== undefined ? description?.trim() : undefined,
        isArchived: is_archived,
      });

      res.json({
        status: "success",
        data: updated,
        message: `Updated screen group "${updated.name}"`,
      });
    } catch (err: any) {
      if (err.message?.includes("already exists")) {
        return res.status(409).json({ error: err.message });
      }
      if (err.message === "Screen group not found") {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

screenGroupsRouter.delete(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const groupId = req.params.id;
      const force = req.query.force === "true";

      const groupOrgId = await getGroupOrgId(groupId);
      if (!groupOrgId) {
        return res.status(404).json({ error: "Screen group not found" });
      }

      if (!canModifyGroup(req, groupOrgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (force && !isBeamerInternal(req)) {
        return res.status(403).json({ 
          error: "Only internal users can permanently delete groups" 
        });
      }

      await deleteScreenGroup(groupId, force);

      res.json({
        status: "success",
        message: force ? "Screen group permanently deleted" : "Screen group archived",
      });
    } catch (err: any) {
      if (err.message?.includes("active flight")) {
        return res.status(409).json({ error: err.message });
      }
      next(err);
    }
  }
);

screenGroupsRouter.get(
  "/:id/members",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const groupId = req.params.id;

      const groupOrgId = await getGroupOrgId(groupId);
      if (!groupOrgId) {
        return res.status(404).json({ error: "Screen group not found" });
      }

      if (!canAccessGroup(req, groupOrgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const status = req.query.status as string | undefined;
      const city = req.query.city as string | undefined;
      const region = req.query.region as string | undefined;
      const q = req.query.q as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.page_size as string) || 50, 100);

      const result = await getGroupMembers(groupId, {
        status,
        city,
        region,
        q,
        page,
        pageSize,
      });

      res.json({
        status: "success",
        data: result.items,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / pageSize),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

screenGroupsRouter.post(
  "/:id/members",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const groupId = req.params.id;
      const { screen_ids } = req.body;

      if (!Array.isArray(screen_ids) || screen_ids.length === 0) {
        return res.status(400).json({ error: "screen_ids array is required" });
      }

      const groupOrgId = await getGroupOrgId(groupId);
      if (!groupOrgId) {
        return res.status(404).json({ error: "Screen group not found" });
      }

      if (!canModifyGroup(req, groupOrgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const result = await addGroupMembers(
        groupId,
        screen_ids,
        req.user!.userId
      );

      res.json({
        status: "success",
        data: result,
        message: `Added ${result.added} screen(s) to group${result.skipped > 0 ? `, ${result.skipped} already existed` : ""}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

screenGroupsRouter.delete(
  "/:id/members",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const groupId = req.params.id;
      const { screen_ids } = req.body;

      if (!Array.isArray(screen_ids) || screen_ids.length === 0) {
        return res.status(400).json({ error: "screen_ids array is required" });
      }

      const groupOrgId = await getGroupOrgId(groupId);
      if (!groupOrgId) {
        return res.status(404).json({ error: "Screen group not found" });
      }

      if (!canModifyGroup(req, groupOrgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const result = await removeGroupMembers(groupId, screen_ids);

      res.json({
        status: "success",
        data: result,
        message: `Removed ${result.removed} screen(s) from group`,
      });
    } catch (err) {
      next(err);
    }
  }
);

screenGroupsRouter.post(
  "/:id/members/upload-csv",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const groupId = req.params.id;
      const { csv_data } = req.body;

      if (!csv_data || typeof csv_data !== "string") {
        return res.status(400).json({ error: "csv_data is required" });
      }

      const groupOrgId = await getGroupOrgId(groupId);
      if (!groupOrgId) {
        return res.status(404).json({ error: "Screen group not found" });
      }

      if (!canModifyGroup(req, groupOrgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const lines = csv_data.trim().split("\n");
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must have header and at least one row" });
      }

      if (lines.length > 10001) {
        return res.status(400).json({ 
          error: "CSV cannot contain more than 10,000 rows" 
        });
      }

      const headerLine = lines[0].toLowerCase().trim();
      const headers = headerLine.split(",").map((h) => h.trim());

      const screenIdIndex = headers.findIndex(
        (h) => h === "screen_id" || h === "screenid" || h === "id"
      );
      const screenNameIndex = headers.findIndex(
        (h) => h === "screen_name" || h === "screenname" || h === "name" || h === "code"
      );

      const identifierIndex = screenIdIndex >= 0 ? screenIdIndex : screenNameIndex;
      if (identifierIndex < 0) {
        return res.status(400).json({
          error: "CSV must have a header column named screen_id, screen_name, id, name, or code",
        });
      }

      const identifiers: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");
        const value = cols[identifierIndex]?.trim();
        if (value) {
          identifiers.push(value);
        }
      }

      const { resolved, notFound } = await resolveScreenNamesToIds(
        groupOrgId,
        identifiers
      );

      const screenIds = resolved.map((r) => r.id);
      const addResult = await addGroupMembers(
        groupId,
        screenIds,
        req.user!.userId
      );

      res.json({
        status: "success",
        data: {
          added: addResult.added,
          skipped: addResult.skipped,
          not_found: notFound.length,
          not_found_items: notFound.slice(0, 20),
        },
        message: `Processed CSV: ${addResult.added} added, ${addResult.skipped} already in group, ${notFound.length} not found`,
      });
    } catch (err) {
      next(err);
    }
  }
);

screenGroupsRouter.get(
  "/:id/flights",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const groupId = req.params.id;

      const groupOrgId = await getGroupOrgId(groupId);
      if (!groupOrgId) {
        return res.status(404).json({ error: "Screen group not found" });
      }

      if (!canAccessGroup(req, groupOrgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const flights = await getGroupsTargetingFlights(groupId);

      res.json({ status: "success", data: flights });
    } catch (err) {
      next(err);
    }
  }
);

screenGroupsRouter.get(
  "/:id/health",
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const groupId = req.params.id;

      const groupOrgId = await getGroupOrgId(groupId);
      if (!groupOrgId) {
        return res.status(404).json({ error: "Screen group not found" });
      }

      if (!canAccessGroup(req, groupOrgId)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const health = await getGroupHealth(groupId);

      res.json({ status: "success", data: health });
    } catch (err) {
      next(err);
    }
  }
);
