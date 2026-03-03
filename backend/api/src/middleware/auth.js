import { authenticate } from "../services/auth.service.js";

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    const user = token ? await authenticate(token) : null;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    req.token = token;
    req.userId = user.id;
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role || "user") !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

