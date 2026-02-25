import crypto from "crypto";

function hex(nBytes) {
  return crypto.randomBytes(nBytes).toString("hex");
}

export function makeId() {
  return `c_${hex(4)}`;
}

export function makeUserId() {
  return `u_${hex(4)}`;
}

export function makeMeetingId() {
  return `m_${hex(4)}`;
}

export function makeToken() {
  return `t_${hex(12)}`;
}

