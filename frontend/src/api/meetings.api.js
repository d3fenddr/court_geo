import { apiFetch } from "./http.js";

export function getMeetings({ courtId = "" } = {}) {
  const params = new URLSearchParams();
  if (courtId) params.set("courtId", courtId);
  const qs = params.toString();
  return apiFetch(`/api/meetings${qs ? `?${qs}` : ""}`, { auth: false });
}

export function createMeeting(payload) {
  return apiFetch("/api/meetings", { method: "POST", body: payload });
}

export function deleteMeeting(id) {
  return apiFetch(`/api/meetings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function updateMeeting(id, payload) {
  return apiFetch(`/api/meetings/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: payload,
  });
}

export function removeRecipient(meetingId, userId) {
  return apiFetch(
    `/api/meetings/${encodeURIComponent(meetingId)}/recipients/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

export function checkIn(meetingId, lat, lng) {
  return apiFetch(`/api/meetings/${encodeURIComponent(meetingId)}/checkin`, {
    method: "POST",
    body: { lat, lng },
  });
}

