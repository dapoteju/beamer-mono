// backend/src/modules/publishers/publishers.routes.ts
import { Router, Response, NextFunction } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import {
  listPublisherProfiles,
  getPublisherProfile,
  createPublisherProfile,
  updatePublisherProfile,
  deletePublisherProfile,
  getPublisherOrganisations,
  getPublisherDropdownOptions,
} from "./publishers.service";

export const publishersRouter = Router();

// Permission helpers
function canAccessPublishers(req: AuthRequest): boolean {
  const { orgType, role } = req.user!;
  // Internal users with any role can access publishers
  // Publishers can only view their own profile (handled in service)
  return orgType === "beamer_internal" || orgType === "publisher";
}

function canCreatePublisher(req: AuthRequest): boolean {
  const { orgType, role } = req.user!;
  // Only internal admin/ops can create publishers
  return orgType === "beamer_internal" && (role === "admin" || role === "ops");
}

function canEditPublisher(req: AuthRequest): boolean {
  const { orgType, role } = req.user!;
  // Internal admin/ops can edit all publishers
  // Publishers can edit their own profile (handled in routes)
  return orgType === "beamer_internal" && (role === "admin" || role === "ops");
}

// GET /api/publishers - List all publisher profiles
publishersRouter.get("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessPublishers(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const publishers = await listPublisherProfiles();

    // If publisher user, filter to only their profile
    if (req.user!.orgType === "publisher") {
      const filtered = publishers.filter(
        (p) => p.organisationId === req.user!.orgId
      );
      return res.json(filtered);
    }

    res.json(publishers);
  } catch (err) {
    next(err);
  }
});

// GET /api/publishers/dropdown/organisations - Get publisher organisations for dropdown
publishersRouter.get("/dropdown/organisations", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canCreatePublisher(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const organisations = await getPublisherOrganisations();
    res.json(organisations);
  } catch (err) {
    next(err);
  }
});

// GET /api/publishers/dropdown - Get all publisher profiles for dropdown (for screens form)
publishersRouter.get("/dropdown", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessPublishers(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const options = await getPublisherDropdownOptions();
    res.json(options);
  } catch (err) {
    next(err);
  }
});

// GET /api/publishers/:id - Get publisher profile by ID
publishersRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessPublishers(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const publisher = await getPublisherProfile(req.params.id);
    if (!publisher) {
      return res.status(404).json({ error: "Publisher profile not found" });
    }

    // If publisher user, ensure they can only view their own profile
    if (req.user!.orgType === "publisher" && publisher.organisationId !== req.user!.orgId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(publisher);
  } catch (err) {
    next(err);
  }
});

// POST /api/publishers - Create new publisher profile
publishersRouter.post("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canCreatePublisher(req)) {
      return res.status(403).json({ 
        error: "Forbidden. Only internal admin/ops users can create publishers." 
      });
    }

    const { publisherType, organisationId, fullName, phoneNumber, email, address, notes } = req.body;

    // Validation
    if (!publisherType || !["organisation", "individual"].includes(publisherType)) {
      return res.status(400).json({ 
        error: "Invalid publisherType. Must be 'organisation' or 'individual'." 
      });
    }

    if (publisherType === "organisation" && !organisationId) {
      return res.status(400).json({ 
        error: "organisationId is required for organisation-type publishers." 
      });
    }

    if (publisherType === "individual" && !fullName) {
      return res.status(400).json({ 
        error: "fullName is required for individual-type publishers." 
      });
    }

    const created = await createPublisherProfile({
      publisherType,
      organisationId,
      fullName,
      phoneNumber,
      email,
      address,
      notes,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/publishers/:id - Update publisher profile
publishersRouter.patch("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const publisherId = req.params.id;
    const publisher = await getPublisherProfile(publisherId);

    if (!publisher) {
      return res.status(404).json({ error: "Publisher profile not found" });
    }

    // Check permissions
    const isInternalEdit = req.user!.orgType === "beamer_internal" && 
                          (req.user!.role === "admin" || req.user!.role === "ops");
    const isOwnProfile = req.user!.orgType === "publisher" && 
                        publisher.organisationId === req.user!.orgId;

    if (!isInternalEdit && !isOwnProfile) {
      return res.status(403).json({ 
        error: "Forbidden. You can only edit your own publisher profile." 
      });
    }

    const { publisherType, organisationId, fullName, phoneNumber, email, address, notes } = req.body;

    const updated = await updatePublisherProfile(publisherId, {
      publisherType,
      organisationId,
      fullName,
      phoneNumber,
      email,
      address,
      notes,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/publishers/:id - Delete publisher profile
publishersRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canEditPublisher(req)) {
      return res.status(403).json({ 
        error: "Forbidden. Only internal admin/ops can delete publishers." 
      });
    }

    const publisher = await getPublisherProfile(req.params.id);
    if (!publisher) {
      return res.status(404).json({ error: "Publisher profile not found" });
    }

    // Check if publisher has screens - prevent deletion if so
    if (publisher.screenCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete publisher with ${publisher.screenCount} associated screens. Please reassign or delete screens first.` 
      });
    }

    await deletePublisherProfile(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
