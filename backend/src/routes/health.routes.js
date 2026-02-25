import express from "express";
import { DEV_MODE } from "../config/constants.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, devMode: DEV_MODE });
});

export default router;

