import { getCourts } from "../../api/courts.api.js";
import { checkIn as apiCheckIn } from "../../api/meetings.api.js";
import { getMyMeetings } from "../../api/my.api.js";
import { me as apiMe } from "../../api/auth.api.js";
import { clearAuth, isLoggedIn } from "../../state/authStore.js";
import { appState } from "../../state/appState.js";
import {
  getGeoStatus,
  getLastPos,
  startMeGeolocation,
  stopMeGeolocation,
} from "../../geo/meGeo.js";
import { ensureMeMap, resetMeMaps, updateAllMeUserMarkers } from "../../geo/meMaps.js";
import { escapeHtml } from "../components/cards.js";
import { statusBadge } from "../components/badge.js";

export async function renderMe(appRoot) {
  stopMeGeolocation();
  resetMeMaps();

  if (!isLoggedIn()) {
    appRoot.innerHTML = `<h1>My meetings</h1><p>You are not logged in. Go to <a href="#/login">login</a>.</p>`;
    return;
  }

  try {
    await apiMe(); // validate token
  } catch {
    clearAuth();
    location.hash = "#/login";
    return;
  }

  appState.courts = await getCourts();
  const courtsById = new Map(appState.courts.map((c) => [c.id, c]));
  const meetings = await getMyMeetings();

  const showGps = meetings.length > 0;

  appRoot.innerHTML = `
    <h1>My meetings</h1>
    ${
      showGps
        ? `<div class="card card--mb10">
             <div class="meta"><b>Your GPS:</b> <span id="meGeoStatus">${escapeHtml(
               getGeoStatus(),
             )}</span></div>
             <small>Location updates automatically (about once per second)</small>
           </div>`
        : ""
    }
    <div id="myMeetings" class="list list--flush"></div>
  `;

  const root = document.getElementById("myMeetings");
  root.innerHTML = "";

  if (!meetings.length) {
    root.innerHTML = `<div class="card">No meetings assigned</div>`;
  } else {
    for (const m of meetings.slice().reverse()) {
      const court = courtsById.get(m.courtId);

      const courtLabel = court
        ? `${court.name} • ${court.address} • ${court.city}`
        : m.courtId;

      const whenRaw = String(m.dateTime || "");
      const when =
        whenRaw.includes("T") && whenRaw.length >= 16
          ? whenRaw.replace("T", " ").slice(0, 16)
          : whenRaw;

      const mapId = `meMap-${m.id}`;

      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div class="title">${escapeHtml(m.title)} ${statusBadge(m.myStatus)}</div>
        <div class="meta">${escapeHtml(when)}</div>
        <div class="meta">${escapeHtml(courtLabel)}</div>
        ${m.description ? `<div class="meta">${escapeHtml(m.description)}</div>` : ""}

        <div id="${mapId}" class="me-map"></div>

        <div class="actions">
          <button data-checkin="${m.id}" ${m.myStatus === "present" ? "disabled" : ""}>
            Check-in
          </button>
        </div>

        <div data-msg="${m.id}" class="meta"></div>
      `;

      root.appendChild(div);

      const msgEl = div.querySelector(`[data-msg="${m.id}"]`);
      const btn = div.querySelector(`[data-checkin="${m.id}"]`);

      if (court && typeof court.lat === "number" && typeof court.lng === "number") {
        const mapEl = document.getElementById(mapId);
        ensureMeMap(m.id, mapEl, court.lat, court.lng);
      } else {
        msgEl.textContent = "No court coordinates to show on map.";
      }

      if (btn) {
        btn.onclick = async () => {
          try {
            msgEl.textContent = "Checking in...";

            let lat;
            let lng;
            const last = getLastPos();

            if (last && Date.now() - last.ts < 15000) {
              lat = last.lat;
              lng = last.lng;
            } else {
              const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 10000,
                });
              });
              lat = pos.coords.latitude;
              lng = pos.coords.longitude;
            }

            await apiCheckIn(m.id, lat, lng);
            msgEl.textContent = "Checked in ✅";
            await renderMe(appRoot);
          } catch (err) {
            const msg = String(err.message || "");
            if (msg.toLowerCase().includes("unauthorized")) {
              clearAuth();
              location.hash = "#/login";
              return;
            }
            if (msg.toLowerCase().includes("not allowed")) {
              msgEl.textContent = "Too late (meeting removed after 15 minutes).";
              await renderMe(appRoot);
              return;
            }
            msgEl.textContent = err.message;
          }
        };
      }
    }
  }

  if (meetings.length) {
    startMeGeolocation({
      onUpdate: ({ lat, lng, statusText }) => {
        updateAllMeUserMarkers(lat, lng);
        const el = document.getElementById("meGeoStatus");
        if (el) el.textContent = statusText;
      },
      onError: () => {
        const el = document.getElementById("meGeoStatus");
        if (el) el.textContent = getGeoStatus();
      },
    });
  }
}

