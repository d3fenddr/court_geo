export const PORT = Number(process.env.PORT || 4000);

export const DEV_MODE =
  String(process.env.DEV_MODE || "").toLowerCase() === "1" ||
  String(process.env.DEV_MODE || "").toLowerCase() === "true";

// How long after meeting start a recipient is kept if not checked-in.
export const ABSENT_GRACE_MS = Number(process.env.ABSENT_GRACE_MS || 15 * 60 * 1000);

// Max distance from court to allow check-in (unless DEV_MODE).
export const CHECKIN_RADIUS_METERS = Number(process.env.CHECKIN_RADIUS_METERS || 50);

