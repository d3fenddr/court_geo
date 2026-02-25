import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  createCourt,
  deleteCourt,
  getCourt,
  listCourts,
  updateCourt,
} from "../services/courts.service.js";

const router = express.Router();

router.get("/api/courts", async (req, res, next) => {
  try {
    const courts = await listCourts({ q: req.query.q, city: req.query.city });
    res.json(courts);
  } catch (err) {
    next(err);
  }
});

router.get("/api/courts/:id", async (req, res, next) => {
  try {
    const item = await getCourt(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.post("/api/courts", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const created = await createCourt(req.body || {});
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put("/api/courts/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const updated = await updateCourt(req.params.id, req.body || {});
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/api/courts/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await deleteCourt(req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;

