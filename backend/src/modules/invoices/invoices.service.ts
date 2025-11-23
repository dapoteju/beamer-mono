// src/modules/invoices/invoices.service.ts
import { pool } from "../../db"; // adjust if needed

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

export interface CreateInvoiceInput {
  booking_id: string;
  advertiser_org_id: string;
  issue_date: string; // "2025-03-05"
  due_date: string;   // "2025-03-20"
  amount_minor: number;
  currency: string;
  external_reference?: string | null;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const {
    booking_id,
    advertiser_org_id,
    issue_date,
    due_date,
    amount_minor,
    currency,
    external_reference,
  } = input;

  const result = await pool.query(
    `
    INSERT INTO public.invoices (
      booking_id,
      advertiser_org_id,
      issue_date,
      due_date,
      amount_minor,
      currency,
      status,
      external_reference
    )
    VALUES ($1,$2,$3,$4,$5,$6,'draft',$7)
    RETURNING *;
    `,
    [
      booking_id,
      advertiser_org_id,
      issue_date,
      due_date,
      amount_minor,
      currency,
      external_reference ?? null,
    ]
  );

  return result.rows[0];
}

export async function getInvoiceById(id: string) {
  const result = await pool.query(
    `SELECT * FROM public.invoices WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}
