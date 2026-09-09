(() => {
  "use strict";

  const config = window.AGENDA_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const db = configured ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  const locale = "es-AR";
  const demoStorageKey = "agenda-hibrida-demo-v2";

  const state = {
    view: "week",
    cursor: new Date(),
    activities: [],
    user: null,
    canEdit: !configured,
  };

  const el = (id) => document.getElementById(id);
  const agenda = el("agenda");
  const status = el("status");
  const activityDialog = el("activityDialog");
  const importDialog = el("importDialog");
  const detailDialog = el("detailDialog");
  const authDialog = el("authDialog");

  function localDate(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  function startOfWeek(date) {
    const copy = localDate(date);
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return copy;
  }
  function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
  function addDays(date, amount) { const copy = new Date(date); copy.setDate(copy.getDate() + amount); return copy; }
  function addMonths(date, amount) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
  function toISODate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  function fromISODate(value) { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); }
  function titleCase(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ""; }
  function weekday(date, format = "long") { return titleCase(new Intl.DateTimeFormat(locale, { weekday: format }).format(date)); }
  function formatDate(date, options) { return new Intl.DateTimeFormat(locale, options).format(date); }
  function cleanTime(value) { return (value || "").slice(0, 5); }

  function demoRecords() {
    const monday = startOfWeek(new Date());
    return [
      {
        id: "demo-1", date: toISODate(monday), start_time: "09:00", end_time: "11:00",
        name: "Jornada de actualización en Derecho Procesal", secretary: "Secretaría de Posgrado",
        responsible: "Mariana López", classroom: "Aula Magna", requirements: "Dos micrófonos, cámara fija y presentación. Realizar prueba técnica 30 minutos antes.",
        meeting_url: "https://meet.google.com/", platform: "Google Meet", account_used: "Cuenta institucional Posgrado", recording_required: true, observations: ""
      },
      {
        id: "demo-2", date: toISODate(addDays(monday, 1)), start_time: "16:00", end_time: "18:00",
        name: "Defensa de trabajo final", secretary: "Secretaría Académica", responsible: "Lucas Fernández",
        classroom: "Sala de Posgrado 2", requirements: "Notebook, proyector y audio bidireccional.", meeting_url: "https://zoom.us/",
        platform: "Zoom", account_used: "Licencia Zoom Facultad", recording_required: true, observations: ""
      },
      {
        id: "demo-3", date: toISODate(addDays(monday, 3)), start_time: "10:30", end_time: "12:00",
        name: "Reunión de coordinación académica", secretary: "Educación a Distancia", responsible: "Sofía Martínez",
        classroom: "Sala de Consejo", requirements: "Pantalla y cámara móvil. Participan autoridades de dos sedes.", meeting_url: "https://teams.microsoft.com/",
        platform: "Microsoft Teams", account_used: "Secretaría Académica", recording_required: false, observations: ""
      }
    ];
  }

  function loadDemoData() {
    const saved = localStorage.getItem(demoStorageKey);
    if (saved) { try { return JSON.parse(saved); } catch (_) { /* reset below */ } }
    const examples = demoRecords();
    localStorage.setItem(demoStorageKey, JSON.stringify(examples));
    return examples;
  }
  function writeDemoData(records) { localStorage.setItem(demoStorageKey, JSON.stringify(records)); }

  async function init() {
    el("demoBanner").hidden = configured;
    bindEvents();
    if (configured) {
      const { data } = await db.auth.getSession();
      state.user = data.session?.user || null;
      await refreshPermission();
      db.auth.onAuthStateChange((_event, session) => {
        state.user = session?.user || null;
        setTimeout(async () => { await refreshPermission(); updateAuthUI(); }, 0);
      });
    }
    updateAuthUI();
    setView("week");
  }

  function bindEvents() {
    el("weekView").addEventListener("click", () => setView("week"));
    el("monthView").addEventListener("click", () => setView("month"));
    el("previousPeriod").addEventListener("click", () => movePeriod(-1));
    el("nextPeriod").addEventListener("click", () => movePeriod(1));
    el("currentPeriod").addEventListener("click", () => { state.cursor = new Date(); loadPeriod(); });
    el("newActivity").addEventListener("click", () => openActivityForm());
    el("importCalendar").addEventListener("click", openImportForm);
    el("authButton").addEventListener("click", handleAuthButton);
    el("activityForm").addEventListener("submit", saveActivity);
    el("importForm").addEventListener("submit", importCalendarFile);
    el("authForm").addEventListener("submit", sendMagicLink);
    el("date").addEventListener("change", updateWeekdayInput);
    el("icsFile").addEventListener("change", () => {
      el("icsFileName").textContent = el("icsFile").files[0]?.name || "Ningún archivo seleccionado";
    });
    document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => el(button.dataset.close).close()));
    [activityDialog, importDialog, detailDialog, authDialog].forEach((dialog) => {
      dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    });
  }

  async function refreshPermission() {
    if (!configured) { state.canEdit = true; return; }
    if (!state.user) { state.canEdit = false; return; }
    const { data, error } = await db.rpc("is_editor");
    state.canEdit = !error && data === true;
  }

  function updateAuthUI() {
    if (!configured) {
      el("sessionLabel").textContent = "Modo de prueba";
      el("authButton").textContent = "Configurar acceso";
    } else if (state.user) {
      el("sessionLabel").textContent = state.canEdit ? state.user.email : `${state.user.email} · sólo lectura`;
      el("authButton").textContent = "Salir";
    } else {
      el("sessionLabel").textContent = "Consulta pública";
      el("authButton").textContent = "Acceso del equipo";
    }
    document.querySelectorAll(".editor-only").forEach((node) => { node.hidden = !state.canEdit; });
  }

  async function handleAuthButton() {
    if (!configured) { alert("Completá config.js con los datos de Supabase para activar el acceso compartido."); return; }
    if (state.user) {
      await db.auth.signOut(); state.user = null; state.canEdit = false; updateAuthUI(); return;
    }
    el("authMessage").textContent = "";
    authDialog.showModal();
  }

  async function sendMagicLink(event) {
    event.preventDefault();
    const button = el("sendMagicLink");
    button.disabled = true;
    el("authMessage").textContent = "Enviando…";
    const redirect = `${location.origin}${location.pathname}`;
    const { error } = await db.auth.signInWithOtp({ email: el("authEmail").value.trim(), options: { emailRedirectTo: redirect } });
    el("authMessage").textContent = error ? `No se pudo enviar: ${error.message}` : "Listo. Revisá tu correo y abrí el enlace de acceso.";
    button.disabled = false;
  }

  function setView(view) {
    state.view = view;
    ["week", "month"].forEach((name) => {
      const button = el(`${name}View`);
      const active = name === view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    el("viewEyebrow").textContent = view === "week" ? "Vista semanal" : "Vista mensual";
    loadPeriod();
  }

  function movePeriod(direction) {
    state.cursor = state.view === "week" ? addDays(state.cursor, direction * 7) : addMonths(state.cursor, direction);
    loadPeriod();
  }

  function periodRange() {
    if (state.view === "week") {
      const start = startOfWeek(state.cursor);
      return { start, end: addDays(start, 6), visibleStart: start, visibleEnd: addDays(start, 6) };
    }
    const monthStart = startOfMonth(state.cursor);
    const gridStart = startOfWeek(monthStart);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const gridEnd = addDays(startOfWeek(monthEnd), 6);
    return { start: gridStart, end: gridEnd, visibleStart: monthStart, visibleEnd: monthEnd };
  }

  async function loadPeriod() {
    status.textContent = "Cargando agenda…";
    agenda.replaceChildren();
    const { start, end } = periodRange();
    if (configured) {
      const { data, error } = await db.from("activities").select("*")
        .gte("date", toISODate(start)).lte("date", toISODate(end)).order("date").order("start_time");
      if (error) { status.textContent = "No se pudo cargar la agenda. Verificá la conexión e intentá nuevamente."; return; }
      state.activities = data || [];
    } else {
      state.activities = loadDemoData().filter((item) => item.date >= toISODate(start) && item.date <= toISODate(end));
    }
    updatePeriodTitle();
    render();
  }

  function updatePeriodTitle() {
    if (state.view === "month") {
      el("periodTitle").textContent = titleCase(formatDate(state.cursor, { month: "long", year: "numeric" }));
      return;
    }
    const start = startOfWeek(state.cursor);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    const left = formatDate(start, sameMonth ? { day: "numeric" } : { day: "numeric", month: "long" });
    const right = formatDate(end, { day: "numeric", month: "long", year: "numeric" });
    el("periodTitle").textContent = `${left} – ${right}`;
  }

  function render() {
    agenda.replaceChildren();
    if (state.view === "week") renderWeek(); else renderMonth();
    const { visibleStart, visibleEnd } = periodRange();
    const count = state.activities.filter((item) => item.date >= toISODate(visibleStart) && item.date <= toISODate(visibleEnd)).length;
    status.textContent = `${count} ${count === 1 ? "actividad" : "actividades"}`;
  }

  function renderWeek() {
    const start = startOfWeek(state.cursor);
    for (let index = 0; index < 7; index += 1) {
      const date = addDays(start, index);
      const section = document.createElement("section");
      section.className = "day-section";
      const heading = document.createElement("div");
      heading.className = "day-heading";
      const h3 = document.createElement("h3"); h3.textContent = weekday(date);
      const p = document.createElement("p"); p.textContent = formatDate(date, { day: "numeric", month: "long" });
      heading.append(h3, p);
      const list = document.createElement("div"); list.className = "day-list";
      const items = activitiesForDate(date);
      if (!items.length) {
        const empty = document.createElement("p"); empty.className = "empty-day"; empty.textContent = "Sin actividades"; list.append(empty);
      } else items.forEach((item) => list.append(createActivityRow(item)));
      section.append(heading, list);
      agenda.append(section);
    }
  }

  function createActivityRow(item) {
    const details = document.createElement("details");
    details.className = "activity-row";
    const summary = document.createElement("summary"); summary.className = "activity-summary";
    const time = document.createElement("span"); time.className = "summary-time"; time.textContent = `${cleanTime(item.start_time)}–${cleanTime(item.end_time)}`;
    if (item.recording_required) { const dot = document.createElement("i"); dot.className = "recording-dot"; dot.title = "Requiere grabación"; time.append(dot); }
    const title = document.createElement("span"); title.className = "summary-title"; title.textContent = item.name;
    const room = document.createElement("span"); room.className = "summary-room"; room.textContent = item.classroom || "Lugar a confirmar";
    const chevron = document.createElement("span"); chevron.className = "summary-chevron"; chevron.textContent = "⌄";
    summary.append(time, title, room, chevron);
    const expanded = document.createElement("div"); expanded.className = "activity-expanded";
    expanded.append(createDetailsContent(item, true));
    details.append(summary, expanded);
    return details;
  }

  function createDetailsContent(item, includeEditorActions) {
    const wrapper = document.createElement("div");
    const details = document.createElement("div"); details.className = "activity-details";
    const combinedNotes = [item.requirements, item.observations].filter(Boolean).join(" · ");
    [
      ["Secretaría que organiza", item.secretary], ["Responsable", item.responsible], ["Plataforma", item.platform],
      ["Cuenta", item.account_used], ["Aula", item.classroom], ["Requerimientos / observaciones", combinedNotes || "Sin indicaciones"],
      ["Grabación", item.recording_required ? "Sí" : "No"]
    ].forEach(([label, value]) => {
      const block = document.createElement("div"); block.className = "detail-item";
      const labelNode = document.createElement("span"); labelNode.className = "detail-label"; labelNode.textContent = label;
      const valueNode = document.createElement("span"); valueNode.className = "detail-value"; valueNode.textContent = value || "—";
      block.append(labelNode, valueNode); details.append(block);
    });
    wrapper.append(details);
    if (isSafeUrl(item.meeting_url)) {
      const actions = document.createElement("div"); actions.className = "link-actions";
      const open = document.createElement("a"); open.className = "link-button primary"; open.href = item.meeting_url; open.target = "_blank"; open.rel = "noopener noreferrer"; open.textContent = "Abrir enlace ↗";
      const copy = document.createElement("button"); copy.className = "link-button"; copy.type = "button"; copy.textContent = "Copiar enlace"; copy.addEventListener("click", () => copyLink(item.meeting_url));
      actions.append(open, copy); wrapper.append(actions);
    }
    if (includeEditorActions && state.canEdit) {
      const actions = document.createElement("div"); actions.className = "card-actions editor-only";
      const edit = actionButton("Editar", () => openActivityForm(item));
      const duplicate = actionButton("Duplicar", () => duplicateActivity(item));
      const remove = actionButton("Eliminar", () => deleteActivity(item), "danger");
      actions.append(edit, duplicate, remove); wrapper.append(actions);
    }
    return wrapper;
  }

  function actionButton(label, handler, className = "") {
    const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.className = className; button.addEventListener("click", handler); return button;
  }

  function activitiesForDate(date) {
    return state.activities.filter((item) => item.date === toISODate(date)).sort((a, b) => cleanTime(a.start_time).localeCompare(cleanTime(b.start_time)));
  }

  function renderMonth() {
    const { start, end, visibleStart, visibleEnd } = periodRange();
    const calendar = document.createElement("div"); calendar.className = "month-calendar";
    const weekdays = document.createElement("div"); weekdays.className = "month-weekdays";
    ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach((name) => { const node = document.createElement("div"); node.textContent = name; weekdays.append(node); });
    const grid = document.createElement("div"); grid.className = "month-grid";
    const todayKey = toISODate(new Date());
    for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
      const cell = document.createElement("div"); cell.className = "month-day";
      if (date < visibleStart || date > visibleEnd) cell.classList.add("other-month");
      if (toISODate(date) === todayKey) cell.classList.add("today");
      const number = document.createElement("span"); number.className = "month-number"; number.textContent = date.getDate(); cell.append(number);
      activitiesForDate(date).forEach((item) => {
        const button = document.createElement("button"); button.type = "button"; button.className = "month-event";
        const time = document.createElement("strong"); time.textContent = cleanTime(item.start_time);
        const name = document.createTextNode(item.name);
        button.append(time, name); button.addEventListener("click", () => openDetail(item)); cell.append(button);
      });
      grid.append(cell);
    }
    calendar.append(weekdays, grid);
    const mobileList = document.createElement("div"); mobileList.className = "mobile-month-list";
    const monthItems = state.activities.filter((item) => item.date >= toISODate(visibleStart) && item.date <= toISODate(visibleEnd));
    const dates = [...new Set(monthItems.map((item) => item.date))].sort();
    if (!dates.length) {
      const empty = document.createElement("p"); empty.className = "empty-day"; empty.textContent = "Sin actividades este mes"; mobileList.append(empty);
    } else dates.forEach((dateValue) => {
      const date = fromISODate(dateValue);
      const section = document.createElement("section"); section.className = "day-section";
      const heading = document.createElement("div"); heading.className = "day-heading";
      const h3 = document.createElement("h3"); h3.textContent = weekday(date);
      const p = document.createElement("p"); p.textContent = formatDate(date, { day: "numeric", month: "long" }); heading.append(h3, p);
      const list = document.createElement("div"); list.className = "day-list"; activitiesForDate(date).forEach((item) => list.append(createActivityRow(item)));
      section.append(heading, list); mobileList.append(section);
    });
    agenda.append(calendar, mobileList);
  }

  function openDetail(item) {
    const date = fromISODate(item.date);
    el("detailDate").textContent = `${weekday(date)} ${formatDate(date, { day: "numeric", month: "long" })} · ${cleanTime(item.start_time)}–${cleanTime(item.end_time)}`;
    el("detailTitle").textContent = item.name;
    el("detailBody").replaceChildren(createDetailsContent(item, true));
    detailDialog.showModal();
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
    } catch (_) {
      const input = document.createElement("textarea"); input.value = url; input.style.position = "fixed"; input.style.opacity = "0"; document.body.append(input); input.select(); document.execCommand("copy"); input.remove();
    }
    showToast("Enlace copiado");
  }

  function showToast(message) {
    const toast = el("toast"); toast.textContent = message; toast.hidden = false;
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  function isSafeUrl(value) { if (!value) return false; try { return ["https:", "http:"].includes(new URL(value).protocol); } catch (_) { return false; } }

  function openActivityForm(item = null) {
    if (!state.canEdit) return;
    if (detailDialog.open) detailDialog.close();
    el("activityForm").reset(); el("formError").hidden = true; el("activityId").value = item?.id || "";
    el("formTitle").textContent = item ? "Editar actividad" : "Nueva actividad";
    const { start, end } = periodRange(); const today = localDate(new Date()); const defaultDate = today >= start && today <= end ? today : start;
    el("date").value = item?.date || toISODate(defaultDate);
    el("startTime").value = cleanTime(item?.start_time) || "09:00"; el("endTime").value = cleanTime(item?.end_time) || "10:00";
    el("name").value = item?.name || ""; el("secretary").value = item?.secretary || ""; el("responsible").value = item?.responsible || "";
    el("classroom").value = item?.classroom || ""; el("platform").value = item?.platform || ""; el("accountUsed").value = item?.account_used || "";
    el("meetingUrl").value = item?.meeting_url || ""; el("requirements").value = [item?.requirements, item?.observations].filter(Boolean).join(" · ");
    el("recordingRequired").checked = Boolean(item?.recording_required); updateWeekdayInput(); activityDialog.showModal();
  }

  function updateWeekdayInput() { el("weekdayDisplay").value = el("date").value ? weekday(fromISODate(el("date").value)) : ""; }

  function activityPayload() {
    return {
      date: el("date").value, start_time: el("startTime").value, end_time: el("endTime").value, name: el("name").value.trim(),
      secretary: el("secretary").value.trim(), responsible: el("responsible").value.trim(), classroom: el("classroom").value.trim(),
      activity_type: "", platform: el("platform").value.trim(), account_used: el("accountUsed").value.trim(), meeting_url: el("meetingUrl").value.trim(),
      requirements: el("requirements").value.trim(), observations: "", recording_required: el("recordingRequired").checked
    };
  }

  async function saveActivity(event) {
    event.preventDefault(); if (!state.canEdit) return;
    const payload = activityPayload(); const id = el("activityId").value; const errorBox = el("formError");
    if (payload.end_time <= payload.start_time) { errorBox.textContent = "La hora de finalización debe ser posterior a la de inicio."; errorBox.hidden = false; return; }
    const button = el("saveActivity"); button.disabled = true; button.textContent = "Guardando…";
    let error = null;
    if (configured) {
      const result = id ? await db.from("activities").update(payload).eq("id", id) : await db.from("activities").insert(payload); error = result.error;
    } else {
      const records = loadDemoData(); const index = records.findIndex((item) => item.id === id);
      if (index >= 0) records[index] = { ...records[index], ...payload }; else records.push({ ...payload, id: crypto.randomUUID() });
      writeDemoData(records);
    }
    button.disabled = false; button.textContent = "Guardar actividad";
    if (error) { errorBox.textContent = `No se pudo guardar: ${error.message}`; errorBox.hidden = false; return; }
    activityDialog.close(); state.cursor = fromISODate(payload.date); await loadPeriod(); showToast("Actividad guardada");
  }

  function duplicateActivity(item) { openActivityForm({ ...item, id: null, date: toISODate(addDays(fromISODate(item.date), 7)) }); }

  async function deleteActivity(item) {
    if (!state.canEdit || !confirm(`¿Eliminar “${item.name}”?`)) return;
    if (configured) {
      const { error } = await db.from("activities").delete().eq("id", item.id); if (error) { alert(`No se pudo eliminar: ${error.message}`); return; }
    } else writeDemoData(loadDemoData().filter((record) => record.id !== item.id));
    detailDialog.close(); await loadPeriod(); showToast("Actividad eliminada");
  }

  function openImportForm() {
    if (!state.canEdit) return;
    el("importForm").reset(); el("icsFileName").textContent = "Ningún archivo seleccionado"; el("importMessage").hidden = true; importDialog.showModal();
  }

  async function importCalendarFile(event) {
    event.preventDefault(); if (!state.canEdit) return;
    const file = el("icsFile").files[0]; const message = el("importMessage");
    if (!file) { message.textContent = "Seleccioná un archivo .ics."; message.hidden = false; return; }
    const button = el("runImport"); button.disabled = true; button.textContent = "Importando…";
    try {
      const defaults = {
        secretary: el("importSecretary").value.trim(), responsible: el("importResponsible").value.trim(), platform: el("importPlatform").value.trim(),
        account_used: el("importAccount").value.trim(), requirements: el("importRequirements").value.trim(), recording_required: el("importRecording").checked
      };
      const events = parseICS(await file.text(), defaults);
      if (!events.length) throw new Error("No se encontraron eventos con fecha y horario en el archivo.");
      let imported = 0;
      if (configured) {
        for (let index = 0; index < events.length; index += 100) {
          const { error } = await db.from("activities").upsert(events.slice(index, index + 100), { onConflict: "source_uid", ignoreDuplicates: true });
          if (error) throw error; imported += Math.min(100, events.length - index);
        }
      } else {
        const records = loadDemoData(); const known = new Set(records.map((item) => item.source_uid).filter(Boolean));
        events.forEach((item) => { if (!known.has(item.source_uid)) { records.push({ ...item, id: crypto.randomUUID() }); imported += 1; } }); writeDemoData(records);
      }
      importDialog.close(); state.cursor = fromISODate(events[0].date); await loadPeriod(); showToast(`${imported} ${imported === 1 ? "actividad importada" : "actividades importadas"}`);
    } catch (error) {
      message.textContent = `No se pudo importar: ${error.message}`; message.hidden = false;
    } finally { button.disabled = false; button.textContent = "Importar actividades"; }
  }

  function parseICS(text, defaults) {
    const unfolded = text.replace(/\r?\n[ \t]/g, "");
    const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    const result = [];
    blocks.forEach((block) => {
      const values = {};
      block.split(/\r?\n/).forEach((line) => {
        const colon = line.indexOf(":"); if (colon < 0) return;
        const rawKey = line.slice(0, colon); const key = rawKey.split(";")[0].toUpperCase();
        if (!values[key]) values[key] = { value: line.slice(colon + 1), rawKey };
      });
      if (!values.DTSTART || !values.SUMMARY) return;
      const start = parseICSDate(values.DTSTART.value);
      const end = values.DTEND ? parseICSDate(values.DTEND.value) : new Date(start.date.getTime() + 60 * 60 * 1000);
      const description = unescapeICS(values.DESCRIPTION?.value || "");
      const location = unescapeICS(values.LOCATION?.value || "") || "Lugar a confirmar";
      const summary = unescapeICS(values.SUMMARY.value);
      const url = extractEventUrl(unescapeICS(values.URL?.value || ""), description);
      const platform = defaults.platform || detectPlatform(`${url} ${description}`);
      const uid = unescapeICS(values.UID?.value || `${summary}-${values.DTSTART.value}`);
      const base = {
        date: toISODate(start.date), start_time: start.allDay ? "09:00" : timeFromDate(start.date), end_time: end.allDay ? "10:00" : timeFromDate(end.date),
        name: summary.slice(0, 160), secretary: defaults.secretary, responsible: defaults.responsible, classroom: location.slice(0, 100), activity_type: "",
        requirements: [description, defaults.requirements].filter(Boolean).join(" · ").slice(0, 1000), observations: "", meeting_url: url,
        platform, account_used: defaults.account_used, recording_required: defaults.recording_required, source_uid: `${uid}-${toISODate(start.date)}`
      };
      result.push(base);
      expandSimpleRecurrence(base, values.RRULE?.value, start.date, end.date, uid).forEach((item) => result.push(item));
    });
    const unique = new Map(); result.forEach((item) => unique.set(item.source_uid, item));
    return [...unique.values()].sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`));
  }

  function parseICSDate(value) {
    const clean = value.trim();
    if (/^\d{8}$/.test(clean)) return { date: new Date(Number(clean.slice(0,4)), Number(clean.slice(4,6))-1, Number(clean.slice(6,8)), 9, 0), allDay: true };
    const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
    if (!match) throw new Error(`Fecha de calendario no reconocida: ${clean}`);
    const [, y,m,d,h,min,s = "00",utc] = match;
    const date = utc ? new Date(Date.UTC(+y,+m-1,+d,+h,+min,+s)) : new Date(+y,+m-1,+d,+h,+min,+s);
    return { date, allDay: false };
  }

  function timeFromDate(date) { return `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`; }
  function unescapeICS(value) { return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim(); }
  function extractEventUrl(explicitUrl, description) {
    const candidates = `${explicitUrl} ${description}`.match(/https?:\/\/[^\s<>]+/gi) || [];
    const preferred = candidates.find((url) => /zoom\.us|meet\.google\.com|teams\.microsoft\.com/i.test(url));
    return (preferred || candidates[0] || "").replace(/[),.;]+$/, "").slice(0, 500);
  }
  function detectPlatform(text) {
    if (/zoom\.us/i.test(text)) return "Zoom";
    if (/meet\.google\.com/i.test(text)) return "Google Meet";
    if (/teams\.microsoft\.com/i.test(text)) return "Microsoft Teams";
    if (/youtube\.com|youtu\.be/i.test(text)) return "YouTube";
    return "";
  }

  function expandSimpleRecurrence(base, ruleText, startDate, endDate, uid) {
    if (!ruleText) return [];
    const rule = Object.fromEntries(ruleText.split(";").map((part) => part.split("=")));
    if (!['DAILY','WEEKLY'].includes(rule.FREQ)) return [];
    const limit = rule.UNTIL ? parseICSDate(rule.UNTIL).date : addMonths(startDate, 12);
    const maxCount = Math.min(Number(rule.COUNT || 400), 400);
    const duration = endDate.getTime() - startDate.getTime();
    const interval = Math.max(Number(rule.INTERVAL || 1), 1);
    const days = { MO:1, TU:2, WE:3, TH:4, FR:5, SA:6, SU:0 };
    const byDays = (rule.BYDAY || "").split(",").map((day) => days[day.slice(-2)]).filter((day) => day !== undefined);
    const occurrences = [];
    for (let cursor = addDays(startDate, 1), guard = 0; cursor <= limit && occurrences.length + 1 < maxCount && guard < 3700; cursor = addDays(cursor, 1), guard += 1) {
      const diffDays = Math.round((localDate(cursor) - localDate(startDate)) / 86400000);
      const matches = rule.FREQ === 'DAILY' ? diffDays % interval === 0 : Math.floor(diffDays / 7) % interval === 0 && (byDays.length ? byDays.includes(cursor.getDay()) : cursor.getDay() === startDate.getDay());
      if (!matches) continue;
      const end = new Date(cursor.getTime() + duration);
      occurrences.push({ ...base, date: toISODate(cursor), start_time: timeFromDate(cursor), end_time: timeFromDate(end), source_uid: `${uid}-${toISODate(cursor)}` });
    }
    return occurrences;
  }

  init();
})();
