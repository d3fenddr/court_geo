import { readMeetings, readUsers, writeMeetings } from "../db/jsonStore.js";
import { getCourt } from "./courts.service.js";
import { distanceMeters } from "../utils/geo.js";
import { makeMeetingId } from "../utils/ids.js";
import { isoNow, now as nowMs, parseDate, isPastGrace } from "../utils/time.js";
import { ABSENT_GRACE_MS, CHECKIN_RADIUS_METERS, DEV_MODE } from "../config/constants.js";

export async function listMeetings({ courtId } = {}) {
  let items = await readMeetings();
  if (courtId) items = items.filter((m) => m.courtId === String(courtId));
  return items;
}

export async function createMeeting({ courtId, title, dateTime, description, recipients }) {
  if (!courtId || !title || !dateTime) {
    const err = new Error("courtId, title, dateTime are required");
    err.status = 400;
    throw err;
  }

  const court = await getCourt(String(courtId));
  if (!court) {
    const err = new Error("courtId not found");
    err.status = 400;
    throw err;
  }

  const recipientIds = Array.isArray(recipients) ? recipients.map(String) : [];

  if (recipientIds.length) {
    const users = await readUsers();
    for (const uid of recipientIds) {
      const user = users.find((u) => u.id === uid);
      if (!user) {
        const err = new Error(`recipient user not found: ${uid}`);
        err.status = 400;
        throw err;
      }
      if ((user.role || "user") === "admin") {
        const err = new Error("admin users cannot be meeting recipients");
        err.status = 400;
        throw err;
      }
    }
  }

  const items = await readMeetings();
  const meeting = {
    id: makeMeetingId(),
    courtId: String(courtId),
    title: String(title),
    dateTime: String(dateTime),
    description: description ? String(description) : "",
    recipients: recipientIds,
    attendance: Object.fromEntries(
      recipientIds.map((uid) => [uid, { status: "pending", checkInAt: null, lat: null, lng: null }]),
    ),
  };

  items.push(meeting);
  await writeMeetings(items);
  return meeting;
}

export async function updateMeeting(id, { courtId, title, dateTime, description, recipients }) {
  const items = await readMeetings();
  const idx = items.findIndex((m) => m.id === id);
  if (idx === -1) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }

  const current = items[idx];

  const nextCourtId = courtId ? String(courtId) : current.courtId;
  const nextTitle = title !== undefined ? String(title) : current.title;
  const nextDateTime = dateTime !== undefined ? String(dateTime) : current.dateTime;
  const nextDescription =
    description !== undefined ? String(description || "") : current.description || "";

  if (!nextCourtId || !nextTitle || !nextDateTime) {
    const err = new Error("courtId, title, dateTime are required");
    err.status = 400;
    throw err;
  }

  const court = await getCourt(nextCourtId);
  if (!court) {
    const err = new Error("courtId not found");
    err.status = 400;
    throw err;
  }

  const recipientIds = Array.isArray(recipients)
    ? recipients.map(String)
    : Array.isArray(current.recipients)
      ? current.recipients.map(String)
      : [];

  if (recipientIds.length) {
    const users = await readUsers();
    for (const uid of recipientIds) {
      const user = users.find((u) => u.id === uid);
      if (!user) {
        const err = new Error(`recipient user not found: ${uid}`);
        err.status = 400;
        throw err;
      }
      if ((user.role || "user") === "admin") {
        const err = new Error("admin users cannot be meeting recipients");
        err.status = 400;
        throw err;
      }
    }
  }

  const nextAttendance = { ...(current.attendance || {}) };

  // Remove attendance entries for users no longer in recipients
  for (const uid of Object.keys(nextAttendance)) {
    if (!recipientIds.includes(uid)) {
      delete nextAttendance[uid];
    }
  }

  // Ensure new recipients have pending attendance
  for (const uid of recipientIds) {
    if (!nextAttendance[uid]) {
      nextAttendance[uid] = { status: "pending", checkInAt: null, lat: null, lng: null };
    }
  }

  const updated = {
    ...current,
    courtId: nextCourtId,
    title: nextTitle,
    dateTime: nextDateTime,
    description: nextDescription,
    recipients: recipientIds,
    attendance: nextAttendance,
  };

  items[idx] = updated;
  await writeMeetings(items);
  return updated;
}

export async function deleteMeeting(id) {
  const items = await readMeetings();
  const next = items.filter((m) => m.id !== id);
  if (next.length === items.length) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }
  await writeMeetings(next);
  return { ok: true };
}

export async function removeRecipient(meetingId, userId) {
  const items = await readMeetings();
  const idx = items.findIndex((m) => m.id === meetingId);
  if (idx === -1) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }

  const m = items[idx];
  const uid = String(userId);

  m.recipients = Array.isArray(m.recipients) ? m.recipients.filter((x) => x !== uid) : [];
  if (m.attendance && m.attendance[uid]) delete m.attendance[uid];

  items[idx] = m;
  await writeMeetings(items);
  return m;
}

export async function checkIn(meetingId, userId, { lat, lng }) {
  if (typeof lat !== "number" || typeof lng !== "number") {
    const err = new Error("lat/lng required");
    err.status = 400;
    throw err;
  }

  const items = await readMeetings();
  const idx = items.findIndex((m) => m.id === meetingId);
  if (idx === -1) {
    const err = new Error("Meeting not found");
    err.status = 404;
    throw err;
  }

  const m = items[idx];
  const uid = String(userId);

  if (!Array.isArray(m.recipients) || !m.recipients.includes(uid)) {
    const err = new Error("Not allowed for this meeting");
    err.status = 403;
    throw err;
  }

  const court = await getCourt(m.courtId);
  if (!court) {
    const err = new Error("Court not found");
    err.status = 400;
    throw err;
  }

  if (!DEV_MODE) {
    const dist = distanceMeters(lat, lng, court.lat, court.lng);
    if (dist > CHECKIN_RADIUS_METERS) {
      const err = new Error(`Too far: ${Math.round(dist)}m (need <= ${CHECKIN_RADIUS_METERS}m)`);
      err.status = 400;
      throw err;
    }
  }

  if (!m.attendance) m.attendance = {};
  if (!m.attendance[uid]) {
    m.attendance[uid] = { status: "pending", checkInAt: null, lat: null, lng: null };
  }

  m.attendance[uid] = { status: "present", checkInAt: isoNow(), lat, lng };

  items[idx] = m;
  await writeMeetings(items);

  return { ok: true, meeting: m, devMode: DEV_MODE };
}

export async function listMyMeetingsAndCleanup(userId) {
  const uid = String(userId);
  const at = nowMs();

  const items = await readMeetings();
  let changed = false;
  const kept = [];

  for (const m of items) {
    const recipients = Array.isArray(m.recipients) ? m.recipients : [];
    const isMine = recipients.includes(uid);

    if (!isMine) {
      kept.push(m);
      continue;
    }

    const att = m.attendance && m.attendance[uid] ? m.attendance[uid] : { status: "pending" };
    const startMs = parseDate(m.dateTime);
    const isPresent = (att.status || "pending") === "present";

    if (!isPresent && isPastGrace({ startMs, graceMs: ABSENT_GRACE_MS, atMs: at })) {
      const nextRecipients = recipients.filter((x) => x !== uid);
      const nextAttendance = { ...(m.attendance || {}) };
      if (nextAttendance[uid]) delete nextAttendance[uid];

      const nextM = { ...m, recipients: nextRecipients, attendance: nextAttendance };

      if (nextRecipients.length === 0) {
        changed = true;
        continue;
      }

      kept.push(nextM);
      changed = true;
      continue;
    }

    kept.push(m);
  }

  if (changed) await writeMeetings(kept);

  const mine = kept
    .filter((m) => Array.isArray(m.recipients) && m.recipients.includes(uid))
    .map((m) => {
      const att = m.attendance && m.attendance[uid] ? m.attendance[uid] : { status: "pending" };
      const startMs = parseDate(m.dateTime);

      let myStatus = att.status || "pending";
      if (myStatus !== "present") {
        if (!Number.isNaN(startMs) && at > startMs) myStatus = "absent";
        else myStatus = "pending";
      }

      return { ...m, myStatus, myAttendance: att };
    });

  return mine;
}

