// src/modules/organisations/organisations.routes.ts
import { Router, Response, NextFunction } from 'express';
import { db } from '../../db';
import { organisations, screens, campaigns, bookings } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../../middleware/auth';

export const organisationsRouter = Router();

// Helper function to check if user has permission
function hasOrgManagementPermission(req: AuthRequest): boolean {
  if (!req.user) return false;
  const { orgType, role } = req.user;
  return orgType === 'beamer_internal' && (role === 'admin' || role === 'ops');
}

// GET /api/organisations - List all organisations (protected)
organisationsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!hasOrgManagementPermission(req)) {
      return res.status(403).json({ 
        error: 'Access denied. Only internal users with admin or ops roles can view organisations.' 
      });
    }

    const result = await db
      .select({
        id: organisations.id,
        name: organisations.name,
        type: organisations.type,
        country: organisations.country,
        billing_email: organisations.billingEmail,
        created_at: organisations.createdAt,
      })
      .from(organisations)
      .orderBy(organisations.createdAt);
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/organisations - Create a new organisation (protected)
organisationsRouter.post('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!hasOrgManagementPermission(req)) {
      return res.status(403).json({ 
        error: 'Access denied. Only internal users with admin or ops roles can create organisations.' 
      });
    }

    const { name, type, billing_email, country } = req.body || {};

    if (!name || !type || !billing_email || !country) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'type', 'billing_email', 'country'],
      });
    }

    // Only allow creating advertiser or publisher orgs (never beamer_internal)
    const validTypes = ['advertiser', 'publisher'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid type. Only "advertiser" and "publisher" organisations can be created via API.',
      });
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(billing_email)) {
      return res.status(400).json({
        error: 'Invalid billing_email format',
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

// GET /api/organisations/:id - Get single organisation with related data (protected)
organisationsRouter.get('/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!hasOrgManagementPermission(req)) {
      return res.status(403).json({ 
        error: 'Access denied. Only internal users with admin or ops roles can view organisations.' 
      });
    }

    const { id } = req.params;
    
    // Fetch the organisation
    const [org] = await db
      .select({
        id: organisations.id,
        name: organisations.name,
        type: organisations.type,
        country: organisations.country,
        billing_email: organisations.billingEmail,
        created_at: organisations.createdAt,
      })
      .from(organisations)
      .where(eq(organisations.id, id));

    if (!org) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    // Fetch related screens (for publishers)
    const relatedScreens = await db
      .select({
        id: screens.id,
        name: screens.name,
        screen_type: screens.screenType,
        city: screens.city,
        region_code: screens.regionCode,
        status: screens.status,
        created_at: screens.createdAt,
      })
      .from(screens)
      .where(eq(screens.publisherOrgId, id));

    // Fetch related campaigns (for advertisers)
    const relatedCampaigns = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        start_date: campaigns.startDate,
        end_date: campaigns.endDate,
        total_budget: campaigns.totalBudget,
        currency: campaigns.currency,
        status: campaigns.status,
        created_at: campaigns.createdAt,
      })
      .from(campaigns)
      .where(eq(campaigns.advertiserOrgId, id));

    // Fetch related bookings (for advertisers)
    const relatedBookings = await db
      .select({
        id: bookings.id,
        campaign_id: bookings.campaignId,
        start_date: bookings.startDate,
        end_date: bookings.endDate,
        currency: bookings.currency,
        status: bookings.status,
        created_at: bookings.createdAt,
      })
      .from(bookings)
      .where(eq(bookings.advertiserOrgId, id));

    res.json({
      ...org,
      screens: relatedScreens,
      campaigns: relatedCampaigns,
      bookings: relatedBookings,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/organisations/:id - Update an organisation (protected)
organisationsRouter.patch('/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!hasOrgManagementPermission(req)) {
      return res.status(403).json({ 
        error: 'Access denied. Only internal users with admin or ops roles can update organisations.' 
      });
    }

    const { id } = req.params;
    const { name, type, billing_email, country } = req.body || {};

    // Check if organisation exists
    const [existingOrg] = await db
      .select()
      .from(organisations)
      .where(eq(organisations.id, id));

    if (!existingOrg) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    // Validate type changes
    if (type) {
      // Only allow advertiser <-> publisher changes (never to/from beamer_internal)
      const validTypes = ['advertiser', 'publisher'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: 'Invalid type. Can only update to "advertiser" or "publisher".',
        });
      }

      // Prevent changing to/from beamer_internal
      if (existingOrg.type === 'beamer_internal' || type === 'beamer_internal') {
        return res.status(400).json({
          error: 'Cannot change organisation type to or from "beamer_internal".',
        });
      }
    }

    // Validate email if provided
    if (billing_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(billing_email)) {
        return res.status(400).json({
          error: 'Invalid billing_email format',
        });
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (billing_email !== undefined) updateData.billingEmail = billing_email;
    if (country !== undefined) updateData.country = country;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No fields to update',
      });
    }

    const [updatedOrg] = await db
      .update(organisations)
      .set(updateData)
      .where(eq(organisations.id, id))
      .returning({
        id: organisations.id,
        name: organisations.name,
        type: organisations.type,
        country: organisations.country,
        billing_email: organisations.billingEmail,
        created_at: organisations.createdAt,
      });

    res.json(updatedOrg);
  } catch (err) {
    next(err);
  }
});
