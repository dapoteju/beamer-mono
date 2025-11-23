"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organisationsRouter = void 0;
// src/modules/organisations/organisations.routes.ts
const express_1 = require("express");
const organisations_service_1 = require("./organisations.service");
exports.organisationsRouter = (0, express_1.Router)();
// GET /api/organisations
exports.organisationsRouter.get("/", async (_req, res, next) => {
    try {
        const rows = await (0, organisations_service_1.listOrganisations)();
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
});
// POST /api/organisations
exports.organisationsRouter.post("/", async (req, res, next) => {
    try {
        const { name, type, billingEmail, country } = req.body;
        if (!name || !type || !billingEmail || !country) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const created = await (0, organisations_service_1.createOrganisation)({
            name,
            type,
            billingEmail,
            country,
        });
        res.status(201).json(created);
    }
    catch (err) {
        next(err);
    }
});
// GET /api/organisations/:id
exports.organisationsRouter.get("/:id", async (req, res, next) => {
    try {
        const org = await (0, organisations_service_1.getOrganisation)(req.params.id);
        if (!org)
            return res.status(404).json({ message: "Not found" });
        res.json(org);
    }
    catch (err) {
        next(err);
    }
});
