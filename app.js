(() => {
  "use strict";

  const config = window.AGENDA_CONFIG || {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey && window.supabase);
  const db = configured ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
  const locale = "es-AR";
  const demoStorageKey = "agenda-hibrida-demo-v1";

  const state = {
    weekStart: startOfWeek(new Date()),
    activities: [],
    user: null,
    canEdit: !configured,
  };

  const el = (id) => document.getElementById(id);
  const agenda = el("agenda");
  const status = el("status");
  const activityDialog = el("activityDialog");
  const authDialog = el("authDialog");
  const activityForm = el("activityForm");
  const filters = ["filterDay", "filterClassroom", "filterResponsible", "filterPlatform", "filterRecording"];

  function startOfWeek(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return copy;
  }

  function addDays(date, amount) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + amount);
    return copy;
  }

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function fromISODate(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function titleCase(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
  }

  function formatWeekday(date) {
    return titleCase(new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date));
  }

  function formatLongDate(date) {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date);
  }

  function demoRecords() {
    const monday = startOfWeek(new Date());
    return [
      {
        id: "demo-1", date: toISODate(addDays(monday, 0)), start_time: "09:00", end_time: "11:00",
        name: "Jornada de actualización en Derecho Procesal", responsible: "Mariana López", classroom: "Aula Magna",
        activity_type: "Jornada", requirements: "Dos micrófonos, cámara fija y presentación", meeting_url: "https://meet.google.com/",
        platform: "Google Meet", account_used: "Cuenta institucional Posgrado", recording_required: true,
        observations: "Realizar prueba técnica 30 minutos antes."
      },
      {
        id: "demo-2", date: toISODate(addDays(monday, 1)), start_time: "16:00", end_time: "18:00",
        name: "Defensa de trabajo final", responsible: "Lucas Fernández", classroom: "Sala de Posgrado 2",
        activity_type: "Defensa", requirements: "Notebook, proyector y audio bidireccional", meeting_url: "https://zoom.us/",
        platform: "Zoom", account_used: "Licencia Zoom Facultad", recording_required: true, observations: ""
      },
      {
        id: "demo-3", date: toISODate(addDays(monday, 3)), start_time: "10:30", end_time: "12:00",
        name: "Reunión de coordinación académica", responsible: "Sofía Martínez", classroom: "Sala de Consejo",
        activity_type: "Reunión", requirements: "Pantalla y cámara móvil", meeting_url: "https://teams.microsoft.com/",
        platform: "Microsoft Teams", account_used: "Secretaría Académica", recording_required: false,
        observations: "Participan autoridades de dos sedes."
      }
    ];
  }

  function loadDemoData() {
    const saved = localStorage.getItem(demoStorageKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (_) { /* use examples */ }
    }
    const examples = demoRecords();
    localStorage.setItem(demoStorageKey, JSON.stringify(examples));
    return examples;
  }

  function saveDemoData() {
    localStorage.setItem(demoStorageKey, JSON.stringify(state.activities));
  }

  async function init() {
    el("demoBanner").hidden = configured;
    bindEvents();
    if (configured) {
      const { data } = await db.auth.getSession();
      state.user = data.session?.user || null;
      await refreshPermission();
      db.auth.onAuthStateChange((_event, session) => {
        state.user = session?.user || null;
        setTimeout(async () => {
          await refreshPermission();
          updateAuthUI();
        }, 0);
      });
    }
    updateAuthUI();
    await loadWeek();
  }

  function bindEvents() {
    el("previousWeek").addEventListener("click", () => changeWeek(-7));
    el("nextWeek").addEventListener("click", () => changeWeek(7));
    el("currentWeek").addEventListener("click", () => { state.weekStart = startOfWeek(new Date()); loadWeek(); });
    el("newActivity").addEventListener("click", () => openActivityForm());
    el("authButton").addEventListener("click", handleAuthButton);
    el("clearFilters").addEventListener("click", clearFilters);
    filters.forEach((id) => el(id).addEventListener("change", render));
    el("date").addEventListener("change", updateWeekdayInput);
    activityForm.addEventListener("submit", saveActivity);
    el("authForm").addEventListener("submit", sendMagicLink);
    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => el(button.dataset.close).close());
    });
    [activityDialog, authDialog].forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  async function refreshPermission() {
    if (!configured) { state.canEdit = true; return; }
    if (!state.user) { state.canEdit = false; return; }
    const { data, error } = await db.rpc("is_editor");
    state.canEdit = !error && data === true;
  }

  function updateAuthUI() {
    const sessionLabel = el("sessionLabel");
    const authButton = el("authButton");
    if (!configured) {
      sessionLabel.textContent = "Modo de prueba";
      authButton.textContent = "Configurar acceso";
    } else if (state.user) {
      sessionLabel.textContent = state.canEdit ? state.user.email : `${state.user.email} · sólo lectura`;
      authButton.textContent = "Salir";
    } else {
      sessionLabel.textContent = "Consulta pública";
      authButton.textContent = "Acceso del equipo";
    }
    document.querySelectorAll(".editor-only").forEach((node) => { node.hidden = !state.canEdit; });
  }

  async function handleAuthButton() {
    if (!configured) {
      alert("Para activar el acceso compartido, completá config.js con los datos de Supabase. Las instrucciones están en README.md.");
      return;
    }
    if (state.user) {
      await db.auth.signOut();
      state.user = null;
      state.canEdit = false;
      updateAuthUI();
      return;
    }
    el("authMessage").textContent = "";
    authDialog.showModal();
  }

  async function sendMagicLink(event) {
    event.preventDefault();
    const button = el("sendMagicLink");
    const message = el("authMessage");
    button.disabled = true;
    message.textContent = "Enviando…";
    const email = el("authEmail").value.trim();
    const redirect = `${location.origin}${location.pathname}`;
    const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    message.textContent = error ? `No se pudo enviar: ${error.message}` : "Listo. Revisá tu correo y abrí el enlace de acceso.";
    button.disabled = false;
  }

  async function changeWeek(days) {
    state.weekStart = addDays(state.weekStart, days);
    await loadWeek();
  }

  async function loadWeek() {
    status.textContent = "Cargando agenda…";
    agenda.replaceChildren();
    const weekEnd = addDays(state.weekStart, 6);
    if (configured) {
      const { data, error } = await db.from("activities").select("*")
        .gte("date", toISODate(state.weekStart)).lte("date", toISODate(weekEnd))
        .order("date").order("start_time");
      if (error) {
        status.textContent = "No se pudo cargar la agenda. Verificá la conexión e intentá nuevamente.";
        return;
      }
      state.activities = data || [];
    } else {
      state.activities = loadDemoData().filter((item) => item.date >= toISODate(state.weekStart) && item.date <= toISODate(weekEnd));
    }
    updateWeekTitle();
    populateFilters();
    render();
  }

  function updateWeekTitle() {
    const end = addDays(state.weekStart, 6);
    const sameMonth = state.weekStart.getMonth() === end.getMonth();
    const startText = new Intl.DateTimeFormat(locale, sameMonth ? { day: "numeric" } : { day: "numeric", month: "long" }).format(state.weekStart);
    const endText = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(end);
    el("weekTitle").textContent = `${startText} – ${endText}`;
  }

  function populateFilters() {
    const current = Object.fromEntries(filters.map((id) => [id, el(id).value]));
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(state.weekStart, index);
      return [toISODate(date), `${formatWeekday(date)} ${date.getDate()}`];
    });
    setOptions(el("filterDay"), days, "Todos");
    setOptions(el("filterClassroom"), uniqueValues("classroom"), "Todas");
    setOptions(el("filterResponsible"), uniqueValues("responsible"), "Todos");
    setOptions(el("filterPlatform"), uniqueValues("platform"), "Todas");
    for (const [id, value] of Object.entries(current)) {
      if ([...el(id).options].some((option) => option.value === value)) el(id).value = value;
    }
  }

  function uniqueValues(field) {
    return [...new Set(state.activities.map((item) => item[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, locale)).map((value) => [value, value]);
  }

  function setOptions(select, values, allLabel) {
    const first = new Option(allLabel, "");
    select.replaceChildren(first, ...values.map(([value, label]) => new Option(label, value)));
  }

  function clearFilters() {
    filters.forEach((id) => { el(id).value = ""; });
    render();
  }

  function filteredActivities() {
    const day = el("filterDay").value;
    const classroom = el("filterClassroom").value;
    const responsible = el("filterResponsible").value;
    const platform = el("filterPlatform").value;
    const recording = el("filterRecording").value;
    return state.activities.filter((item) =>
      (!day || item.date === day) &&
      (!classroom || item.classroom === classroom) &&
      (!responsible || item.responsible === responsible) &&
      (!platform || item.platform === platform) &&
      (!recording || String(Boolean(item.recording_required)) === recording)
    );
  }

  function render() {
    agenda.replaceChildren();
    const activities = filteredActivities();
    const selectedDay = el("filterDay").value;
    const days = selectedDay ? [fromISODate(selectedDay)] : Array.from({ length: 7 }, (_, index) => addDays(state.weekStart, index));
    let visibleCount = 0;

    days.forEach((date) => {
      const dateKey = toISODate(date);
      const items = activities.filter((item) => item.date === dateKey).sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (hasActiveNonDayFilters() && !items.length) return;
      const section = document.createElement("section");
      section.className = "day-section";
      const heading = document.createElement("div");
      heading.className = "day-heading";
      const h3 = document.createElement("h3");
      h3.textContent = formatWeekday(date);
      const p = document.createElement("p");
      p.textContent = formatLongDate(date);
      heading.append(h3, p);
      const list = document.createElement("div");
      list.className = "day-list";
      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "empty-day";
        empty.textContent = "Sin actividades programadas.";
        list.append(empty);
      } else {
        items.forEach((item) => list.append(createActivityCard(item)));
        visibleCount += items.length;
      }
      section.append(heading, list);
      agenda.append(section);
    });
    status.textContent = agenda.children.length ? `${visibleCount} ${visibleCount === 1 ? "actividad" : "actividades"}` : "No hay actividades que coincidan con los filtros.";
  }

  function hasActiveNonDayFilters() {
    return ["filterClassroom", "filterResponsible", "filterPlatform", "filterRecording"].some((id) => el(id).value);
  }

  function createActivityCard(item) {
    const card = el("activityTemplate").content.firstElementChild.cloneNode(true);
    card.querySelector(".start").textContent = item.start_time.slice(0, 5);
    card.querySelector(".end").textContent = `a ${item.end_time.slice(0, 5)}`;
    card.querySelector(".type-pill").textContent = item.activity_type || "";
    card.querySelector(".recording-badge").hidden = !item.recording_required;
    card.querySelector("h4").textContent = item.name;
    const details = card.querySelector(".activity-details");
    [
      ["Responsable", item.responsible], ["Aula", item.classroom], ["Plataforma", item.platform],
      ["Requerimientos", item.requirements], ["Cuenta", item.account_used], ["Observaciones", item.observations]
    ].filter(([, value]) => value).forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "detail-row";
      const dt = document.createElement("dt");
      dt.textContent = `${label}:`;
      const dd = document.createElement("dd");
      dd.textContent = value;
      row.append(dt, dd);
      details.append(row);
    });
    const link = card.querySelector(".meeting-link");
    if (isSafeUrl(item.meeting_url)) link.href = item.meeting_url; else link.hidden = true;
    const actions = card.querySelector(".card-actions");
    actions.hidden = !state.canEdit;
    actions.querySelector('[data-action="edit"]').addEventListener("click", () => openActivityForm(item));
    actions.querySelector('[data-action="duplicate"]').addEventListener("click", () => duplicateActivity(item));
    actions.querySelector('[data-action="delete"]').addEventListener("click", () => deleteActivity(item));
    return card;
  }

  function isSafeUrl(value) {
    if (!value) return false;
    try { return ["https:", "http:"].includes(new URL(value).protocol); } catch (_) { return false; }
  }

  function openActivityForm(item = null) {
    if (!state.canEdit) return;
    activityForm.reset();
    el("formError").hidden = true;
    el("activityId").value = item?.id || "";
    el("formTitle").textContent = item ? "Editar actividad" : "Nueva actividad";
    const today = new Date();
    const currentWeekEnd = addDays(state.weekStart, 6);
    const defaultDate = today >= state.weekStart && today <= currentWeekEnd ? today : state.weekStart;
    const date = item?.date || toISODate(defaultDate);
    el("date").value = date;
    el("startTime").value = item?.start_time?.slice(0, 5) || "09:00";
    el("endTime").value = item?.end_time?.slice(0, 5) || "10:00";
    el("name").value = item?.name || "";
    el("responsible").value = item?.responsible || "";
    el("classroom").value = item?.classroom || "";
    el("activityType").value = item?.activity_type || "";
    el("requirements").value = item?.requirements || "";
    el("meetingUrl").value = item?.meeting_url || "";
    el("platform").value = item?.platform || "";
    el("accountUsed").value = item?.account_used || "";
    el("recordingRequired").checked = Boolean(item?.recording_required);
    el("observations").value = item?.observations || "";
    updateWeekdayInput();
    activityDialog.showModal();
  }

  function updateWeekdayInput() {
    el("weekdayDisplay").value = el("date").value ? formatWeekday(fromISODate(el("date").value)) : "";
  }

  function activityPayload() {
    return {
      date: el("date").value,
      start_time: el("startTime").value,
      end_time: el("endTime").value,
      name: el("name").value.trim(),
      responsible: el("responsible").value.trim(),
      classroom: el("classroom").value.trim(),
      activity_type: el("activityType").value.trim(),
      requirements: el("requirements").value.trim(),
      meeting_url: el("meetingUrl").value.trim(),
      platform: el("platform").value,
      account_used: el("accountUsed").value.trim(),
      recording_required: el("recordingRequired").checked,
      observations: el("observations").value.trim()
    };
  }

  async function saveActivity(event) {
    event.preventDefault();
    if (!state.canEdit) return;
    const payload = activityPayload();
    const errorBox = el("formError");
    if (payload.end_time <= payload.start_time) {
      errorBox.textContent = "La hora de finalización debe ser posterior a la hora de inicio.";
      errorBox.hidden = false;
      return;
    }
    const button = el("saveActivity");
    const id = el("activityId").value;
    button.disabled = true;
    button.textContent = "Guardando…";
    let error = null;
    if (configured) {
      const result = id ? await db.from("activities").update(payload).eq("id", id) : await db.from("activities").insert(payload);
      error = result.error;
    } else {
      const all = loadDemoData();
      if (id) {
        const index = all.findIndex((item) => item.id === id);
        if (index >= 0) all[index] = { ...all[index], ...payload };
      } else {
        all.push({ ...payload, id: crypto.randomUUID() });
      }
      state.activities = all;
      saveDemoData();
    }
    button.disabled = false;
    button.textContent = "Guardar actividad";
    if (error) {
      errorBox.textContent = `No se pudo guardar: ${error.message}`;
      errorBox.hidden = false;
      return;
    }
    activityDialog.close();
    state.weekStart = startOfWeek(fromISODate(payload.date));
    await loadWeek();
  }

  function duplicateActivity(item) {
    const copy = { ...item, id: null, date: toISODate(addDays(fromISODate(item.date), 7)) };
    openActivityForm(copy);
  }

  async function deleteActivity(item) {
    if (!state.canEdit || !confirm(`¿Eliminar “${item.name}”? Esta acción no se puede deshacer.`)) return;
    if (configured) {
      const { error } = await db.from("activities").delete().eq("id", item.id);
      if (error) { alert(`No se pudo eliminar: ${error.message}`); return; }
    } else {
      state.activities = loadDemoData().filter((record) => record.id !== item.id);
      saveDemoData();
    }
    await loadWeek();
  }

  init();
})();
