let meMaps = new Map(); // meetingId -> { map, courtCircle, userMarker }

function makeYouIcon() {
  return L.divIcon({
    className: "",
    html: `<div class="you-dot" title="You"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function resetMeMaps() {
  for (const { map } of meMaps.values()) {
    try {
      map.remove();
    } catch {}
  }
  meMaps.clear();
}

export function ensureMeMap(meetingId, el, courtLat, courtLng) {
  if (!el) return;
  if (meMaps.has(meetingId)) return;

  const map = L.map(el, { zoomControl: true, attributionControl: true }).setView(
    [courtLat, courtLng],
    17,
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  L.marker([courtLat, courtLng]).addTo(map).bindPopup("Meeting location");
  const courtCircle = L.circle([courtLat, courtLng], { radius: 50 }).addTo(map);
  map.fitBounds(courtCircle.getBounds().pad(0.35));

  meMaps.set(meetingId, { map, courtCircle, userMarker: null });

  requestAnimationFrame(() => {
    try {
      map.invalidateSize();
    } catch {}
  });
}

export function updateAllMeUserMarkers(lat, lng) {
  for (const entry of meMaps.values()) {
    const { map, courtCircle } = entry;

    if (!entry.userMarker) {
      entry.userMarker = L.marker([lat, lng], { icon: makeYouIcon() })
        .addTo(map)
        .bindPopup("You");
    } else {
      entry.userMarker.setLatLng([lat, lng]);
    }

    try {
      const bounds = courtCircle.getBounds();
      const u = L.latLng(lat, lng);
      if (!bounds.contains(u)) {
        const combined = bounds.extend(u);
        map.fitBounds(combined.pad(0.25));
      }
    } catch {}
  }
}

