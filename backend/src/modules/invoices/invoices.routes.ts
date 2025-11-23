// src/modules/invoices/invoices.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import { createInvoice, getInvoiceById } from "./invoices.service";

const router = Router();

// POST /api/invoices
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await createInvoice(req.body);
    res.status(201).json({ status: "success", data: invoice });
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      return res
        .status(404)
        .json({ status: "error", message: "Invoice not found" });
    }
    res.json({ status: "success", data: invoice });
  } catch (err) {
    next(err);
  }
});

export { router as invoicesRouter };
