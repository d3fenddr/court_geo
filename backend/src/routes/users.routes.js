import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createUser, listUsersSafe } from "../services/users.service.js";

const router = express.Router();

router.get("/api/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await listUsersSafe());
  } catch (err) {
    next(err);
  }
});

router.post("/api/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const created = await createUser(req.body || {});
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

export default router;

