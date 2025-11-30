import { Router, Response, NextFunction } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth";
import {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deactivateVehicle,
  getVehicleScreens,
  validatePublisherOrg,
} from "./vehicles.service";

export const vehiclesRouter = Router();

function canAccessVehicles(req: AuthRequest): boolean {
  if (!req.user) return false;
  const { orgType } = req.user;
  return orgType === "beamer_internal" || orgType === "publisher";
}

function canAccessVehicle(req: AuthRequest, vehiclePublisherOrgId: string): boolean {
  if (!req.user) return false;
  const { orgType, orgId } = req.user;

  if (orgType === "beamer_internal") {
    return true;
  }

  if (orgType === "publisher") {
    return orgId === vehiclePublisherOrgId;
  }

  return false;
}

function canModifyVehicle(req: AuthRequest, vehiclePublisherOrgId: string): boolean {
  if (!req.user) return false;
  const { orgType, orgId, role } = req.user;

  if (orgType === "beamer_internal") {
    return role === "admin" || role === "ops";
  }

  if (orgType === "publisher") {
    return orgId === vehiclePublisherOrgId && (role === "admin" || role === "ops");
  }

  return false;
}

function canCreateVehicle(req: AuthRequest): boolean {
  if (!req.user) return false;
  const { orgType, role } = req.user;
  
  if (orgType === "beamer_internal") {
    return role === "admin" || role === "ops";
  }
  
  if (orgType === "publisher") {
    return role === "admin" || role === "ops";
  }
  
  return false;
}

vehiclesRouter.get("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessVehicles(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const filters: any = {};

    if (req.user!.orgType === "publisher") {
      filters.publisherOrgId = req.user!.orgId;
    } else if (req.query.publisher_org_id) {
      filters.publisherOrgId = req.query.publisher_org_id as string;
    }

    if (req.query.q) {
      filters.q = req.query.q as string;
    }

    if (req.query.city) {
      filters.city = req.query.city as string;
    }

    if (req.query.region) {
      filters.region = req.query.region as string;
    }

    if (req.query.is_active !== undefined) {
      filters.isActive = req.query.is_active === "true";
    }

    if (req.query.page) {
      filters.page = parseInt(req.query.page as string, 10);
    }

    if (req.query.page_size) {
      filters.pageSize = parseInt(req.query.page_size as string, 10);
    }

    const result = await listVehicles(filters);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.post("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canCreateVehicle(req)) {
      return res.status(403).json({ 
        error: "Forbidden. Only admin/ops users can create vehicles." 
      });
    }

    const {
      publisher_org_id,
      name,
      external_id,
      license_plate,
      make_model,
      city,
      region,
    } = req.body;

    let finalPublisherOrgId = publisher_org_id;

    if (req.user!.orgType === "publisher") {
      finalPublisherOrgId = req.user!.orgId;
    }

    if (!finalPublisherOrgId) {
      return res.status(400).json({ error: "publisher_org_id is required" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }

    const orgValidation = await validatePublisherOrg(finalPublisherOrgId);
    if (!orgValidation.valid) {
      return res.status(400).json({
        error: `Invalid publisher_org_id. ${
          orgValidation.type
            ? `Organisation is of type "${orgValidation.type}", must be "publisher".`
            : "Organisation does not exist."
        }`,
      });
    }

    const created = await createVehicle({
      publisherOrgId: finalPublisherOrgId,
      name: name.trim(),
      externalId: external_id,
      licensePlate: license_plate,
      makeModel: make_model,
      city,
      region,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessVehicles(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const vehicle = await getVehicleById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (!canAccessVehicle(req, vehicle.publisherOrgId)) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    res.json(vehicle);
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.patch("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vehicle = await getVehicleById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (!canModifyVehicle(req, vehicle.publisherOrgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const {
      name,
      external_id,
      license_plate,
      make_model,
      city,
      region,
      is_active,
    } = req.body;

    const updateInput: any = {};

    if (name !== undefined) {
      if (typeof name === "string" && !name.trim()) {
        return res.status(400).json({ error: "name cannot be empty" });
      }
      updateInput.name = name?.trim();
    }
    if (external_id !== undefined) updateInput.externalId = external_id;
    if (license_plate !== undefined) updateInput.licensePlate = license_plate;
    if (make_model !== undefined) updateInput.makeModel = make_model;
    if (city !== undefined) updateInput.city = city;
    if (region !== undefined) updateInput.region = region;
    if (is_active !== undefined) updateInput.isActive = is_active;

    const updated = await updateVehicle(req.params.id, updateInput);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vehicle = await getVehicleById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (!canModifyVehicle(req, vehicle.publisherOrgId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const force = req.query.force === "true" && req.user!.orgType === "beamer_internal";

    const result = await deactivateVehicle(req.params.id, force);

    if (!result.success) {
      return res.status(409).json({ error: result.message });
    }

    res.json({ status: "success", message: "Vehicle deactivated" });
  } catch (err) {
    next(err);
  }
});

vehiclesRouter.get("/:id/screens", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessVehicles(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const vehicle = await getVehicleById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (!canAccessVehicle(req, vehicle.publisherOrgId)) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const vehicleScreens = await getVehicleScreens(req.params.id);
    res.json(vehicleScreens);
  } catch (err) {
    next(err);
  }
});
