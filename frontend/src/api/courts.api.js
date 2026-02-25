import { apiFetch } from "./http.js";

export function getCourts({ q = "", city = "" } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (city) params.set("city", city);
  const qs = params.toString();
  return apiFetch(`/api/courts${qs ? `?${qs}` : ""}`, { auth: false });
}

export function getCourt(id) {
  return apiFetch(`/api/courts/${encodeURIComponent(id)}`, { auth: false });
}

export function createCourt(payload) {
  return apiFetch("/api/courts", { method: "POST", body: payload });
}

export function updateCourt(id, payload) {
  return apiFetch(`/api/courts/${encodeURIComponent(id)}`, { method: "PUT", body: payload });
}

export function deleteCourt(id) {
  return apiFetch(`/api/courts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

