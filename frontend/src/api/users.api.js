import { apiFetch } from "./http.js";

export function getUsers() {
  return apiFetch("/api/users");
}

export function createUser(payload) {
  return apiFetch("/api/users", { method: "POST", body: payload });
}

