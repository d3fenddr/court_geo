import { API_BASE } from "../config.js";
import { authStore } from "../state/authStore.js";

async function readJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiFetch(path, { method = "GET", body, auth = true, headers } = {}) {
  const h = { ...(headers || {}) };
  if (body !== undefined) h["Content-Type"] = "application/json";
  if (auth && authStore.token) h.Authorization = `Bearer ${authStore.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await readJsonSafe(res);

  if (!res.ok) {
    const msg =
      (data && (data.error?.message || data.error)) ||
      res.statusText ||
      "Request failed";
    const err = new Error(String(msg));
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

