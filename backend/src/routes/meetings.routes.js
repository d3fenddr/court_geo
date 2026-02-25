import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  checkIn,
  createMeeting,
  deleteMeeting,
  listMeetings,
  removeRecipient,
  updateMeeting,
} from "../services/meetings.service.js";

const router = express.Router();

router.get("/api/meetings", async (req, res, next) => {
  try {
    const items = await listMeetings({ courtId: req.query.courtId });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post("/api/meetings", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const created = await createMeeting(req.body || {});
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.put("/api/meetings/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const updated = await updateMeeting(req.params.id, req.body || {});
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/api/meetings/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    res.json(await deleteMeeting(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/api/meetings/:id/recipients/:userId",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const m = await removeRecipient(req.params.id, req.params.userId);
      res.json(m);
    } catch (err) {
      next(err);
    }
  },
);

router.post("/api/meetings/:id/checkin", requireAuth, async (req, res, next) => {
  try {
    const result = await checkIn(req.params.id, req.userId, req.body || {});
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

