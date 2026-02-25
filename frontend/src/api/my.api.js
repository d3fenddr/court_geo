import { apiFetch } from "./http.js";

export function getMyMeetings() {
  return apiFetch("/api/my/meetings");
}

