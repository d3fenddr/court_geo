import { escapeHtml } from "./cards.js";

export function statusBadge(status) {
  const s = String(status || "pending").toLowerCase();
  const cls =
    s === "present" ? "status-present" : s === "absent" ? "status-absent" : "status-pending";
  return `<span class="status-badge ${cls}">${escapeHtml(s.toUpperCase())}</span>`;
}

