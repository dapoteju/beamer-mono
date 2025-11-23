// src/modules/organisations/organisations.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db';
import { organisations } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const organisationsRouter = Router();

organisationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db.select().from(organisations);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

organisationsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, billing_email, country } = req.body || {};

    // Minimal validation – we can tighten later
    if (!name || !type || !billing_email || !country) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['name', 'type', 'billing_email', 'country'],
      });
    }

    const validTypes = ['advertiser', 'publisher', 'beamer_internal'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const result = await db.insert(organisations).values({
      name,
      type,
      billingEmail: billing_email,
      country,
    }).returning();

    res.status(201).json(result[0]);
  } catch (err) {
    next(err);
  }
});

organisationsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await db.select().from(organisations).where(eq(organisations.id, id));

    if (result.length === 0) {
      return res.status(404).json({ message: 'Organisation not found' });
    }

    res.json(result[0]);
  } catch (err) {
    next(err);
  }
});
