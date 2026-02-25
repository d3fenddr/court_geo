import { apiFetch } from "./http.js";

export function login(login, password) {
  return apiFetch("/api/auth/login", { method: "POST", body: { login, password }, auth: false });
}

export function logout() {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export function me() {
  return apiFetch("/api/auth/me");
}

