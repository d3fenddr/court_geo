let watchId = null;
let lastPos = null; // { lat, lng, ts }
let statusText = "Locating...";

export function getLastPos() {
  return lastPos;
}

export function getGeoStatus() {
  return statusText;
}

export function stopMeGeolocation() {
  if (watchId !== null) {
    try {
      navigator.geolocation.clearWatch(watchId);
    } catch {}
    watchId = null;
  }
  lastPos = null;
  statusText = "Locating...";
}

export function startMeGeolocation({ onUpdate, onError, throttleMs = 900 } = {}) {
  if (!navigator.geolocation) {
    statusText = "Geolocation not supported";
    if (onError) onError(new Error(statusText));
    return;
  }

  let lastUpdateAt = 0;

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const now = Date.now();
      if (now - lastUpdateAt < throttleMs) return;
      lastUpdateAt = now;

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      lastPos = { lat, lng, ts: now };
      statusText = `Location OK: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      if (onUpdate) onUpdate({ lat, lng, statusText, pos });
    },
    (err) => {
      statusText = `Geolocation error: ${err.message || err.code}`;
      if (onError) onError(err);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
  );
}

