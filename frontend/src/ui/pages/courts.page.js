import { getCourts, createCourt, deleteCourt, updateCourt } from "../../api/courts.api.js";
import {
  createMeeting,
  deleteMeeting,
  getMeetings,
  removeRecipient as apiRemoveRecipient,
  updateMeeting as apiUpdateMeeting,
} from "../../api/meetings.api.js";
import { getUsers } from "../../api/users.api.js";
import { isAdmin, isLoggedIn } from "../../state/authStore.js";
import { appState } from "../../state/appState.js";
import { stopMeGeolocation } from "../../geo/meGeo.js";
import { resetMeMaps } from "../../geo/meMaps.js";
import { escapeHtml } from "../components/cards.js";

let map = null;
let markersLayer = null;
let markerById = new Map();
let selectedRecipientIds = [];
let preselectedCourtId = "";
let editingCourtId = null;
let editingMeetingId = null;

function ensureMapMounted() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  if (map && map._container !== mapEl) {
    map.remove();
    map = null;
    markersLayer = null;
    markerById = new Map();
  }

  if (!map) {
    map = L.map("map").setView([40.4093, 49.8671], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      const latEl = document.getElementById("lat");
      const lngEl = document.getElementById("lng");
      if (latEl && lngEl) {
        latEl.value = e.latlng.lat.toFixed(6);
        lngEl.value = e.latlng.lng.toFixed(6);
      }
    });
  }

  requestAnimationFrame(() => map.invalidateSize());
}

function renderMapMarkers(courts) {
  if (!markersLayer) return;

  markersLayer.clearLayers();
  markerById = new Map();

  for (const c of courts) {
    const marker = L.marker([c.lat, c.lng]).bindPopup(
      `<b>${escapeHtml(c.name)}</b><br/>${escapeHtml(c.address)}<br/>${escapeHtml(c.city)}`,
    );
    marker.addTo(markersLayer);
    markerById.set(c.id, marker);

    marker.on("click", () => {
      appState.ui.selectedCourtId = c.id;
      openAddMeetingForCourt(c.id);
    });
  }

  if (courts.length && map) {
    const bounds = L.latLngBounds(courts.map((c) => [c.lat, c.lng]));
    map.fitBounds(bounds.pad(0.15));
  }
}

function getFilteredCourts() {
  const qEl = document.getElementById("q");
  const cityEl = document.getElementById("city");
  const q = qEl ? qEl.value.trim().toLowerCase() : "";
  const city = cityEl ? cityEl.value.trim().toLowerCase() : "";

  if (!q && !city) return appState.courts.slice();

  return appState.courts.filter((c) => {
    const name = String(c.name || "").toLowerCase();
    const address = String(c.address || "").toLowerCase();
    const cCity = String(c.city || "").toLowerCase();

    const qOk = !q || name.includes(q) || address.includes(q) || cCity.includes(q);
    const cityOk = !city || cCity.includes(city);

    return qOk && cityOk;
  });
}

function renderRightView() {
  const right = document.getElementById("rightContent");
  if (!right) return;

  if (appState.ui.rightView === "map") {
    right.innerHTML = `<div id="map"></div>`;
    ensureMapMounted();
    renderMapMarkers(appState.courts);
  } else {
    right.innerHTML = `<div id="courtsList" class="list"></div>`;
    renderCourtsList(getFilteredCourts());
  }
}

function renderCourtsList(courts) {
  const root = document.getElementById("courtsList");
  if (!root) return;

  root.innerHTML = "";
  if (!courts.length) {
    root.innerHTML = `<div class="card">Courts not found</div>`;
    return;
  }

  for (const c of courts) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="title">${escapeHtml(c.name)}</div>
      <div class="meta">${escapeHtml(c.city)} • ${escapeHtml(c.address)}</div>
      <div class="meta">(${Number(c.lat).toFixed(6)}, ${Number(c.lng).toFixed(6)})</div>
      <div class="actions">
        <button data-add-meeting="${c.id}">Add meeting</button>
        <button data-zoom="${c.id}">Show</button>
        <button data-edit="${c.id}">Update</button>
        <button data-del="${c.id}">Delete</button>
      </div>
    `;

    div.querySelector("[data-add-meeting]").onclick = () => {
      appState.ui.selectedCourtId = c.id;
      openAddMeetingForCourt(c.id);
    };

    div.querySelector("[data-zoom]").onclick = () => {
      appState.ui.rightView = "map";
      appState.ui.selectedCourtId = c.id;
      renderCourtsPage(root.closest("#app") || document.getElementById("app"));
      afterRenderCourts();
      const marker = markerById.get(c.id);
      if (map) map.setView([c.lat, c.lng], 16);
      if (marker) marker.openPopup();
    };

    div.querySelector("[data-edit]").onclick = () => {
      appState.ui.selectedCourtId = c.id;
      startEditCourt(c.id);
    };

    div.querySelector("[data-del]").onclick = async () => {
      if (!confirm(`Delete "${c.name}"?`)) return;
      await deleteCourt(c.id);
      await refreshCourtsAndMeetings();
    };

    root.appendChild(div);
  }
}

function openAddMeetingForCourt(courtId) {
  preselectedCourtId = courtId;
  appState.ui.meetingDraft.courtId = courtId;
  appState.ui.activeLeftTab = "addMeeting";
  renderLeftTab();
  const left = document.getElementById("leftContent");
  if (left) left.scrollTop = 0;
}

function startEditCourt(courtId) {
  editingCourtId = courtId;
  appState.ui.activeLeftTab = "addCourt";
  renderLeftTab();
  const left = document.getElementById("leftContent");
  if (left) left.scrollTop = 0;
}

function renderLeftTab() {
  const left = document.getElementById("leftContent");
  if (!left) return;

  if (appState.ui.activeLeftTab === "addCourt") {
    const editingCourt =
      editingCourtId && appState.courts.length
        ? appState.courts.find((c) => c.id === editingCourtId)
        : null;

    const heading = editingCourt ? "Update court" : "Add court";
    const buttonLabel = editingCourt ? "Save changes" : "Add court";

    left.innerHTML = `
      <h2>${heading}</h2>
      <form id="createCourtForm" class="form">
        <input id="name" placeholder="Name" required value="${editingCourt ? escapeHtml(editingCourt.name) : ""}" />
        <input id="address" placeholder="Address" required value="${editingCourt ? escapeHtml(editingCourt.address) : ""}" />
        <input id="cityCreate" placeholder="City" required value="${editingCourt ? escapeHtml(editingCourt.city) : ""}" />
        <div class="row">
          <input id="lat" placeholder="Lat" type="number" step="any" required value="${
            editingCourt ? Number(editingCourt.lat) : ""
          }" />
          <input id="lng" placeholder="Lng" type="number" step="any" required value="${
            editingCourt ? Number(editingCourt.lng) : ""
          }" />
        </div>
        <small>Click on the map — lat/lng</small>
        <div class="row row--tight">
          <button type="submit">${buttonLabel}</button>
          ${
            editingCourt
              ? '<button type="button" id="cancelEditCourt">Cancel</button>'
              : ""
          }
        </div>
      </form>
    `;

    const form = document.getElementById("createCourtForm");
    const cancelBtn = document.getElementById("cancelEditCourt");

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        editingCourtId = null;
        renderLeftTab();
      };
    }

    form.onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById("name").value.trim(),
        address: document.getElementById("address").value.trim(),
        city: document.getElementById("cityCreate").value.trim(),
        lat: Number(document.getElementById("lat").value),
        lng: Number(document.getElementById("lng").value),
      };

      if (editingCourtId) {
        await updateCourt(editingCourtId, payload);
        editingCourtId = null;
      } else {
        await createCourt(payload);
      }

      e.target.reset();
      await refreshCourtsAndMeetings();
    };
  } else {
    const isEditingMeeting = Boolean(editingMeetingId);
    const draft = appState.ui.meetingDraft || {
      courtId: "",
      title: "",
      dateTime: "",
      description: "",
    };

    const courtOptions = appState.courts
      .map((c) => {
        const selected =
          draft.courtId === c.id || (!draft.courtId && preselectedCourtId === c.id);
        return `<option value="${c.id}" ${selected ? "selected" : ""}>${escapeHtml(c.name)} — ${escapeHtml(c.city)}</option>`;
      })
      .join("");

    const nonAdminUsers = appState.users.filter((u) => (u.role || "user") !== "admin");
    // keep only existing non-admin ids
    selectedRecipientIds = selectedRecipientIds.filter((id) =>
      nonAdminUsers.some((u) => u.id === id),
    );

    const availableUsers = nonAdminUsers.filter((u) => !selectedRecipientIds.includes(u.id));

    const selectedHtml =
      selectedRecipientIds.length === 0
        ? `<span class="meta">No recipients yet</span>`
        : selectedRecipientIds
            .map((id) => {
              const u = nonAdminUsers.find((x) => x.id === id);
              if (!u) return "";
              return `<span class="chip">
                        <span class="chip-label">${escapeHtml(u.name)}</span>
                        <button type="button" class="chip-remove" data-remove-recipient="${u.id}">×</button>
                      </span>`;
            })
            .join("");

    const availableOptions = availableUsers
      .map((u) => `<option value="${u.id}">${escapeHtml(u.name)}</option>`)
      .join("");

    left.innerHTML = `
      <h2>${isEditingMeeting ? "Edit meeting" : "Add meeting"}</h2>
      <form id="createMeetingForm" class="form">
        <label>
          <select id="meetingCourtId" required>
            <option value="" disabled ${draft.courtId || preselectedCourtId ? "" : "selected"}>Choose court...</option>
            ${courtOptions}
          </select>
        </label>

        <input id="meetingTitle" placeholder="Meeting title" required value="${escapeHtml(
          draft.title || "",
        )}" />
        <input id="meetingDateTime" type="datetime-local" required value="${escapeHtml(
          draft.dateTime || "",
        )}" />
        <textarea id="meetingDesc" placeholder="Description (optional)">${escapeHtml(
          draft.description || "",
        )}</textarea>

        <div class="meeting-recipients">
          <small>Recipients</small>
          <div id="selectedRecipients" class="chip-list">
            ${selectedHtml}
          </div>
          <div class="row row--tight">
            <select id="recipientSelect">
              <option value="" disabled selected>Select person...</option>
              ${availableOptions}
            </select>
          </div>
          <small>Select a person to add them. Click × to remove.</small>
        </div>

        <div class="row row--tight">
          <button type="submit">${isEditingMeeting ? "Confirm" : "Create meeting"}</button>
          ${
            isEditingMeeting
              ? '<button type="button" id="cancelEditMeeting">Cancel</button>'
              : ""
          }
        </div>
      </form>
          `;

    const meetingCourtEl = document.getElementById("meetingCourtId");
    const titleEl = document.getElementById("meetingTitle");
    const dateEl = document.getElementById("meetingDateTime");
    const descEl = document.getElementById("meetingDesc");
    const recipientSelect = document.getElementById("recipientSelect");
    const cancelEditMeetingBtn = document.getElementById("cancelEditMeeting");

    if (cancelEditMeetingBtn) {
      cancelEditMeetingBtn.onclick = () => {
        editingMeetingId = null;
        appState.ui.meetingDraft = {
          courtId: "",
          title: "",
          dateTime: "",
          description: "",
        };
        selectedRecipientIds = [];
        renderLeftTab();
      };
    }

    // keep draft in sync while typing
    if (meetingCourtEl) {
      meetingCourtEl.onchange = () => {
        appState.ui.meetingDraft.courtId = meetingCourtEl.value;
      };
    }
    if (titleEl) {
      titleEl.oninput = () => {
        appState.ui.meetingDraft.title = titleEl.value;
      };
    }
    if (dateEl) {
      dateEl.oninput = () => {
        appState.ui.meetingDraft.dateTime = dateEl.value;
      };
    }
    if (descEl) {
      descEl.oninput = () => {
        appState.ui.meetingDraft.description = descEl.value;
      };
    }

    if (recipientSelect) {
      recipientSelect.onchange = () => {
        // snapshot current draft before re-rendering
        appState.ui.meetingDraft = {
          courtId: meetingCourtEl ? meetingCourtEl.value : draft.courtId,
          title: titleEl ? titleEl.value : draft.title,
          dateTime: dateEl ? dateEl.value : draft.dateTime,
          description: descEl ? descEl.value : draft.description,
        };

        const id = recipientSelect.value;
        if (!id) return;
        if (!selectedRecipientIds.includes(id)) {
          selectedRecipientIds.push(id);
          renderLeftTab();
        } else {
          // reset selection if already chosen
          recipientSelect.value = "";
        }
      };
    }

    left.querySelectorAll("[data-remove-recipient]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.removeRecipient;
        selectedRecipientIds = selectedRecipientIds.filter((x) => x !== id);
        renderLeftTab();
      };
    });

    document.getElementById("createMeetingForm").onsubmit = async (e) => {
      e.preventDefault();
      const courtId = document.getElementById("meetingCourtId").value;
      if (!selectedRecipientIds.length) {
        alert("Please add at least one recipient.");
        return;
      }

      const payload = {
        courtId,
        title: document.getElementById("meetingTitle").value.trim(),
        dateTime: document.getElementById("meetingDateTime").value,
        description: document.getElementById("meetingDesc").value.trim(),
        recipients: selectedRecipientIds.slice(),
      };

      if (editingMeetingId) {
        await apiUpdateMeeting(editingMeetingId, payload);
      } else {
        await createMeeting(payload);
      }

      e.target.reset();
      selectedRecipientIds = [];
      editingMeetingId = null;
      appState.ui.meetingDraft = {
        courtId: "",
        title: "",
        dateTime: "",
        description: "",
      };
      await refreshCourtsAndMeetings();
    };
  }
}

function renderMeetingsList() {
  const root = document.getElementById("meetingsList");
  if (!root) return;

  root.innerHTML = "";
  const selectedCourtId = appState.ui.selectedCourtId || "";

  const source = selectedCourtId
    ? appState.meetings.filter((m) => m.courtId === selectedCourtId)
    : appState.meetings;

  if (!source.length) {
    root.innerHTML = `<div class="card">No meetings yet</div>`;
    return;
  }

  const byId = new Map(appState.courts.map((c) => [c.id, c]));
  const usersById = new Map(appState.users.map((u) => [u.id, u]));

  for (const m of source.slice().reverse()) {
    const c = byId.get(m.courtId);
    const rec = Array.isArray(m.recipients) ? m.recipients : [];

    const whenRaw = String(m.dateTime || "");
    const when =
      whenRaw.includes("T") && whenRaw.length >= 16
        ? whenRaw.replace("T", " ").slice(0, 16)
        : whenRaw;

    const recHtml = rec.length
      ? `<div class="meta">
          <b>Recipients:</b>
          ${rec
            .map((uid) => {
              const u = usersById.get(uid);
              const label = u ? u.name : uid;
              return `<span class="chip chip--compact">
                        <span class="chip-label">${escapeHtml(label)}</span>
                        <button type="button" class="chip-remove" data-rm="${m.id}|${uid}" aria-label="Remove recipient">×</button>
                      </span>`;
            })
            .join(" ")}
         </div>`
      : `<div class="meta"><b>Recipients:</b> none</div>`;

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <div class="title">${escapeHtml(m.title)}</div>
      <div class="meta">${escapeHtml(c ? c.name : m.courtId)} • ${escapeHtml(when)}</div>
      ${m.description ? `<div class="meta">${escapeHtml(m.description)}</div>` : ""}

      ${recHtml}

      <div class="actions">
        <button data-edit-meeting="${m.id}">Edit</button>
        <button data-del-meeting="${m.id}">Delete</button>
      </div>
    `;

    div.querySelectorAll("[data-rm]").forEach((btn) => {
      btn.onclick = async () => {
        const [meetingId, userId] = btn.dataset.rm.split("|");
        await apiRemoveRecipient(meetingId, userId);
        await refreshCourtsAndMeetings();
      };
    });

    const editBtn = div.querySelector("[data-edit-meeting]");
    if (editBtn) {
      editBtn.onclick = () => {
        const court = byId.get(m.courtId);
        appState.ui.selectedCourtId = m.courtId;
        preselectedCourtId = m.courtId;
        editingMeetingId = m.id;
        selectedRecipientIds = Array.isArray(m.recipients) ? m.recipients.slice() : [];
        appState.ui.meetingDraft = {
          courtId: m.courtId,
          title: m.title || "",
          dateTime: m.dateTime || "",
          description: m.description || "",
        };
        appState.ui.activeLeftTab = "addMeeting";
        renderLeftTab();
        const left = document.getElementById("leftContent");
        if (left) left.scrollTop = 0;
      };
    }

    div.querySelector("[data-del-meeting]").onclick = async () => {
      if (!confirm(`Delete meeting "${m.title}"?`)) return;
      await deleteMeeting(m.id);
      await refreshCourtsAndMeetings();
    };

    root.appendChild(div);
  }
}

async function refreshCourtsAndMeetings() {
  const qEl = document.getElementById("q");
  const cityEl = document.getElementById("city");
  const q = qEl ? qEl.value.trim() : "";
  const city = cityEl ? cityEl.value.trim() : "";

  appState.users = await getUsers();
  appState.courts = await getCourts({ q, city });
  appState.meetings = await getMeetings();

  renderRightView();
  renderLeftTab();
  renderMeetingsList();
}

function afterRenderCourts() {
  if (appState.ui.rightView === "map") {
    ensureMapMounted();
    renderMapMarkers(appState.courts);
  }
  renderMeetingsList();
}

export function renderCourtsPage(appRoot) {
  stopMeGeolocation();
  resetMeMaps();

  if (!isLoggedIn()) {
    location.hash = "#/login";
    return;
  }
  if (!isAdmin()) {
    location.hash = "#/me";
    return;
  }

  appRoot.innerHTML = `
    <div class="grid">
      <section class="left">
        <div class="tabs">
          <button class="tabBtn ${appState.ui.activeLeftTab === "addCourt" ? "active" : ""}" id="tabAddCourt">Court</button>
          <button class="tabBtn ${appState.ui.activeLeftTab === "addMeeting" ? "active" : ""}" id="tabAddMeeting">Meeting</button>
        </div>

        <div id="leftContent"></div>

        <h2>Meetings</h2>
        <div id="meetingsList" class="list list--flush"></div>
      </section>

      <section class="right">
        <div class="toolbar">
          <button class="viewBtn ${appState.ui.rightView === "map" ? "active" : ""}" id="btnViewMap">Map</button>
          <button class="viewBtn ${appState.ui.rightView === "list" ? "active" : ""}" id="btnViewList">List</button>

          <span class="spacer"></span>

          <input id="q" placeholder="Search courts..." />
          <input id="city" placeholder="City" />
          <button id="searchBtn">Search</button>
        </div>

        <div id="rightContent"></div>
      </section>
    </div>
  `;

  renderRightView();
  renderLeftTab();

  document.getElementById("tabAddCourt").onclick = () => {
    appState.ui.activeLeftTab = "addCourt";
    renderLeftTab();
  };
  document.getElementById("tabAddMeeting").onclick = () => {
    appState.ui.activeLeftTab = "addMeeting";
    renderLeftTab();
  };

  document.getElementById("btnViewMap").onclick = () => {
    appState.ui.rightView = "map";
    renderCourtsPage(appRoot);
    afterRenderCourts();
  };
  document.getElementById("btnViewList").onclick = () => {
    appState.ui.rightView = "list";
    renderCourtsPage(appRoot);
    afterRenderCourts();
  };

  const qEl = document.getElementById("q");
  const cityEl = document.getElementById("city");
  const searchBtn = document.getElementById("searchBtn");

  if (qEl) {
    qEl.oninput = () => {
      if (appState.ui.rightView === "list") {
        renderRightView();
      }
    };
  }
  if (cityEl) {
    cityEl.oninput = () => {
      if (appState.ui.rightView === "list") {
        renderRightView();
      }
    };
  }
  if (searchBtn) {
    searchBtn.onclick = async () => {
      await refreshCourtsAndMeetings();
    };
  }

  afterRenderCourts();
  refreshCourtsAndMeetings().catch((err) => alert(err.message));
}

