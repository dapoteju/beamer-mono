// backend/src/modules/advertisers/advertisers.routes.ts
import { Router, Response, NextFunction } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import {
  listAdvertisers,
  getAdvertiser,
  createAdvertiser,
  updateAdvertiser,
  deleteAdvertiser,
} from "./advertisers.service";

export const advertisersRouter = Router();

// Permission helpers
function canAccessAdvertisers(req: AuthRequest): boolean {
  const { orgType } = req.user!;
  // Internal users can access all advertisers
  // Advertiser users can view their own profile (handled in service)
  return orgType === "beamer_internal" || orgType === "advertiser";
}

function canCreateAdvertiser(req: AuthRequest): boolean {
  const { orgType, role } = req.user!;
  // Only internal admin/ops can create advertisers
  return orgType === "beamer_internal" && (role === "admin" || role === "ops");
}

function canEditAdvertiser(req: AuthRequest): boolean {
  const { orgType, role } = req.user!;
  // Internal admin/ops can edit all advertisers
  return orgType === "beamer_internal" && (role === "admin" || role === "ops");
}

// GET /api/advertisers - List all advertisers
advertisersRouter.get("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessAdvertisers(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const advertisers = await listAdvertisers();

    // If advertiser user, filter to only their own profile
    if (req.user!.orgType === "advertiser") {
      const filtered = advertisers.filter((a) => a.id === req.user!.orgId);
      return res.json(filtered);
    }

    res.json(advertisers);
  } catch (err) {
    next(err);
  }
});

// GET /api/advertisers/:id - Get advertiser by ID
advertisersRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessAdvertisers(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const advertiser = await getAdvertiser(req.params.id);
    if (!advertiser) {
      return res.status(404).json({ error: "Advertiser not found" });
    }

    // If advertiser user, ensure they can only view their own profile
    if (req.user!.orgType === "advertiser" && advertiser.id !== req.user!.orgId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(advertiser);
  } catch (err) {
    next(err);
  }
});

// POST /api/advertisers - Create new advertiser
advertisersRouter.post("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canCreateAdvertiser(req)) {
      return res.status(403).json({ 
        error: "Forbidden. Only internal admin/ops users can create advertisers." 
      });
    }

    const { name, billingEmail, country } = req.body;

    // Validation
    if (!name || !billingEmail || !country) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["name", "billingEmail", "country"]
      });
    }

    const created = await createAdvertiser({
      name,
      billingEmail,
      country,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/advertisers/:id - Update advertiser
advertisersRouter.patch("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const advertiserId = req.params.id;
    const advertiser = await getAdvertiser(advertiserId);

    if (!advertiser) {
      return res.status(404).json({ error: "Advertiser not found" });
    }

    // Check permissions
    const isInternalEdit = req.user!.orgType === "beamer_internal" && 
                          (req.user!.role === "admin" || req.user!.role === "ops");
    const isOwnProfile = req.user!.orgType === "advertiser" && advertiser.id === req.user!.orgId;

    if (!isInternalEdit && !isOwnProfile) {
      return res.status(403).json({ 
        error: "Forbidden. You can only edit your own advertiser profile." 
      });
    }

    const { name, billingEmail, country } = req.body;

    const updated = await updateAdvertiser(advertiserId, {
      name,
      billingEmail,
      country,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/advertisers/:id - Delete advertiser
advertisersRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canEditAdvertiser(req)) {
      return res.status(403).json({ 
        error: "Forbidden. Only internal admin/ops can delete advertisers." 
      });
    }

    const advertiser = await getAdvertiser(req.params.id);
    if (!advertiser) {
      return res.status(404).json({ error: "Advertiser not found" });
    }

    // Check if advertiser has campaigns - prevent deletion if so
    if (advertiser.campaignCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete advertiser with ${advertiser.campaignCount} associated campaigns. Please reassign or delete campaigns first.` 
      });
    }

    await deleteAdvertiser(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
