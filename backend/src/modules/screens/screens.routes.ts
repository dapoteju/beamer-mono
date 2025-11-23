// src/modules/screens/screens.routes.ts
import { Router } from "express";
import { listScreens, createScreen, getScreen } from "./screens.service";

export const screensRouter = Router();

// GET /api/screens
screensRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await listScreens();
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/screens
screensRouter.post("/", async (req, res, next) => {
  try {
    const {
      publisherOrgId,
      name,
      screenType,
      resolutionWidth,
      resolutionHeight,
      city,
      regionCode,
      lat,
      lng,
    } = req.body;

    if (
      !publisherOrgId ||
      !name ||
      !screenType ||
      !resolutionWidth ||
      !resolutionHeight ||
      !city ||
      !regionCode ||
      !lat ||
      !lng
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const created = await createScreen({
      publisherOrgId,
      name,
      screenType,
      resolutionWidth,
      resolutionHeight,
      city,
      regionCode,
      lat,
      lng,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// GET /api/screens/:id
screensRouter.get("/:id", async (req, res, next) => {
  try {
    const screen = await getScreen(req.params.id);
    if (!screen) return res.status(404).json({ message: "Not found" });
    res.json(screen);
  } catch (err) {
    next(err);
  }
});
