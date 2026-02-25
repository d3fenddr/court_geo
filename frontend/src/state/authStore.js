import { me as apiMe } from "../api/auth.api.js";

const listeners = new Set();

export const authStore = {
  token: localStorage.getItem("token") || "",
  me: null,
};

export function isLoggedIn() {
  return Boolean(authStore.token);
}

export function isAdmin() {
  return Boolean(authStore.me && (authStore.me.role || "user") === "admin");
}

export function subscribeAuth(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(authStore);
}

export function setAuth(token, user) {
  authStore.token = token || "";
  authStore.me = user || null;
  if (authStore.token) localStorage.setItem("token", authStore.token);
  else localStorage.removeItem("token");
  emit();
}

export function clearAuth() {
  authStore.token = "";
  authStore.me = null;
  localStorage.removeItem("token");
  emit();
}

export async function initAuthFromStorage() {
  if (!authStore.token) {
    emit();
    return;
  }
  try {
    authStore.me = await apiMe();
  } catch {
    clearAuth();
    return;
  }
  emit();
}

