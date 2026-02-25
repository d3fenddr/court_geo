import { readCourts, writeCourts } from "../db/jsonStore.js";
import { makeId } from "../utils/ids.js";

function isValidLatLng(lat, lng) {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export async function listCourts({ q, city } = {}) {
  let courts = await readCourts();

  if (city) {
    courts = courts.filter(
      (c) => (c.city || "").toLowerCase() === String(city).toLowerCase(),
    );
  }

  if (q) {
    const qq = String(q).toLowerCase();
    courts = courts.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(qq) ||
        (c.address || "").toLowerCase().includes(qq),
    );
  }

  return courts;
}

export async function getCourt(id) {
  const courts = await readCourts();
  return courts.find((c) => c.id === id) || null;
}

export async function createCourt({ name, address, city, lat, lng }) {
  if (!name || !address || !city) {
    const err = new Error("name, address, city are required");
    err.status = 400;
    throw err;
  }
  if (!isValidLatLng(lat, lng)) {
    const err = new Error("lat/lng invalid");
    err.status = 400;
    throw err;
  }

  const courts = await readCourts();
  const newCourt = { id: makeId(), name, address, lat, lng, city };
  courts.push(newCourt);
  await writeCourts(courts);
  return newCourt;
}

export async function updateCourt(id, { name, address, city, lat, lng }) {
  const courts = await readCourts();
  const idx = courts.findIndex((c) => c.id === id);
  if (idx === -1) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }

  const updated = { ...courts[idx] };
  if (name !== undefined) updated.name = name;
  if (address !== undefined) updated.address = address;
  if (city !== undefined) updated.city = city;

  if (lat !== undefined || lng !== undefined) {
    const newLat = lat !== undefined ? lat : updated.lat;
    const newLng = lng !== undefined ? lng : updated.lng;
    if (!isValidLatLng(newLat, newLng)) {
      const err = new Error("lat/lng invalid");
      err.status = 400;
      throw err;
    }
    updated.lat = newLat;
    updated.lng = newLng;
  }

  courts[idx] = updated;
  await writeCourts(courts);
  return updated;
}

export async function deleteCourt(id) {
  const courts = await readCourts();
  const next = courts.filter((c) => c.id !== id);
  if (next.length === courts.length) {
    const err = new Error("Not found");
    err.status = 404;
    throw err;
  }
  await writeCourts(next);
  return { ok: true };
}

