// src/modules/bookings/bookings.routes.ts
import { Router, Response, NextFunction } from "express";
import {
  createBooking,
  getBookingById,
  listBookings,
  updateBooking,
} from "./bookings.service";
import { requireAuth, AuthRequest } from "../../middleware/auth";

const router = Router();

function canAccessBookings(req: AuthRequest): boolean {
  if (!req.user) return false;
  const { orgType } = req.user;
  return orgType === "beamer_internal" || orgType === "advertiser";
}

function canAccessBooking(req: AuthRequest, bookingAdvertiserOrgId: string): boolean {
  if (!req.user) return false;
  const { orgType, orgId } = req.user;

  if (orgType === "beamer_internal") {
    return true;
  }

  if (orgType === "advertiser") {
    return orgId === bookingAdvertiserOrgId;
  }

  return false;
}

// GET /api/bookings
router.get("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessBookings(req)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const { campaignId } = req.query;

    let advertiserOrgId: string | undefined;
    if (req.user!.orgType === "beamer_internal") {
      advertiserOrgId = req.query.advertiser_org_id as string | undefined;
    } else {
      advertiserOrgId = req.user!.orgId;
    }

    const bookings = await listBookings({
      advertiserOrgId,
      campaignId: campaignId as string | undefined,
    });

    res.json({ status: "success", data: bookings });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings
router.post("/", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!canAccessBookings(req)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    let advertiserOrgId: string;
    if (req.user!.orgType === "beamer_internal") {
      advertiserOrgId = req.body.advertiserOrgId;
      if (!advertiserOrgId) {
        return res.status(400).json({
          status: "error",
          message: "advertiserOrgId is required for internal users",
        });
      }
    } else {
      advertiserOrgId = req.user!.orgId;
    }

    const booking = await createBooking({
      ...req.body,
      advertiserOrgId,
    });

    res.status(201).json({ status: "success", data: booking });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ status: "error", message: "Booking not found" });
    }

    if (!canAccessBooking(req, booking.advertiserOrgId)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    res.json({ status: "success", data: booking });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id
router.put("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ status: "error", message: "Booking not found" });
    }

    if (!canAccessBooking(req, booking.advertiserOrgId)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const updatedBooking = await updateBooking(req.params.id, req.body);
    res.json({ status: "success", data: updatedBooking });
  } catch (err) {
    next(err);
  }
});

export { router as bookingsRouter };
