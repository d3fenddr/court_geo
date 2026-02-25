export function now() {
  return Date.now();
}

export function isoNow() {
  return new Date().toISOString();
}

export function parseDate(value) {
  return Date.parse(String(value));
}

export function isPastGrace({ startMs, graceMs, atMs = now() }) {
  if (Number.isNaN(startMs)) return false;
  return atMs > startMs + graceMs;
}

