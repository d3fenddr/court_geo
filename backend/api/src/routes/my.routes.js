import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { listMyMeetingsAndCleanup } from "../services/meetings.service.js";

const router = express.Router();

router.get("/api/my/meetings", requireAuth, async (req, res, next) => {
  try {
    const mine = await listMyMeetingsAndCleanup(req.userId);
    res.json(mine);
  } catch (err) {
    next(err);
  }
});

export default router;

