"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organisationsRouter = void 0;
// src/modules/organisations/organisations.routes.ts
const express_1 = require("express");
const db_1 = require("../../db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../../middleware/auth");
exports.organisationsRouter = (0, express_1.Router)();
// Helper function to check if user has permission
function hasOrgManagementPermission(req) {
    if (!req.user)
        return false;
    const { orgType, role } = req.user;
    return orgType === 'beamer_internal' && (role === 'admin' || role === 'ops');
}
// GET /api/organisations - List all organisations (protected)
exports.organisationsRouter.get('/', auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!hasOrgManagementPermission(req)) {
            return res.status(403).json({
                error: 'Access denied. Only internal users with admin or ops roles can view organisations.'
            });
        }
        const result = await db_1.db
            .select({
            id: schema_1.organisations.id,
            name: schema_1.organisations.name,
            type: schema_1.organisations.type,
            country: schema_1.organisations.country,
            billing_email: schema_1.organisations.billingEmail,
            created_at: schema_1.organisations.createdAt,
        })
            .from(schema_1.organisations)
            .orderBy(schema_1.organisations.createdAt);
        res.json(result);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/organisations - Create a new organisation (protected)
exports.organisationsRouter.post('/', auth_1.requireAuth, async (req, res, next) => {
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
        const result = await db_1.db.insert(schema_1.organisations).values({
            name,
            type,
            billingEmail: billing_email,
            country,
        }).returning();
        res.status(201).json(result[0]);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/organisations/:id - Get single organisation with related data (protected)
exports.organisationsRouter.get('/:id', auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!hasOrgManagementPermission(req)) {
            return res.status(403).json({
                error: 'Access denied. Only internal users with admin or ops roles can view organisations.'
            });
        }
        const { id } = req.params;
        // Fetch the organisation
        const [org] = await db_1.db
            .select({
            id: schema_1.organisations.id,
            name: schema_1.organisations.name,
            type: schema_1.organisations.type,
            country: schema_1.organisations.country,
            billing_email: schema_1.organisations.billingEmail,
            created_at: schema_1.organisations.createdAt,
        })
            .from(schema_1.organisations)
            .where((0, drizzle_orm_1.eq)(schema_1.organisations.id, id));
        if (!org) {
            return res.status(404).json({ error: 'Organisation not found' });
        }
        // Fetch related screens (for publishers)
        const relatedScreens = await db_1.db
            .select({
            id: schema_1.screens.id,
            name: schema_1.screens.name,
            screen_type: schema_1.screens.screenType,
            city: schema_1.screens.city,
            region_code: schema_1.screens.regionCode,
            status: schema_1.screens.status,
            created_at: schema_1.screens.createdAt,
        })
            .from(schema_1.screens)
            .where((0, drizzle_orm_1.eq)(schema_1.screens.publisherOrgId, id));
        // Fetch related campaigns (for advertisers)
        const relatedCampaigns = await db_1.db
            .select({
            id: schema_1.campaigns.id,
            name: schema_1.campaigns.name,
            start_date: schema_1.campaigns.startDate,
            end_date: schema_1.campaigns.endDate,
            total_budget: schema_1.campaigns.totalBudget,
            currency: schema_1.campaigns.currency,
            status: schema_1.campaigns.status,
            created_at: schema_1.campaigns.createdAt,
        })
            .from(schema_1.campaigns)
            .where((0, drizzle_orm_1.eq)(schema_1.campaigns.advertiserOrgId, id));
        // Fetch related bookings (for advertisers)
        const relatedBookings = await db_1.db
            .select({
            id: schema_1.bookings.id,
            campaign_id: schema_1.bookings.campaignId,
            start_date: schema_1.bookings.startDate,
            end_date: schema_1.bookings.endDate,
            currency: schema_1.bookings.currency,
            status: schema_1.bookings.status,
            created_at: schema_1.bookings.createdAt,
        })
            .from(schema_1.bookings)
            .where((0, drizzle_orm_1.eq)(schema_1.bookings.advertiserOrgId, id));
        res.json({
            ...org,
            screens: relatedScreens,
            campaigns: relatedCampaigns,
            bookings: relatedBookings,
        });
    }
    catch (err) {
        next(err);
    }
});
// PATCH /api/organisations/:id - Update an organisation (protected)
exports.organisationsRouter.patch('/:id', auth_1.requireAuth, async (req, res, next) => {
    try {
        if (!hasOrgManagementPermission(req)) {
            return res.status(403).json({
                error: 'Access denied. Only internal users with admin or ops roles can update organisations.'
            });
        }
        const { id } = req.params;
        const { name, type, billing_email, country } = req.body || {};
        // Check if organisation exists
        const [existingOrg] = await db_1.db
            .select()
            .from(schema_1.organisations)
            .where((0, drizzle_orm_1.eq)(schema_1.organisations.id, id));
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
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (type !== undefined)
            updateData.type = type;
        if (billing_email !== undefined)
            updateData.billingEmail = billing_email;
        if (country !== undefined)
            updateData.country = country;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                error: 'No fields to update',
            });
        }
        const [updatedOrg] = await db_1.db
            .update(schema_1.organisations)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema_1.organisations.id, id))
            .returning({
            id: schema_1.organisations.id,
            name: schema_1.organisations.name,
            type: schema_1.organisations.type,
            country: schema_1.organisations.country,
            billing_email: schema_1.organisations.billingEmail,
            created_at: schema_1.organisations.createdAt,
        });
        res.json(updatedOrg);
    }
    catch (err) {
        next(err);
    }
});
