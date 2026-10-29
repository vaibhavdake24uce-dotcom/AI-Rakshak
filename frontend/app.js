const API = new URL("./api/v1", document.baseURI).pathname;
let incidents = [];
let shelters = [];
let sources = [];
let globalEvents = [];
let globalEventTotal = 0;
let miniMap = null;
let fullMap = null;
let miniMarkerLayer = null;
let fullMarkerLayer = null;
let toastTimer = null;

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const data = await response.json(); message = data.detail || message; } catch {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}
function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("show"), 3200);
}
function setLoadingError(containerId, message) {
  const el = $(containerId);
  if (el) el.innerHTML = `<div class="empty-state">${esc(message)}</div>`;
}
function setApiStatus(connected, message) {
  const status = $("apiStatus");
  status.querySelector("span").textContent = message;
  status.title = connected ? "Dashboard data loaded from the API." : "Could not load dashboard data from the API.";
  status.setAttribute("aria-label", message);
  status.classList.toggle("is-error", !connected);
}
function navigate(view) {
  document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === `view-${view}`));
  document.querySelectorAll(".nav-item").forEach(el => {
    const active = el.dataset.view === view;
    el.classList.toggle("active", active);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  const titles = {overview:"Situation overview",incidents:"Incident management",global:"Global disaster alerts",map:"Geo explorer",shelters:"Shelter directory",sources:"Dataset register"};
  $("pageTitle").textContent = titles[view] || "AI Rakshak";
  if (view === "map") setTimeout(() => { if (fullMap) fullMap.invalidateSize(); else initMap("fullMap", true); }, 80);
}
document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.view)));
document.querySelectorAll("[data-goto]").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.goto)));
$("dismissBanner").addEventListener("click", () => document.querySelector(".safety-banner").remove());

const guideTopics = [
  {
    view: "incidents",
    terms: ["incident", "report", "status", "review", "verify"],
    answer: "To submit a report, open Incident desk and select Report incident. Add a title, district, priority and coordinates, then save. New reports start as unverified. In the incident table, use Update… to change a report's status."
  },
  {
    view: "global",
    terms: ["global", "world", "gdacs", "alert", "disaster"],
    answer: "Global alerts shows current events from the GDACS feed, including source-assigned alert levels. Use the search box or alert-level filter to narrow the list. Feed coverage is not comprehensive, and these alerts are informational—not a safety assessment."
  },
  {
    view: "map",
    terms: ["map", "geo", "location", "coordinate", "explorer"],
    answer: "Geo explorer plots incident and shelter locations. Red markers are incidents; teal markers are shelters. Current regional coordinates are illustrative. The map needs an internet connection for its tiles and does not identify safe routes."
  },
  {
    view: "shelters",
    terms: ["shelter", "capacity", "occupancy"],
    answer: "Open Shelters to browse the directory. Capacity, occupancy and availability are demo values and have not been independently verified. Contact the relevant provider before relying on them."
  },
  {
    view: "sources",
    terms: ["source", "dataset", "data", "rainfall", "model"],
    answer: "Data sources lists candidate datasets and their access/licence checks. Treat them as candidates, not approved inputs. Verify the source, terms, coverage, timestamps and data quality before using any dataset."
  },
  {
    view: "overview",
    terms: ["risk", "indicator", "rain", "river", "calculate", "forecast"],
    answer: "The overview's Risk indicator sandbox accepts rainfall and river-level values and calls a simple demo formula. It is not a forecast, trained model or official warning. Do not use it to make safety decisions."
  },
  {
    view: null,
    terms: ["api", "connect", "backend", "refresh", "loading"],
    answer: "The API status appears near the top of the page. Use Refresh to reload dashboard data. If the API is unavailable, start the FastAPI server and open its address (usually http://127.0.0.1:8000); static Live Server alone does not run the backend."
  }
];

function setGuideOpen(open) {
  $("guidePanel").hidden = !open;
  $("guideLauncher").setAttribute("aria-expanded", String(open));
  if (open) $("guideInput").focus();
}

function addGuideMessage(message, sender, actionView = null) {
  const article = document.createElement("article");
  article.className = `guide-message ${sender === "user" ? "user-message" : "assistant-message"}`;
  const label = document.createElement("span");
  label.className = "message-label";
  label.textContent = sender === "user" ? "YOU" : "RAKSHAK GUIDE";
  const body = document.createElement("p");
  body.textContent = message;
  article.append(label, body);
  if (actionView) {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "guide-action";
    action.textContent = `Open ${actionView === "global" ? "Global alerts" : titleCase(actionView)}`;
    action.addEventListener("click", () => {
      navigate(actionView);
      setGuideOpen(false);
    });
    article.append(action);
  }
  $("guideMessages").append(article);
  $("guideMessages").scrollTop = $("guideMessages").scrollHeight;
}

function guideAnswer(question) {
  const normalized = question.toLowerCase();
  const topic = guideTopics.find(item => item.terms.some(term => normalized.includes(term)));
  if (topic) return topic;
  return {
    view: null,
    answer: "I can help with reporting incidents, status updates, global alerts, maps, shelters, data sources, the demo risk indicator, and API connection. Try asking about one of those. This guide is built into the app and does not use a connected generative AI service."
  };
}

function sendGuideQuestion(question) {
  const trimmed = question.trim();
  if (!trimmed) return;
  addGuideMessage(trimmed, "user");
  const response = guideAnswer(trimmed);
  addGuideMessage(response.answer, "assistant", response.view);
  $("guideInput").value = "";
}

$("guideLauncher").addEventListener("click", () => setGuideOpen($("guidePanel").hidden));
$("guideClose").addEventListener("click", () => setGuideOpen(false));
$("guideForm").addEventListener("submit", event => {
  event.preventDefault();
  sendGuideQuestion($("guideInput").value);
});
document.querySelectorAll(".guide-suggestion").forEach(button => {
  button.addEventListener("click", () => sendGuideQuestion(button.textContent));
});

function incidentStatusClass(status) { return `pill-${["reported","reviewing","verified","resolved"].includes(status) ? status : "reported"}`; }
function severityClass(severity) { return `pill-${["critical","high","medium","low"].includes(severity) ? severity : "medium"}`; }

async function loadAll() {
  $("refreshBtn").disabled = true;
  $("refreshBtn").textContent = "↻ Loading…";
  try {
    const [, dashboard, incidentData, shelterData, sourceData] = await Promise.all([
      api("/health"), api("/dashboard"), api("/incidents"), api("/shelters"), api("/data-sources")
    ]);
    setApiStatus(true, "API connected");
    incidents = incidentData;
    shelters = shelterData;
    sources = sourceData;
    $("openCount").textContent = dashboard.open_incidents;
    $("criticalCount").textContent = dashboard.critical_incidents;
    $("unverifiedCount").textContent = dashboard.unverified_incidents;
    $("shelterCount").textContent = dashboard.shelters_listed;
    $("navIncidentCount").textContent = dashboard.open_incidents;
    $("lastUpdated").textContent = `Updated ${new Date(dashboard.updated_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;
    renderRecent();
    renderIncidents();
    renderShelters();
    renderSources();
    refreshMapMarkers();
    void loadGlobalEvents();
  } catch (error) {
    setApiStatus(false, "API unavailable");
    $("lastUpdated").textContent = "Could not load dashboard data";
    toast(`Could not load API: ${error.message}`);
    ["recentIncidents","incidentTable","shelterGrid","sourceList"].forEach(id => setLoadingError(id, "Backend unavailable. Check that the FastAPI server is running, then refresh."));
  } finally {
    $("refreshBtn").disabled = false;
    $("refreshBtn").textContent = "↻ Refresh";
  }
}
async function loadGlobalEvents() {
  try {
    const data = await api("/global-events");
    globalEvents = data.events;
    globalEventTotal = data.event_count;
    $("navGlobalCount").textContent = data.event_count;
    $("globalTotal").textContent = data.event_count;
    $("globalRed").textContent = data.alert_counts.Red;
    $("globalOrange").textContent = data.alert_counts.Orange;
    $("globalGreen").textContent = data.alert_counts.Green;
    const retrieved = data.feed_updated_at ? new Date(data.feed_updated_at).toLocaleString() : "time not provided";
    $("globalFeedUpdated").textContent = data.stale
      ? `${data.warning} Last feed update: ${retrieved}`
      : `GDACS feed updated ${retrieved}${data.cached ? " · cached" : ""}`;
    renderGlobalEvents();
  } catch (error) {
    globalEvents = [];
    globalEventTotal = 0;
    $("navGlobalCount").textContent = "—";
    $("globalTotal").textContent = "—";
    $("globalRed").textContent = "—";
    $("globalOrange").textContent = "—";
    $("globalGreen").textContent = "—";
    $("globalFeedUpdated").textContent = `GDACS feed unavailable: ${error.message}`;
    $("globalPreview").innerHTML = `<div class="empty-state">Global alerts could not be loaded. The regional incident dashboard is still available.</div>`;
    $("globalEventList").innerHTML = `<div class="empty-state">Could not load the GDACS feed. Try Refresh later.</div>`;
  }
}
function globalAlertClass(level) {
  return ({Red:"priority-critical",Orange:"priority-high",Green:"priority-low"})[level] || "priority-medium";
}
function eventTypeLabel(type) {
  return ({EQ:"Earthquake",FL:"Flood",TC:"Tropical cyclone",VO:"Volcano",DR:"Drought",WF:"Wildfire"})[type] || type;
}
function alertBadgeClass(level) {
  return ({Red:"alert-red",Orange:"alert-orange",Green:"alert-green"})[level] || "alert-unknown";
}
function gdacsEventLink(link) {
  try {
    const url = new URL(link);
    if ((url.protocol === "https:" || url.protocol === "http:") && ["gdacs.org","www.gdacs.org"].includes(url.hostname)) {
      url.protocol = "https:";
      return url.href;
    }
  } catch {}
  return "https://www.gdacs.org/";
}
function globalEventMarkup(event) {
  const location = event.country || "Location not specified";
  const type = event.event_type === "UNKNOWN" ? "Event type not specified" : eventTypeLabel(event.event_type);
  const time = event.published_at ? new Date(event.published_at).toLocaleString() : "Time not provided";
  return `<div class="recent-item"><span class="priority-mark ${globalAlertClass(event.alert_level)}"></span>
    <div class="recent-copy"><strong>${esc(event.title)}</strong><small>${esc(location)} · ${esc(type)} · ${esc(time)}</small></div>
    <span class="alert-badge ${alertBadgeClass(event.alert_level)}">${esc(event.alert_level)} alert</span><a class="text-button" href="${esc(gdacsEventLink(event.link))}" target="_blank" rel="noopener noreferrer">Details ↗</a></div>`;
}
function renderGlobalEvents() {
  const preview = globalEvents.slice(0, 5);
  $("globalPreview").innerHTML = preview.length
    ? preview.map(globalEventMarkup).join("")
    : `<div class="empty-state">GDACS reports no current events in this feed.</div>`;
  const search = $("globalSearch").value.trim().toLowerCase();
  const level = $("globalLevelFilter").value;
  const filtered = globalEvents.filter(event =>
    (!level || event.alert_level === level) &&
    (!search || `${event.title} ${event.description} ${event.country} ${event.event_type}`.toLowerCase().includes(search))
  );
  const loadedText = globalEventTotal > globalEvents.length
    ? `${globalEvents.length} loaded of ${globalEventTotal} total`
    : `${globalEvents.length} events`;
  $("globalResultCount").textContent = `Showing ${filtered.length} of ${loadedText}`;
  $("globalEventList").innerHTML = filtered.length
    ? filtered.map(globalEventMarkup).join("")
    : `<div class="empty-state">${globalEvents.length ? "No events match these filters." : "GDACS reports no current events in this feed."}</div>`;
}
function renderRecent() {
  const list = [...incidents].sort((a,b) => b.id-a.id).slice(0,5);
  $("recentIncidents").innerHTML = list.length ? list.map(i => `
    <div class="recent-item"><span class="priority-mark priority-${esc(i.severity)}"></span>
      <div class="recent-copy"><strong>${esc(i.title)}</strong><small>${esc(i.district)} · ${esc(titleCase(i.status))}${i.verified ? " · Verified" : " · Unverified"}</small></div>
      <span class="recent-meta">${esc(titleCase(i.severity))}</span>
    </div>`).join("") : `<div class="empty-state">No incidents have been reported.</div>`;
}
function renderIncidents() {
  const search = ($("incidentSearch")?.value || "").toLowerCase();
  const status = $("statusFilter")?.value || "";
  const severity = $("severityFilter")?.value || "";
  const filtered = incidents.filter(i =>
    (!search || `${i.title} ${i.district} ${i.description}`.toLowerCase().includes(search)) &&
    (!status || i.status === status) && (!severity || i.severity === severity)
  );
  $("incidentTable").innerHTML = filtered.length ? `<div class="table-wrap"><table><thead><tr><th>Incident</th><th>Location</th><th>Priority</th><th>Status</th><th>Verification</th><th>Action</th></tr></thead><tbody>${filtered.map(i => `
    <tr><td><span class="incident-title">${esc(i.title)}</span><span class="subline">${esc(i.description || "No description provided")}</span></td>
    <td>${esc(i.district)}<span class="subline">${Number(i.latitude).toFixed(4)}, ${Number(i.longitude).toFixed(4)}</span></td>
    <td><span class="pill ${severityClass(i.severity)}">${esc(i.severity)}</span></td>
    <td><span class="pill ${incidentStatusClass(i.status)}">${esc(i.status)}</span></td>
    <td>${i.verified ? '<span class="pill pill-verified">Verified</span>' : '<span class="pill pill-reviewing">Unverified</span>'}${i.is_demo ? '<span class="subline">Demo record</span>' : ''}</td>
    <td><select class="row-action" aria-label="Update status" data-status-id="${i.id}"><option value="">Update…</option>${["reported","reviewing","verified","resolved"].map(s=>`<option value="${s}">${titleCase(s)}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state">No incidents match these filters.</div>`;
  document.querySelectorAll("[data-status-id]").forEach(select => select.addEventListener("change", async () => {
    if (!select.value) return;
    try { await api(`/incidents/${select.dataset.statusId}`, {method:"PATCH", body:JSON.stringify({status:select.value})}); toast("Incident status updated."); await loadAll(); }
    catch (e) { toast(`Update failed: ${e.message}`); }
  }));
}
function renderShelters() {
  $("shelterGrid").innerHTML = shelters.length ? shelters.map(s => {
    const cap = Math.max(0, Number(s.capacity)||0), occ = Math.max(0, Number(s.occupancy)||0);
    const percent = cap ? Math.min(100, Math.round(occ/cap*100)) : 0;
    return `<article class="shelter-card"><div class="shelter-symbol">⌂</div><h3>${esc(s.name)}</h3><p>${esc(s.district)} · ${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}</p><div class="capacity-row"><span>Demo occupancy</span><strong>${occ} / ${cap}</strong></div><div class="capacity-bar"><span style="width:${percent}%"></span></div><div class="shelter-warning">⚠ ${esc(titleCase(s.status))} · verify capacity and availability directly</div></article>`;
  }).join("") : `<div class="empty-state">No shelters are listed.</div>`;
}
function renderSources() {
  $("sourceList").innerHTML = sources.length ? sources.map(s => `<article class="source-card"><div class="source-top"><h3>${esc(s.name)}</h3><span class="mini-badge">${esc(s.data_type.replaceAll("_"," ").toUpperCase())}</span></div><p>${esc(s.notes)}</p><a href="${esc(s.source_url)}" target="_blank" rel="noopener noreferrer">${esc(s.source_url)} ↗</a><div class="source-tags"><span>Access: ${esc(titleCase(s.access_status))}</span><span>Terms: ${esc(titleCase(s.licence_status))}</span></div></article>`).join("") : `<div class="empty-state">No sources registered.</div>`;
}

function initMap(id, isFull = false) {
  if (!window.L) {
    const el = $(id); if (el) el.innerHTML = '<div class="empty-state">Map library could not load. Incident and shelter lists remain available; check internet access for the map.</div>';
    return null;
  }
  const map = L.map(id, {scrollWheelZoom:false}).setView([21.28,79.92], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:18, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
  return map;
}
function refreshMapMarkers() {
  if (!miniMap) miniMap = initMap("miniMap");
  if (!fullMap && $("view-map").classList.contains("active")) fullMap = initMap("fullMap", true);
  if (miniMap && !miniMarkerLayer) miniMarkerLayer = L.layerGroup().addTo(miniMap);
  if (fullMap && !fullMarkerLayer) fullMarkerLayer = L.layerGroup().addTo(fullMap);
  [[miniMap, miniMarkerLayer], [fullMap, fullMarkerLayer]].forEach(([map, markerLayer]) => {
    if (!map || !markerLayer) return;
    markerLayer.clearLayers();
    incidents.forEach(i => {
      const marker = L.circleMarker([i.latitude,i.longitude], {radius:i.severity==="critical"?8:6,color:"#fff",weight:2,fillColor:"#df5d5d",fillOpacity:.95}).addTo(markerLayer);
      marker.bindPopup(`<strong>${esc(i.title)}</strong><small>${esc(i.district)} · ${esc(titleCase(i.severity))} · ${esc(titleCase(i.status))}${i.verified?" · Verified":" · Unverified"}</small>`);
    });
    shelters.forEach(s => {
      const marker = L.circleMarker([s.latitude,s.longitude], {radius:6,color:"#fff",weight:2,fillColor:"#0da58a",fillOpacity:.95}).addTo(markerLayer);
      marker.bindPopup(`<strong>${esc(s.name)}</strong><small>${esc(s.district)} · Shelter status unverified</small>`);
    });
  });
}
function openDialog() { $("formError").textContent = ""; $("incidentDialog").showModal(); }
["newIncidentBtn","newIncidentBtn2"].forEach(id => $(id).addEventListener("click", openDialog));
["closeDialog","cancelDialog"].forEach(id => $(id).addEventListener("click", () => $("incidentDialog").close()));
$("incidentForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    title: form.get("title").trim(), description: form.get("description").trim(),
    district: form.get("district").trim(), severity: form.get("severity"),
    latitude: Number(form.get("latitude")), longitude: Number(form.get("longitude"))
  };
  $("formError").textContent = "";
  $("submitIncident").disabled = true;
  try {
    await api("/incidents", {method:"POST", body:JSON.stringify(payload)});
    $("incidentDialog").close();
    event.currentTarget.reset();
    event.currentTarget.elements.district.value = "Bhandara";
    event.currentTarget.elements.latitude.value = "21.1667";
    event.currentTarget.elements.longitude.value = "79.65";
    toast("Report saved to the database as unverified.");
    await loadAll();
    navigate("incidents");
  } catch (e) { $("formError").textContent = e.message; }
  finally { $("submitIncident").disabled = false; }
});
["incidentSearch","statusFilter","severityFilter"].forEach(id => $(id).addEventListener("input", renderIncidents));
["globalSearch","globalLevelFilter"].forEach(id => $(id).addEventListener("input", renderGlobalEvents));
$("refreshBtn").addEventListener("click", loadAll);
$("calculateRisk").addEventListener("click", async () => {
  try {
    const rainfall = Number($("rainfallInput").value), river = Number($("riverInput").value);
    if (!Number.isFinite(rainfall) || !Number.isFinite(river) || rainfall < 0 || rainfall > 1000 || river < 0 || river > 100) {
      toast("Enter rainfall 0–1000 mm and river level 0–100 m."); return;
    }
    const result = await api(`/risk-demo?rainfall_mm=${encodeURIComponent(rainfall)}&river_level_m=${encodeURIComponent(river)}`);
    $("riskNumber").innerHTML = `${result.indicator_score}<small>/100</small>`;
    $("riskBand").textContent = result.band;
    $("riskMethod").textContent = "Toy rule only; not an official warning or forecast.";
  } catch (e) { toast(`Could not calculate: ${e.message}`); }
});

(async function init() {
  await loadAll();
  miniMap = miniMap || initMap("miniMap");
  refreshMapMarkers();
})();
