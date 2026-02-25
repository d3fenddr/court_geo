import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { login, logout } from "../services/auth.service.js";

const router = express.Router();

router.post("/api/auth/login", async (req, res, next) => {
  try {
    const { login: l, password } = req.body || {};
    const result = await login({ login: l, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/api/auth/logout", requireAuth, async (req, res, next) => {
  try {
    res.json(await logout(req.token));
  } catch (err) {
    next(err);
  }
});

router.get("/api/auth/me", requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;

