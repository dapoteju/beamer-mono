// src/modules/bookings/bookings.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import {
  createBooking,
  getBookingById,
  listBookingsByAdvertiser,
} from "./bookings.service";

const router = Router();

// GET /api/bookings?advertiser_org_id=...
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const advertiserOrgId = req.query.advertiser_org_id as string | undefined;

    if (!advertiserOrgId) {
      return res.status(400).json({
        status: "error",
        message: "advertiser_org_id query parameter is required",
      });
    }

    const bookings = await listBookingsByAdvertiser(advertiserOrgId);
    res.json({ status: "success", data: bookings });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await createBooking(req.body);
    res.status(201).json({ status: "success", data: booking });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await getBookingById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ status: "error", message: "Booking not found" });
    }
    res.json({ status: "success", data: booking });
  } catch (err) {
    next(err);
  }
});

export { router as bookingsRouter };
