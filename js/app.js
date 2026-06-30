const STORAGE_KEY = "hotel-fletcher-v2-stable";

const els = {
  today: document.getElementById("today"),
  notice: document.getElementById("notice"),
  roomCode: document.getElementById("roomCode"),
  roomType: document.getElementById("roomType"),
  roomCapacity: document.getElementById("roomCapacity"),
  addRoomBtn: document.getElementById("addRoomBtn"),
  roomsTable: document.getElementById("roomsTable"),
  stayRoom: document.getElementById("stayRoom"),
  workerId: document.getElementById("workerId"),
  surname: document.getElementById("surname"),
  name: document.getElementById("name"),
  company: document.getElementById("company"),
  nationality: document.getElementById("nationality"),
  role: document.getElementById("role"),
  status: document.getElementById("status"),
  checkIn: document.getElementById("checkIn"),
  checkOut: document.getElementById("checkOut"),
  addStayBtn: document.getElementById("addStayBtn"),
  resetStayFormBtn: document.getElementById("resetStayFormBtn"),
  searchStay: document.getElementById("searchStay"),
  filterRoom: document.getElementById("filterRoom"),
  staysTable: document.getElementById("staysTable"),
  historyGrid: document.getElementById("historyGrid"),
  kpiRooms: document.getElementById("kpiRooms"),
  kpiCapacity: document.getElementById("kpiCapacity"),
  kpiOccupied: document.getElementById("kpiOccupied"),
  kpiAvailable: document.getElementById("kpiAvailable"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  importJsonBtn: document.getElementById("importJsonBtn"),
  importJsonFile: document.getElementById("importJsonFile"),
  exportCsvBtn: document.getElementById("exportCsvBtn")
};

let state = loadState();

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function capitalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function upper(value) {
  return String(value || "").trim().toUpperCase();
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function formatDate(value) {
  if (!isIsoDate(value)) return "-";
  const parts = value.split("-");
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

function isActiveStay(stay) {
  return String(stay.status || "").toLowerCase() !== "cancelled";
}

function stayIncludesDate(stay, date) {
  return stay.checkIn <= date && stay.checkOut > date;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function normalizeState(input) {
  const rooms = Array.isArray(input.rooms) ? input.rooms.map(room => ({
    code: upper(room.code),
    typeLabel: String(room.typeLabel || "").trim(),
    capacity: Math.max(1, Number(room.capacity) || 1)
  })).filter(room => room.code && room.typeLabel) : [];

  const roomCodes = new Set(rooms.map(room => room.code));
  const stays = Array.isArray(input.stays) ? input.stays.map(stay => ({
    id: String(stay.id || uid()),
    roomCode: upper(stay.roomCode),
    workerId: upper(stay.workerId),
    surname: String(stay.surname || "").trim(),
    name: String(stay.name || "").trim(),
    company: upper(stay.company),
    nationality: String(stay.nationality || "").trim(),
    role: String(stay.role || "").trim(),
    status: String(stay.status || "confirmed").trim().toLowerCase(),
    checkIn: String(stay.checkIn || "").trim(),
    checkOut: String(stay.checkOut || "").trim()
  })).filter(stay => roomCodes.has(stay.roomCode)) : [];

  return { rooms, stays };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rooms: [], stays: [] };
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.error(error);
    return { rooms: [], stays: [] };
  }
}

function persistState(message) {
  state = normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
  if (message) showNotice("ok", message);
}

function showNotice(type, message) {
  if (!els.notice) return;
  els.notice.className = "notice show " + type;
  els.notice.textContent = message;
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => {
    els.notice.className = "notice";
    els.notice.textContent = "";
  }, 3500);
}

function roomUsage(roomCode, date) {
  const room = state.rooms.find(item => item.code === roomCode);
  const capacity = room ? Number(room.capacity) || 0 : 0;
  const occupied = state.stays.filter(stay => stay.roomCode === roomCode && isActiveStay(stay) && stayIncludesDate(stay, date)).length;
  return { capacity, occupied, available: Math.max(capacity - occupied, 0) };
}

function roomUsageForPeriod(roomCode, checkIn, checkOut) {
  const room = state.rooms.find(item => item.code === roomCode);
  const capacity = room ? Number(room.capacity) || 0 : 0;
  const booked = state.stays.filter(stay => {
    return stay.roomCode === roomCode &&
      isActiveStay(stay) &&
      isIsoDate(stay.checkIn) &&
      isIsoDate(stay.checkOut) &&
      rangesOverlap(stay.checkIn, stay.checkOut, checkIn, checkOut);
  }).length;
  return { capacity, booked, available: Math.max(capacity - booked, 0) };
}

function findAvailableRoom(checkIn, checkOut) {
  return state.rooms.slice().sort((a, b) => a.code.localeCompare(b.code)).find(room => {
    const usage = roomUsageForPeriod(room.code, checkIn, checkOut);
    return usage.booked < usage.capacity;
  }) || null;
}

function autoAssignRoom() {
  const checkIn = els.checkIn.value;
  const checkOut = els.checkOut.value;
  if (!state.rooms.length) return showNotice("bad", "Prima aggiungi almeno una camera.");
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return showNotice("bad", "Inserisci date valide.");
  if (checkIn >= checkOut) return showNotice("bad", "Il check-out deve essere successivo al check-in.");
  const room = findAvailableRoom(checkIn, checkOut);
  if (!room) return showNotice("warn", "Nessuna camera disponibile nel periodo selezionato.");
  els.stayRoom.value = room.code;
  showNotice("ok", "Camera " + room.code + " assegnata automaticamente.");
}

function injectAutoAssignButton() {
  if (!els.addStayBtn || document.getElementById("autoAssignRoomBtn")) return;
  const button = document.createElement("button");
  button.className = "btn secondary";
  button.id = "autoAssignRoomBtn";
  button.type = "button";
  button.textContent = "Assegna camera automatica";
  button.addEventListener("click", autoAssignRoom);
  els.addStayBtn.parentElement.insertBefore(button, els.addStayBtn);
}

function renderAll() {
  renderRoomOptions();
  renderKpis();
  renderRooms();
  renderStays();
  renderHistory();
}

function renderKpis() {
  const date = els.today.value;
  const totalCapacity = state.rooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0);
  const occupied = state.stays.filter(stay => isActiveStay(stay) && stayIncludesDate(stay, date)).length;
  els.kpiRooms.textContent = state.rooms.length;
  els.kpiCapacity.textContent = totalCapacity;
  els.kpiOccupied.textContent = occupied;
  els.kpiAvailable.textContent = Math.max(totalCapacity - occupied, 0);
}

function renderRoomOptions() {
  const sortedRooms = state.rooms.slice().sort((a, b) => a.code.localeCompare(b.code));
  const selectedStayRoom = els.stayRoom.value;
  const selectedFilterRoom = els.filterRoom.value || "all";

  els.stayRoom.innerHTML = '<option value="">Seleziona stanza</option>' + sortedRooms.map(room => {
    return '<option value="' + escapeHtml(room.code) + '">' + escapeHtml(room.code) + ' · ' + escapeHtml(room.typeLabel) + ' · cap. ' + escapeHtml(room.capacity) + '</option>';
  }).join("");

  els.filterRoom.innerHTML = '<option value="all">Tutte le stanze</option>' + sortedRooms.map(room => {
    return '<option value="' + escapeHtml(room.code) + '">' + escapeHtml(room.code) + '</option>';
  }).join("");

  if ([...els.stayRoom.options].some(option => option.value === selectedStayRoom)) els.stayRoom.value = selectedStayRoom;
  if ([...els.filterRoom.options].some(option => option.value === selectedFilterRoom)) els.filterRoom.value = selectedFilterRoom;
}

function renderRooms() {
  const date = els.today.value;
  const rows = state.rooms.slice().sort((a, b) => a.code.localeCompare(b.code)).map(room => {
    const usage = roomUsage(room.code, date);
    let status = '<span class="badge ok">Disponibile</span>';
    if (usage.occupied > usage.capacity) status = '<span class="badge bad">Overbooking</span>';
    else if (usage.available === 0) status = '<span class="badge warn">Completa</span>';

    return '<tr>' +
      '<td><span class="room-pill">' + escapeHtml(room.code) + '</span></td>' +
      '<td><strong>' + escapeHtml(room.typeLabel) + '</strong></td>' +
      '<td>' + usage.capacity + '</td>' +
      '<td>' + usage.occupied + '</td>' +
      '<td>' + usage.available + '</td>' +
      '<td>' + status + '</td>' +
      '<td class="right"><button class="btn secondary" type="button" data-delete-room="' + escapeHtml(room.code) + '">Elimina</button></td>' +
      '</tr>';
  });
  els.roomsTable.innerHTML = rows.join("");
}

function filteredStays() {
  const query = String(els.searchStay.value || "").trim().toLowerCase();
  const room = els.filterRoom.value || "all";
  return state.stays.filter(stay => room === "all" || stay.roomCode === room).filter(stay => {
    if (!query) return true;
    return [stay.roomCode, stay.workerId, stay.surname, stay.name, stay.company, stay.nationality, stay.role, stay.status].join(" ").toLowerCase().includes(query);
  }).sort((a, b) => String(b.checkIn || "").localeCompare(String(a.checkIn || "")));
}

function renderStays() {
  const rows = filteredStays().map(stay => {
    const fullName = (capitalize(stay.surname) + " " + capitalize(stay.name)).trim() || "-";
    const statusClass = stay.status === "confirmed" ? "ok" : stay.status === "cancelled" ? "bad" : "warn";
    return '<tr>' +
      '<td><strong>' + escapeHtml(fullName) + '</strong><div class="small">ID ' + escapeHtml(stay.workerId || "-") + ' · ' + escapeHtml(capitalize(stay.role) || "-") + '</div></td>' +
      '<td><span class="room-pill">' + escapeHtml(stay.roomCode) + '</span></td>' +
      '<td>' + escapeHtml(upper(stay.company) || "-") + '<div class="small">' + escapeHtml(stay.nationality || "-") + '</div></td>' +
      '<td>' + formatDate(stay.checkIn) + ' → ' + formatDate(stay.checkOut) + '</td>' +
      '<td><span class="badge ' + statusClass + '">' + escapeHtml(stay.status) + '</span></td>' +
      '<td class="right"><button class="btn secondary" type="button" data-delete-stay="' + escapeHtml(stay.id) + '">Elimina</button></td>' +
      '</tr>';
  });
  els.staysTable.innerHTML = rows.join("");
}

function renderHistory() {
  const html = state.rooms.slice().sort((a, b) => a.code.localeCompare(b.code)).map(room => {
    const stays = state.stays.filter(stay => stay.roomCode === room.code).sort((a, b) => String(a.checkIn || "").localeCompare(String(b.checkIn || "")));
    const stayHtml = stays.length ? stays.map(stay => {
      const fullName = (capitalize(stay.surname) + " " + capitalize(stay.name)).trim() || "-";
      return '<div class="stay-item"><strong>' + escapeHtml(fullName) + '</strong><div class="small">' + escapeHtml(upper(stay.company) || "-") + ' · ' + escapeHtml(stay.status || "-") + '</div><div class="small">' + formatDate(stay.checkIn) + ' → ' + formatDate(stay.checkOut) + '</div></div>';
    }).join("") : '<div class="small" style="margin-top:10px">Nessun soggiorno.</div>';
    return '<div class="history-room"><strong>Stanza ' + escapeHtml(room.code) + '</strong><div class="small">' + escapeHtml(room.typeLabel) + ' · capienza ' + escapeHtml(room.capacity) + '</div>' + stayHtml + '</div>';
  }).join("");
  els.historyGrid.innerHTML = html;
}

function addRoom() {
  const code = upper(els.roomCode.value);
  const typeLabel = String(els.roomType.value || "").trim();
  const capacity = Number(els.roomCapacity.value || 0);

  if (!code) return showNotice("bad", "Inserisci il numero stanza.");
  if (!typeLabel) return showNotice("bad", "Inserisci il tipo camera.");
  if (!capacity || capacity < 1) return showNotice("bad", "Inserisci una capienza valida.");
  if (state.rooms.some(room => room.code === code)) return showNotice("bad", "Questa stanza esiste già.");

  state.rooms.push({ code, typeLabel, capacity });
  els.roomCode.value = "";
  persistState("Camera salvata correttamente.");
}

function buildStayFromForm() {
  return {
    id: uid(),
    roomCode: upper(els.stayRoom.value),
    workerId: upper(els.workerId.value),
    surname: String(els.surname.value || "").trim(),
    name: String(els.name.value || "").trim(),
    company: upper(els.company.value),
    nationality: String(els.nationality.value || "").trim(),
    role: String(els.role.value || "").trim(),
    status: String(els.status.value || "confirmed").toLowerCase(),
    checkIn: els.checkIn.value,
    checkOut: els.checkOut.value
  };
}

function validateStay(stay) {
  if (!stay.roomCode || !stay.surname || !stay.name || !stay.company || !stay.checkIn || !stay.checkOut) return "Compila stanza, cognome, nome, azienda, check-in e check-out.";
  if (!isIsoDate(stay.checkIn) || !isIsoDate(stay.checkOut)) return "Inserisci date valide.";
  if (stay.checkIn >= stay.checkOut) return "Il check-out deve essere successivo al check-in.";
  const usage = roomUsageForPeriod(stay.roomCode, stay.checkIn, stay.checkOut);
  if (stay.status !== "cancelled" && usage.booked >= usage.capacity) return "Camera piena nel periodo selezionato.";
  const duplicate = stay.workerId && state.stays.some(item => {
    return isActiveStay(item) && upper(item.workerId) === stay.workerId && rangesOverlap(item.checkIn, item.checkOut, stay.checkIn, stay.checkOut);
  });
  if (duplicate) return "Worker ID già presente nello stesso periodo.";
  return "";
}

function addStay() {
  const stay = buildStayFromForm();
  const error = validateStay(stay);
  if (error) return showNotice("bad", error);
  state.stays.push(stay);
  resetStayForm();
  persistState("Soggiorno registrato correttamente.");
}

function resetStayForm() {
  [els.stayRoom, els.workerId, els.surname, els.name, els.company, els.nationality, els.role].forEach(input => input.value = "");
  els.status.value = "confirmed";
  els.checkIn.value = "";
  els.checkOut.value = "";
  setDefaultDates();
}

function deleteRoom(code) {
  if (state.stays.some(stay => stay.roomCode === code)) return showNotice("bad", "Non puoi eliminare una stanza con soggiorni collegati.");
  if (!confirm("Eliminare la stanza " + code + "?")) return;
  state.rooms = state.rooms.filter(room => room.code !== code);
  persistState("Stanza eliminata.");
}

function deleteStay(id) {
  const stay = state.stays.find(item => item.id === id);
  if (!stay) return;
  const fullName = (capitalize(stay.surname) + " " + capitalize(stay.name)).trim();
  if (!confirm("Eliminare il soggiorno di " + fullName + "?")) return;
  state.stays = state.stays.filter(item => item.id !== id);
  persistState("Soggiorno eliminato.");
}

function exportJson() {
  const payload = { exportedAt: new Date().toISOString(), rooms: state.rooms, stays: state.stays };
  downloadFile("hotel-fletcher-v2-backup-" + todayISO() + ".json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  showNotice("ok", "Backup JSON esportato.");
}

function importJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || "{}"));
      if (!Array.isArray(parsed.rooms) || !Array.isArray(parsed.stays)) throw new Error("Formato non valido");
      state = normalizeState(parsed);
      persistState("Backup JSON importato.");
    } catch (error) {
      showNotice("bad", "Import non riuscito: " + error.message);
    }
  };
  reader.readAsText(file);
}

function csvCell(value) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(';') || text.includes('\n')) {
    return '"' + text.replaceAll('"', '""') + '"';
  }
  return text;
}

function exportCsv() {
  const headers = ["Room number", "ID", "Surname", "Name", "Role", "Nationality", "Company", "Status", "Check in", "Check out"];
  const rows = state.stays.map(stay => [stay.roomCode, stay.workerId, capitalize(stay.surname), capitalize(stay.name), capitalize(stay.role), stay.nationality, upper(stay.company), stay.status, stay.checkIn, stay.checkOut]);
  const lines = [headers].concat(rows).map(row => row.map(csvCell).join(";"));
  const csv = "\ufeff" + lines.join("\n");
  downloadFile("hotel-fletcher-v2-export-" + todayISO() + ".csv", csv, "text/csv;charset=utf-8");
  showNotice("ok", "Export CSV generato.");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setDefaultDates() {
  if (!els.today.value) els.today.value = todayISO();
  if (!els.checkIn.value) els.checkIn.value = els.today.value;
  if (!els.checkOut.value) {
    const d = new Date((els.checkIn.value || todayISO()) + "T00:00:00");
    d.setDate(d.getDate() + 7);
    els.checkOut.value = d.toISOString().slice(0, 10);
  }
}

function bindEvents() {
  document.querySelectorAll(".tab-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
  });

  els.addRoomBtn.addEventListener("click", addRoom);
  els.addStayBtn.addEventListener("click", addStay);
  els.resetStayFormBtn.addEventListener("click", resetStayForm);
  els.today.addEventListener("change", renderAll);
  els.searchStay.addEventListener("input", renderStays);
  els.filterRoom.addEventListener("change", renderStays);
  els.exportJsonBtn.addEventListener("click", exportJson);
  els.importJsonBtn.addEventListener("click", () => els.importJsonFile.click());
  els.importJsonFile.addEventListener("change", event => {
    importJson(event.target.files && event.target.files[0]);
    event.target.value = "";
  });
  els.exportCsvBtn.addEventListener("click", exportCsv);

  document.addEventListener("click", event => {
    const roomCode = event.target.dataset.deleteRoom;
    const stayId = event.target.dataset.deleteStay;
    if (roomCode) deleteRoom(roomCode);
    if (stayId) deleteStay(stayId);
  });
}

try {
  setDefaultDates();
  injectAutoAssignButton();
  bindEvents();
  renderAll();
  console.info("Hotel Fletcher V2 stable loaded", { rooms: state.rooms.length, stays: state.stays.length });
} catch (error) {
  console.error("App startup failed", error);
  showNotice("bad", "Errore di avvio applicazione. Controlla la console.");
}
