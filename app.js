import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, onAuthStateChanged, setPersistence, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { collection, deleteField, doc, getDocs, getFirestore, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const config = window.AGENDA_CONFIG || {};
const demoMode = new URLSearchParams(location.search).has("demo");
const configured = Boolean(config.firebaseConfig?.apiKey) && !demoMode;
const adminEmail = String(config.adminEmail || "").trim().toLowerCase();
const firebaseApp = configured ? initializeApp(config.firebaseConfig) : null;
const db = configured ? getFirestore(firebaseApp) : null;
const auth = configured ? getAuth(firebaseApp) : null;
const activitiesCollection = "actividades";
const privateActivitiesCollection = "actividades_privadas";
const locale = "es-AR";
const demoStorageKey = "agenda-hibrida-demo-firebase-v2";
const calendarEnd = new Date(2026, 11, 28);
const holidays = new Set(["2026-10-12", "2026-11-23", "2026-12-07", "2026-12-08"]);
const classroomOptions = ["Aula A", "Aula B", "Aula C", "Aula D", "Aula E", "Aula F", "Aula G", "Aula Magna", "Aula H (Magnita)", "Aula I", "Aula J", "Aula K", "Aula L", "Aula M", "Laboratorio", "Biblioteca", "Consejo Directivo"];
const secretaryOptions = ["Secretaría Académica", "Secretaría de Posgrado", "Secretaría de Investigación, Ciencia y Técnica", "Secretaría de Relaciones Estudiantiles y Egresados/as", "Secretaría de Extensión, Vinculación y Territorio", "Secretaría General", "Secretaría Económica - Financiera", "Dirección TIC", "Personal de apoyo", "Decanato"];
const organizerColors = new Map([
  ["Secretaría Académica", "#45A7D8"],
  ["Secretaría de Posgrado", "#00597B"],
  ["Secretaría de Investigación, Ciencia y Técnica", "#0396A6"],
  ["Secretaría de Relaciones Estudiantiles y Egresados/as", "#2E8B57"],
  ["Secretaría de Extensión, Vinculación y Territorio", "#D76D37"],
  ["Secretaría General", "#7B0A22"],
  ["Secretaría Económica - Financiera", "#D0BC8E"],
  ["Dirección TIC", "#EFCE5B"],
  ["Personal de apoyo", "#023764"],
  ["Decanato", "#023764"]
]);
const organizerAliases = new Map([
  ["Secretaría de Extensión, Vinculación Y Territorio", "Secretaría de Extensión, Vinculación y Territorio"],
  ["Secretaría Económica-Financiera", "Secretaría Económica - Financiera"],
  ["Secretaría Administrativa", "Secretaría General"],
  ["Decanato (Azul)", "Decanato"]
]);
const platformAssets = [
  { test: /google\s*meet/i, src: "assets/platform-google-meet.png", label: "Google Meet" },
  { test: /(?:microsoft\s*)?teams/i, src: "assets/platform-microsoft-teams.png", label: "Microsoft Teams" },
  { test: /zoom/i, src: "assets/platform-zoom.png", label: "Zoom" },
  { test: /you\s*tube/i, src: "assets/platform-youtube.png", label: "YouTube" }
];
const academicSecretary = "Secretaría Académica";
const lawCareer = "Abogacía";
const buildingCareer = "Tecnicatura Universitaria en Administración de Edificios de Propiedad Horizontal y Conjuntos Inmobiliarios";
const lawSubjectsWithShifts = new Set([
  "Introducción a la Filosofía",
  "Problemática del Conocimiento",
  "Introducción al Derecho",
  "Derecho Romano",
  "Historia de las Instituciones Argentinas y Latinoamericanas",
  "Derecho Político",
  "Derecho Civil",
  "Inglés I",
  "Derecho Penal Parte General I",
  "Derecho Constitucional",
  "Principios de la Economía",
  "Derecho de las Obligaciones I",
  "Inglés II",
  "Práctica Profesional Supervisada I",
  "Derecho Penal Parte General II",
  "Finanzas Públicas y Derecho Tributario",
  "Derecho de las Obligaciones II",
  "Derecho del Consumidor y Defensa de la Competencia",
  "Inglés III",
  "Práctica Profesional Supervisada II"
]);
const academicPlans = {
  [lawCareer]: {
    "Primer año": ["Ingreso", "Introducción a la Filosofía", "Problemática del Conocimiento", "Introducción al Derecho", "Derecho Romano", "Historia de las Instituciones Argentinas y Latinoamericanas", "Derecho Político", "Derecho Civil", "Inglés I"],
    "Segundo año": ["Derecho Penal Parte General I", "Derecho Constitucional", "Principios de la Economía", "Derecho de las Obligaciones I", "Inglés II", "Práctica Profesional Supervisada I", "Derecho Penal Parte General II", "Finanzas Públicas y Derecho Tributario", "Derecho de las Obligaciones II", "Derecho del Consumidor y Defensa de la Competencia", "Inglés III", "Práctica Profesional Supervisada II"],
    "Tercer año": ["Derecho Penal Parte Especial I", "Derecho Comercial y Societario I", "Contratos Civiles y Comerciales I", "Sociología del Derecho", "Práctica Profesional Supervisada III", "Derecho Penal Parte Especial II", "Derecho Comercial y Societario II", "Contratos Civiles y Comerciales II", "Filosofía del Derecho", "Mediación I", "Práctica Profesional Supervisada IV"],
    "Cuarto año": ["Derechos Reales I", "Títulos Valores", "Derecho del Trabajo y la Seguridad Social", "Derecho Procesal Civil y Comercial. Parte General", "Mediación II", "Práctica Profesional Supervisada V", "Derechos Reales II", "Derecho Procesal Civil y Comercial. Parte Especial", "Derecho Concursal", "Derecho de las Familias", "Derechos Humanos", "Metodología de la Investigación I", "Práctica Profesional Supervisada VI"],
    "Quinto año": ["Derecho Sucesorio", "Derecho Administrativo I", "Derecho Procesal Penal I", "Derecho Internacional Público y de la Integración", "Mediación III", "Práctica Profesional Supervisada VII", "Derecho Administrativo II", "Derecho Procesal Penal II", "Derecho de los Recursos Naturales, Aguas; y Protección del Medio Ambiente", "Derecho Internacional Privado", "Metodología de la Investigación II", "Práctica Profesional Supervisada VIII"],
    "Optativas / otras": ["Derecho Público Provincial y Municipal", "Derecho de la Salud y Responsabilidad Médica", "Criminología", "Derecho del Transporte", "Derecho Electoral", "Derecho del Deporte", "Inteligencia Criminal y Crimen Organizado", "Derecho Aeronáutico", "Derecho Aduanero", "Derecho Procesal Constitucional", "Derecho Informático", "Análisis Económico del Derecho", "Derecho Bancario Bursátil y Seguros", "Propiedad Horizontal y Conjuntos Inmobiliarios", "Derecho Penal Económico", "Procedimientos y Procesos Administrativos Especiales", "Empresa Familiar", "Integración Regional", "Derecho de los Negocios Internacionales", "Derecho Notarial y Registral"]
  },
  [buildingCareer]: {
    "Primer año · 1° semestre": ["Ingreso", "Introducción a la Comunicación", "Ética Profesional", "Inglés I", "Manejo de Utilitarios PC", "Introducciones Contables I", "Fundamentos del Derecho I", "Higiene y Seguridad", "Práctica Profesional I"],
    "Primer año · 2° semestre": ["Problemática de la Comunicación", "Psicología Social", "Inglés II", "Introducciones Contables II", "Fundamentos del Derecho II", "Estructura Edilicia", "Práctica Profesional II"],
    "Segundo año · 1° semestre": ["Mediación, Negociación y Resolución de Conflictos", "Comercio vinculado a la Administración Edilicia", "Liquidación de Sueldos y Seguridad Social", "Obligaciones, Familia y Sucesiones", "Derechos Reales y Registral", "Propiedad Horizontal", "Comportamiento organizacional", "Práctica Profesional III"],
    "Segundo año · 2° semestre": ["Rendición de Cuentas y Régimen Impositivo", "Ordenamiento territorial, Ingeniería y Arquitectura", "Diseño y Proyectos Inmobiliarios", "Contratos", "Derecho Laboral", "Conjuntos Inmobiliarios", "Práctica Profesional IV"],
    "Proyecto Final": ["Proyecto Final"]
  }
};
const subjectBaseName = (subject) => String(subject || "").replace(/ · T[MT]$/, "");
function subjectsForPlan(career, year) {
  const subjects = academicPlans[career]?.[year] || [];
  return subjects.flatMap((subject) => lawSubjectsWithShifts.has(subject) ? [`${subject} · TM`, `${subject} · TT`] : [subject]);
}
function allSubjectsForCareer(career) { return Object.keys(academicPlans[career] || {}).flatMap((year) => subjectsForPlan(career, year)); }
function inferAcademicYear(career, subject) {
  const base = subjectBaseName(subject);
  return Object.entries(academicPlans[career] || {}).find(([, subjects]) => subjects.includes(base))?.[0] || "";
}

const state = { view: "day", cursor: new Date(), activities: [], allActivities: [], showAllImportant: false, user: null, canEdit: !configured };
const el = (id) => document.getElementById(id);
const agenda = el("agenda");
const status = el("status");
const activityDialog = el("activityDialog");
const importDialog = el("importDialog");
const detailDialog = el("detailDialog");

function localDate(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function startOfWeek(date) { const copy = localDate(date); const day = copy.getDay() || 7; copy.setDate(copy.getDate() - day + 1); return copy; }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function addDays(date, amount) { const copy = new Date(date); copy.setDate(copy.getDate() + amount); return copy; }
function addMonths(date, amount) { return new Date(date.getFullYear(), date.getMonth() + amount, 1); }
function toISODate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function fromISODate(value) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
function titleCase(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ""; }
function weekday(date, format = "long") { return titleCase(new Intl.DateTimeFormat(locale, { weekday: format }).format(date)); }
function formatDate(date, options) { return new Intl.DateTimeFormat(locale, options).format(date); }
function cleanTime(value) { return (value || "").slice(0, 5); }
function normalizeActivityName(value) { return String(value || "").trim().toLocaleLowerCase(locale); }
function isTransmission(item) { return ["transmission", "transmisión", "transmision"].includes(String(item?.activity_type || "").trim().toLocaleLowerCase(locale)); }
function isVirtual(item) { return String(item?.activity_type || "").trim().toLocaleLowerCase(locale) === "virtual"; }
function isPresential(item) { return ["presential", "presencial"].includes(String(item?.activity_type || "").trim().toLocaleLowerCase(locale)); }
function activityTypeLabel(item) { return isTransmission(item) ? "Transmisión" : isVirtual(item) ? "Virtual" : isPresential(item) ? "Presencial" : "Híbrida"; }
function activityTypeKey(item) { return isTransmission(item) ? "transmission" : isVirtual(item) ? "virtual" : isPresential(item) ? "presential" : "hybrid"; }
function matchesTypeFilter(item) {
  return { presential: el("filterPresential").checked, hybrid: el("filterHybrid").checked, virtual: el("filterVirtual").checked, transmission: el("filterTransmission").checked }[activityTypeKey(item)];
}
function normalizedSearch(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(locale).trim(); }
function matchesSearch(item) {
  const query = normalizedSearch(el("searchActivities").value); if (!query) return true;
  return normalizedSearch([item.name, item.secretary, item.responsible, item.classroom, item.platform, item.career, item.subject, activityStatusLabel(item), postponedDateLabel(item), item.requirements, item.observations].filter(Boolean).join(" ")).includes(query);
}
function academicTypeKey(item) {
  const stored = String(item?.academic_activity_type || "").trim().toLocaleLowerCase(locale);
  if (["class", "exam", "other"].includes(stored)) return stored;
  return organizerName(item?.secretary) === academicSecretary && item?.subject ? "class" : "";
}
function academicTypeLabel(item) {
  if (subjectBaseName(item?.subject) === "Ingreso") return "Ingreso";
  return { class: "Clase de grado", exam: "Examen final", other: "Otra actividad" }[academicTypeKey(item)] || "";
}
function activityDescriptor(item) { return academicTypeLabel(item) || "Actividad"; }
function isIngreso(item) { return subjectBaseName(item?.subject) === "Ingreso"; }
function activityStatusKey(item) {
  const stored = String(item?.activity_status || "scheduled").trim().toLocaleLowerCase(locale);
  return ["scheduled", "suspended", "postponed"].includes(stored) ? stored : "scheduled";
}
function activityStatusLabel(item) { return { scheduled: "Programada", suspended: "Suspendida", postponed: "Postergada" }[activityStatusKey(item)]; }
function isSuspended(item) { return activityStatusKey(item) === "suspended"; }
function isPostponed(item) { return activityStatusKey(item) === "postponed"; }
function postponedDateLabel(item) {
  if (!isPostponed(item)) return "";
  if (item?.postponed_date_tbd === true || !item?.postponed_date) return "Fecha a confirmar";
  return formatDate(fromISODate(item.postponed_date), { day: "numeric", month: "long", year: "numeric" });
}
function itemAcademicYear(item) { return item?.academic_year || inferAcademicYear(item?.career, item?.subject); }
function matchesAdvancedFilters(item) {
  const organizer = el("filterOrganizer").value; const academicType = el("filterAcademicType").value; const career = el("filterCareer").value; const year = el("filterYear").value;
  if (organizer && organizerName(item.secretary) !== organizer) return false;
  if (academicType && academicTypeKey(item) !== academicType) return false;
  if (career && item.career !== career) return false;
  if (year && itemAcademicYear(item) !== year) return false;
  return true;
}
function minutesFromTime(value) { const [hours, minutes] = cleanTime(value).split(":").map(Number); return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : -1; }
function isInProgress(item, now = new Date()) {
  if (isSuspended(item) || isPostponed(item)) return false;
  const today = toISODate(now); if (today < item.date || today > activityEndDate(item)) return false;
  const current = now.getHours() * 60 + now.getMinutes(); const start = minutesFromTime(item.start_time); const end = minutesFromTime(item.end_time);
  return start >= 0 && end >= 0 && current >= start && current < end;
}
function isImportantPeriod(item) { return String(item?.record_kind || "").trim().toLocaleLowerCase(locale) === "period"; }
function importantPeriodStatus(item) {
  const today = toISODate(new Date());
  if (today < item.date) return "Próximamente";
  if (today > activityEndDate(item)) return "Finalizada";
  const remaining = Math.round((fromISODate(activityEndDate(item)) - fromISODate(today)) / 86400000);
  return remaining <= 2 ? "Últimos días" : "Período abierto";
}
function isHoliday(date) { return holidays.has(toISODate(date)); }
function isAfterCalendarEnd(date) { return localDate(date) > calendarEnd; }
function sortActivities(a, b) { return `${a.date}${cleanTime(a.start_time)}${a.name}`.localeCompare(`${b.date}${cleanTime(b.start_time)}${b.name}`, locale); }
function activityEndDate(item) { return item.end_date || item.date; }
function overlapsPeriod(item, start, end) { return item.date <= toISODate(end) && activityEndDate(item) >= toISODate(start); }
function dateRangeLabel(item) {
  const start = fromISODate(item.date); const end = fromISODate(activityEndDate(item));
  if (item.date === activityEndDate(item)) return `${weekday(start)} ${formatDate(start, { day: "numeric", month: "long" })}`;
  return `${formatDate(start, { day: "numeric", month: "long" })} al ${formatDate(end, { day: "numeric", month: "long", year: "numeric" })}`;
}
function organizerName(value) { return organizerAliases.get(value) || value || ""; }
function organizerColor(value) { return organizerColors.get(organizerName(value)) || "#023764"; }
function platformAsset(value) { return platformAssets.find(({ test }) => test.test(String(value || ""))) || null; }
function createPlatformIcon(platform) {
  const asset = platformAsset(platform);
  if (!asset) return null;
  const icon = document.createElement("img"); icon.className = "platform-icon"; icon.src = asset.src; icon.alt = asset.label; icon.title = asset.label; icon.loading = "lazy";
  return icon;
}

function demoRecords() {
  const monday = startOfWeek(new Date());
  return [
    { id: "demo-1", date: toISODate(monday), end_date: toISODate(addDays(monday, 1)), start_time: "09:00", end_time: "11:00", name: "Jornada de actualización en Derecho Procesal", secretary: "Secretaría de Posgrado", responsible: "Mariana López", classroom: "Aula Magna", requirements: "Dos micrófonos, cámara fija y presentación. Realizar prueba técnica 30 minutos antes.", meeting_url: "https://meet.google.com/", link_is_public: false, platform: "Google Meet", account_used: "Cuenta institucional Posgrado", recording_required: true, observations: "" },
    { id: "demo-2", date: toISODate(addDays(monday, 1)), end_date: toISODate(addDays(monday, 1)), start_time: "16:00", end_time: "18:00", name: "Clase híbrida de Derecho Constitucional", secretary: "Secretaría Académica", career: lawCareer, subject: "Derecho Constitucional", responsible: "Lucas Fernández", classroom: "Aula H (Magnita)", requirements: "Notebook, proyector y audio bidireccional.", meeting_url: "https://zoom.us/", link_is_public: true, platform: "Zoom", account_used: "Licencia Zoom Facultad", recording_required: true, observations: "" },
    { id: "demo-3", date: toISODate(addDays(monday, 3)), end_date: toISODate(addDays(monday, 3)), start_time: "10:30", end_time: "12:00", name: "Sesión del Consejo Directivo", secretary: "Decanato", responsible: "Sofía Martínez", classroom: "Consejo Directivo", activity_type: "transmission", requirements: "Verificar audio y transmisión 30 minutos antes.", meeting_url: "https://www.youtube.com/", link_is_public: true, platform: "YouTube", account_used: "Canal institucional", recording_required: true, observations: "" },
    { id: "demo-4", record_kind: "period", date: toISODate(monday), end_date: toISODate(addDays(monday, 12)), start_time: "", end_time: "", name: "Inscripción a mesas de exámenes", secretary: "Secretaría Académica", responsible: "", classroom: "", requirements: "Consultá el cronograma y realizá la inscripción dentro del período indicado.", more_info_url: "https://www.uncuyo.edu.ar/", meeting_url: "", link_is_public: false, platform: "", account_used: "", recording_required: false, observations: "" }
  ].filter((item) => fromISODate(item.date) <= calendarEnd);
}

function loadDemoData() {
  const saved = localStorage.getItem(demoStorageKey);
  if (saved) { try { return JSON.parse(saved); } catch (_) { /* regenerar */ } }
  const examples = demoRecords();
  localStorage.setItem(demoStorageKey, JSON.stringify(examples));
  return examples;
}
function writeDemoData(records) { localStorage.setItem(demoStorageKey, JSON.stringify(records)); }

async function init() {
  el("demoBanner").hidden = configured;
  populateFormOptions();
  bindEvents();
  if (configured) {
    await setPersistence(auth, browserLocalPersistence).catch(() => {});
    onAuthStateChanged(auth, async (user) => {
      state.user = user;
      state.canEdit = Boolean(user?.email && user.email.toLowerCase() === adminEmail);
      updateAuthUI();
      await loadPeriod();
    });
  } else {
    updateAuthUI();
    setView("day");
  }
}

function bindEvents() {
  el("dayView").addEventListener("click", () => setView("day"));
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
  el("date").addEventListener("change", updateDateInputs);
  el("endDate").addEventListener("change", updateDateRangeInputs);
  el("recurrence").addEventListener("change", toggleRecurrenceFields);
  el("activityStatus").addEventListener("change", toggleActivityStatusFields);
  el("postponedDateTbd").addEventListener("change", toggleActivityStatusFields);
  el("secretary").addEventListener("change", () => { toggleOtherSecretary(); updateAcademicFields(); });
  el("academicType").addEventListener("change", () => updateAcademicFields());
  el("career").addEventListener("change", () => updateAcademicYearOptions());
  el("academicYear").addEventListener("change", () => updateSubjectOptions());
  el("classroom").addEventListener("change", toggleOtherClassroom);
  el("activityType").addEventListener("change", toggleActivityTypeFields);
  el("recordKind").addEventListener("change", toggleRecordKindFields);
  document.querySelectorAll("[data-type-filter]").forEach((input) => input.addEventListener("change", render));
  el("searchActivities").addEventListener("input", render);
  el("clearAdvancedFilters").addEventListener("click", clearAdvancedFilters);
  el("filterOrganizer").addEventListener("change", render);
  el("filterAcademicType").addEventListener("change", render);
  el("filterCareer").addEventListener("change", () => { updateFilterYears(); render(); });
  el("filterYear").addEventListener("change", render);
  el("icsFile").addEventListener("change", () => { el("icsFileName").textContent = el("icsFile").files[0]?.name || "Ningún archivo seleccionado"; });
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => el(button.dataset.close).close()));
  [importDialog, detailDialog].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  activityDialog.addEventListener("cancel", (event) => event.preventDefault());
  setInterval(() => { if (!document.hidden) render(); }, 60000);
}

function populateSelect(select, options, placeholder) {
  select.replaceChildren();
  const first = document.createElement("option"); first.value = ""; first.textContent = placeholder; select.append(first);
  options.forEach((value) => { const option = document.createElement("option"); option.value = value; option.textContent = value; select.append(option); });
}

function populateFormOptions() {
  populateSelect(el("secretary"), [...secretaryOptions, "__other__"], "Seleccionar área organizadora");
  el("secretary").querySelector('option[value="__other__"]').textContent = "Otro (especificar)";
  populateSelect(el("career"), Object.keys(academicPlans), "Seleccionar carrera");
  populateSelect(el("academicYear"), [], "Primero seleccioná una carrera");
  populateSelect(el("subject"), [], "Primero seleccioná un año");
  populateSelect(el("classroom"), [...classroomOptions, "__other__"], "Seleccionar aula o lugar");
  el("classroom").querySelector('option[value="__other__"]').textContent = "Otro (especificar)";
  populateSelect(el("filterOrganizer"), secretaryOptions, "Todas las áreas");
  populateSelect(el("filterCareer"), Object.keys(academicPlans), "Todas las carreras");
  updateFilterYears();
}

function updateAcademicFields(preferredSubject = "", preferredYear = "") {
  const academic = el("recordKind").value === "activity" && el("secretary").value === academicSecretary;
  const detailed = academic && ["class", "exam"].includes(el("academicType").value);
  el("academicTypeField").hidden = !academic; el("academicType").required = academic;
  el("careerField").hidden = !detailed; el("academicYearField").hidden = !detailed; el("subjectField").hidden = !detailed;
  el("career").required = detailed; el("academicYear").required = detailed; el("subject").required = detailed;
  el("activityType").disabled = academic && el("academicType").value === "exam";
  if (academic && el("academicType").value === "exam") el("activityType").value = "presential";
  if (!academic) { el("academicType").value = ""; }
  if (!detailed) { el("career").value = ""; populateSelect(el("academicYear"), [], "Primero seleccioná una carrera"); populateSelect(el("subject"), [], "Primero seleccioná un año"); toggleActivityTypeFields(); return; }
  updateAcademicYearOptions(preferredYear, preferredSubject);
  toggleActivityTypeFields();
}

function updateAcademicYearOptions(preferredYear = "", preferredSubject = "") {
  const years = Object.keys(academicPlans[el("career").value] || {});
  populateSelect(el("academicYear"), years, years.length ? "Seleccionar año" : "Primero seleccioná una carrera");
  const inferred = preferredYear || inferAcademicYear(el("career").value, preferredSubject);
  if (years.includes(inferred)) el("academicYear").value = inferred;
  updateSubjectOptions(preferredSubject);
}

function updateSubjectOptions(preferredSubject = "") {
  const subjects = subjectsForPlan(el("career").value, el("academicYear").value);
  populateSelect(el("subject"), subjects, subjects.length ? "Seleccionar" : "Primero seleccioná un año");
  if (subjects.includes(preferredSubject)) el("subject").value = preferredSubject;
}

function updateFilterYears() {
  const career = el("filterCareer").value;
  const years = career ? Object.keys(academicPlans[career] || {}) : [...new Set(Object.values(academicPlans).flatMap((plan) => Object.keys(plan)))];
  const selected = el("filterYear").value; populateSelect(el("filterYear"), years, "Todos los años");
  if (years.includes(selected)) el("filterYear").value = selected;
}

function clearAdvancedFilters() {
  el("filterOrganizer").value = ""; el("filterAcademicType").value = ""; el("filterCareer").value = ""; updateFilterYears(); el("filterYear").value = ""; render();
}

function toggleOtherClassroom() {
  const other = el("recordKind").value === "activity" && el("activityType").value !== "virtual" && el("classroom").value === "__other__";
  el("otherClassroomField").hidden = !other; el("otherClassroom").required = other;
  if (!other) el("otherClassroom").value = "";
}

function toggleActivityTypeFields() {
  const scheduled = el("recordKind").value === "activity"; const virtual = el("activityType").value === "virtual";
  el("classroomField").hidden = !scheduled || virtual;
  el("classroom").required = scheduled && !virtual;
  toggleOtherClassroom();
  if (el("activityType").value === "transmission" && !el("platform").value.trim()) el("platform").value = "YouTube";
}

function toggleRecordKindFields() {
  const scheduled = el("recordKind").value === "activity"; const editing = Boolean(el("activityId").value);
  document.querySelectorAll("[data-scheduled-only]").forEach((node) => { node.hidden = !scheduled; });
  el("startTime").required = scheduled; el("endTime").required = scheduled; el("activityType").required = scheduled; el("responsible").required = scheduled;
  el("recurrenceField").hidden = !scheduled || editing;
  el("recurrence").disabled = editing || !scheduled;
  if (!scheduled) { el("recurrence").value = "none"; el("updateSameName").checked = false; }
  el("bulkEditField").hidden = !scheduled || !editing;
  el("requirementsLabel").textContent = scheduled ? "Requerimientos / observaciones" : "Descripción / información importante";
  el("formTitle").textContent = editing ? (scheduled ? "Editar actividad" : "Editar fecha importante") : (scheduled ? "Nueva actividad" : "Nueva fecha importante");
  el("saveActivity").textContent = scheduled ? "Guardar actividad" : "Guardar fecha importante";
  toggleRecurrenceFields(); updateAcademicFields(el("subject").value); toggleActivityTypeFields(); toggleActivityStatusFields();
}

function toggleOtherSecretary() {
  const other = el("secretary").value === "__other__";
  el("otherSecretaryField").hidden = !other; el("otherSecretary").required = other;
  if (!other) el("otherSecretary").value = "";
}

function updateAuthUI() {
  if (!configured) {
    el("sessionLabel").hidden = false;
    el("sessionLabel").textContent = "Modo de prueba";
    el("authButton").textContent = "Volver a la agenda";
  } else if (state.user && state.canEdit) {
    el("sessionLabel").hidden = false;
    el("sessionLabel").textContent = state.user.email;
    el("authButton").textContent = "Salir";
  } else {
    el("sessionLabel").hidden = true;
    el("sessionLabel").textContent = "";
    el("authButton").textContent = "Administrar agenda";
  }
  document.querySelectorAll(".editor-only").forEach((node) => { node.hidden = !state.canEdit; });
}

async function handleAuthButton() {
  if (!configured) {
    const url = new URL(location.href);
    url.searchParams.delete("demo");
    location.href = url.toString();
    return;
  }
  if (state.user) { await signOut(auth); return; }
  const url = new URL(location.href);
  url.searchParams.set("demo", "1");
  location.href = url.toString();
}

function setView(view) {
  state.view = view;
  ["day", "week", "month"].forEach((name) => {
    const button = el(`${name}View`); const active = name === view;
    button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active));
  });
  el("viewEyebrow").textContent = { day: "Vista diaria", week: "Vista semanal", month: "Vista mensual" }[view];
  loadPeriod();
}

function moveAgendaDay(date, direction) {
  let candidate = addDays(date, direction);
  while (candidate.getDay() === 0) candidate = addDays(candidate, direction);
  return candidate;
}

function movePeriod(direction) {
  const candidate = state.view === "day" ? moveAgendaDay(state.cursor, direction) : state.view === "week" ? addDays(state.cursor, direction * 7) : addMonths(state.cursor, direction);
  const candidateStart = state.view === "day" ? localDate(candidate) : state.view === "week" ? startOfWeek(candidate) : startOfMonth(candidate);
  if (direction > 0 && candidateStart > calendarEnd) return;
  state.cursor = candidate; loadPeriod();
}

function periodRange() {
  if (state.view === "day") {
    const day = state.cursor.getDay() === 0 ? addDays(localDate(state.cursor), 1) : localDate(state.cursor);
    return { start: day, end: day, visibleStart: day, visibleEnd: day };
  }
  if (state.view === "week") {
    const start = startOfWeek(state.cursor); const naturalEnd = addDays(start, 5); const end = naturalEnd > calendarEnd ? calendarEnd : naturalEnd;
    return { start, end, visibleStart: start, visibleEnd: end };
  }
  const monthStart = startOfMonth(state.cursor); const gridStart = startOfWeek(monthStart);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const naturalGridEnd = addDays(startOfWeek(monthEnd), 5); const visibleEnd = monthEnd > calendarEnd ? calendarEnd : monthEnd;
  const gridEnd = naturalGridEnd > calendarEnd ? calendarEnd : naturalGridEnd;
  return { start: gridStart, end: gridEnd, visibleStart: monthStart, visibleEnd };
}

async function loadPeriod() {
  status.className = "status"; status.textContent = "Cargando agenda…"; agenda.replaceChildren();
  const { start, end } = periodRange();
  try {
    if (configured) {
      const snapshot = await getDocs(collection(db, activitiesCollection));
      let records = snapshot.docs.map((record) => ({ id: record.id, ...record.data() }));
      if (state.canEdit) {
        const privateSnapshot = await getDocs(collection(db, privateActivitiesCollection));
        const privateById = new Map(privateSnapshot.docs.map((record) => [record.id, record.data()]));
        records = records.map((record) => ({ ...record, ...(privateById.get(record.id) || {}) }));
      }
      state.allActivities = records.sort(sortActivities);
      state.activities = records.filter((item) => overlapsPeriod(item, start, end)).sort(sortActivities);
    } else {
      const records = loadDemoData().sort(sortActivities); state.allActivities = records;
      state.activities = records.filter((item) => overlapsPeriod(item, start, end)).sort(sortActivities);
    }
  } catch (error) {
    status.textContent = `No se pudo cargar la agenda. ${friendlyError(error)}`; return;
  }
  updatePeriodTitle(); updateNavigationState(); render();
}

function updateNavigationState() {
  const nextCandidate = state.view === "day" ? moveAgendaDay(state.cursor, 1) : state.view === "week" ? startOfWeek(addDays(state.cursor, 7)) : startOfMonth(addMonths(state.cursor, 1));
  el("nextPeriod").disabled = nextCandidate > calendarEnd;
}

function updatePeriodTitle() {
  if (state.view === "month") { el("periodTitle").textContent = titleCase(formatDate(state.cursor, { month: "long", year: "numeric" })); return; }
  if (state.view === "day") { const { start } = periodRange(); el("periodTitle").textContent = `${weekday(start)}, ${formatDate(start, { day: "numeric", month: "long", year: "numeric" })}`; return; }
  const { start, end } = periodRange(); const sameMonth = start.getMonth() === end.getMonth();
  const left = formatDate(start, sameMonth ? { day: "numeric" } : { day: "numeric", month: "long" });
  const right = formatDate(end, { day: "numeric", month: "long", year: "numeric" });
  el("periodTitle").textContent = `${left} – ${right}`;
}

function render() {
  renderImportantPeriods();
  agenda.replaceChildren(); if (state.view === "day") renderDay(); else if (state.view === "week") renderWeek(); else renderMonth();
  const { visibleStart, visibleEnd } = periodRange();
  const count = state.activities.filter((item) => !isImportantPeriod(item) && overlapsPeriod(item, visibleStart, visibleEnd) && matchesTypeFilter(item) && matchesSearch(item) && matchesAdvancedFilters(item)).length;
  status.className = "status activity-count";
  const countNumber = document.createElement("strong"); countNumber.className = "activity-count-number"; countNumber.textContent = String(count);
  const countText = document.createElement("span"); countText.className = "activity-count-text"; countText.textContent = count === 1 ? "actividad" : "actividades";
  status.replaceChildren(countNumber, countText);
}

function renderImportantPeriods() {
  const root = el("importantPeriods"); root.replaceChildren();
  const today = toISODate(new Date());
  const all = state.allActivities.filter((item) => isImportantPeriod(item) && matchesSearch(item) && matchesAdvancedFilters(item)).sort((a, b) => a.date.localeCompare(b.date));
  const current = all.filter((item) => activityEndDate(item) >= today);
  const past = all.filter((item) => activityEndDate(item) < today).sort((a, b) => b.date.localeCompare(a.date));
  const available = state.canEdit && state.showAllImportant ? [...current, ...past] : current.length ? current : state.canEdit ? past.slice(0, 3) : [];
  if (!available.length) { root.hidden = true; return; }
  root.hidden = false;
  const header = document.createElement("div"); header.className = "important-header";
  const heading = document.createElement("div"); const eyebrow = document.createElement("p"); eyebrow.className = "eyebrow"; eyebrow.textContent = "Información institucional";
  const title = document.createElement("h2"); title.textContent = "Fechas importantes"; heading.append(eyebrow, title); header.append(heading);
  const limit = state.showAllImportant ? available.length : 3; const visible = available.slice(0, limit);
  const canToggle = current.length > 3 || (state.canEdit && all.length > current.length);
  if (canToggle) {
    const toggle = document.createElement("button"); toggle.type = "button"; toggle.className = "button button-secondary important-toggle"; toggle.textContent = state.showAllImportant ? "Ver menos" : "Ver todas";
    toggle.addEventListener("click", () => { state.showAllImportant = !state.showAllImportant; renderImportantPeriods(); }); header.append(toggle);
  }
  const cards = document.createElement("div"); cards.className = "important-cards"; visible.forEach((item) => cards.append(createImportantPeriodCard(item)));
  root.append(header, cards);
}

function createImportantPeriodCard(item) {
  const card = document.createElement("details"); card.className = "important-card"; card.style.setProperty("--organizer-color", organizerColor(item.secretary));
  const summary = document.createElement("summary");
  const content = document.createElement("span"); content.className = "important-card-title";
  const title = document.createElement("strong"); title.textContent = item.name;
  const organizer = document.createElement("span"); organizer.textContent = organizerName(item.secretary); organizer.style.color = organizerColor(item.secretary); content.append(title, organizer);
  const meta = document.createElement("span"); meta.className = "important-card-meta";
  const dates = document.createElement("span"); dates.textContent = dateRangeLabel(item);
  const statusBadge = document.createElement("span"); statusBadge.className = "period-status"; statusBadge.textContent = importantPeriodStatus(item); meta.append(dates, statusBadge);
  const chevron = document.createElement("span"); chevron.className = "summary-chevron"; chevron.textContent = "⌄";
  summary.append(content, meta, chevron);
  const expanded = document.createElement("div"); expanded.className = "important-expanded"; expanded.append(createDetailsContent(item, true));
  card.append(summary, expanded); return card;
}

function isToday(date) { return toISODate(date) === toISODate(new Date()); }

function renderDay() {
  const { start } = periodRange();
  const section = document.createElement("section"); section.className = "day-section day-view-section";
  if (isToday(start)) section.classList.add("today-day");
  const list = document.createElement("div"); list.className = "day-list"; const items = activitiesForDate(start);
  if (!items.length) { const empty = document.createElement("p"); empty.className = "empty-day"; empty.textContent = "Sin actividades"; list.append(empty); }
  else items.forEach((item) => list.append(createActivityRow(item)));
  section.append(createDayHeading(start), list); agenda.append(section);
}

function renderWeek() {
  const start = startOfWeek(state.cursor);
  for (let index = 0; index < 6; index += 1) {
    const date = addDays(start, index); if (isAfterCalendarEnd(date)) break;
    const section = document.createElement("section"); section.className = "day-section"; if (isToday(date)) section.classList.add("today-day");
    const list = document.createElement("div"); list.className = "day-list"; const items = activitiesForDate(date);
    if (!items.length) { const empty = document.createElement("p"); empty.className = "empty-day"; empty.textContent = "Sin actividades"; list.append(empty); }
    else items.forEach((item) => list.append(createActivityRow(item)));
    section.append(createDayHeading(date), list); agenda.append(section);
  }
}

function createDayHeading(date) {
  const heading = document.createElement("div"); heading.className = "day-heading";
  const title = document.createElement("h3"); title.textContent = weekday(date);
  const dateText = document.createElement("p"); dateText.textContent = formatDate(date, { day: "numeric", month: "long" });
  heading.append(title, dateText);
  if (isToday(date)) { const badge = document.createElement("span"); badge.className = "today-badge"; badge.textContent = "Hoy"; heading.append(badge); }
  if (isHoliday(date)) { const badge = document.createElement("span"); badge.className = "holiday-badge"; badge.textContent = "Feriado"; heading.append(badge); }
  return heading;
}

function createActivityRow(item) {
  const details = document.createElement("details"); details.className = "activity-row";
  details.style.setProperty("--organizer-color", organizerColor(item.secretary));
  if (isTransmission(item)) details.classList.add("transmission");
  if (isSuspended(item)) details.classList.add("is-suspended");
  if (isPostponed(item)) details.classList.add("is-postponed");
  const summary = document.createElement("summary"); summary.className = "activity-summary";
  const time = document.createElement("span"); time.className = "summary-time"; time.textContent = `${cleanTime(item.start_time)}–${cleanTime(item.end_time)}`;
  if (state.canEdit && item.recording_required) { const dot = document.createElement("i"); dot.className = "recording-dot"; dot.title = "Requiere grabación"; time.append(dot); }
  const title = document.createElement("span"); title.className = "summary-title";
  const activityName = document.createElement("strong"); activityName.className = "summary-activity-name"; activityName.textContent = item.name;
  title.append(activityName);
  if (item.secretary) {
    const organizer = document.createElement("span"); organizer.className = "summary-organizer"; organizer.textContent = organizerName(item.secretary); organizer.style.color = organizerColor(item.secretary);
    title.append(organizer);
  }
  const meta = document.createElement("span"); meta.className = "summary-meta";
  const labels = document.createElement("span"); labels.className = "summary-labels";
  const type = document.createElement("span"); type.className = "summary-type"; type.textContent = activityTypeLabel(item); labels.append(type);
  if (academicTypeLabel(item)) { const academicBadge = document.createElement("span"); academicBadge.className = "academic-type-badge"; academicBadge.textContent = academicTypeLabel(item); labels.append(academicBadge); }
  if (isSuspended(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "activity-status-badge suspended"; stateBadge.textContent = "Suspendida"; labels.append(stateBadge); }
  if (isPostponed(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "activity-status-badge postponed"; stateBadge.textContent = `Postergada · ${postponedDateLabel(item)}`; labels.append(stateBadge); }
  if (isInProgress(item)) { const live = document.createElement("span"); live.className = "in-progress-badge"; live.textContent = "▶ En curso"; labels.append(live); }
  const placePlatform = document.createElement("span"); placePlatform.className = "summary-place-platform";
  if (!isVirtual(item)) { const room = document.createElement("span"); room.className = "summary-room"; room.textContent = item.classroom || "Lugar a confirmar"; placePlatform.append(room); }
  if (!isPresential(item)) { const platformIcon = createPlatformIcon(item.platform); if (platformIcon) placePlatform.append(platformIcon); }
  meta.append(labels, placePlatform);
  const chevron = document.createElement("span"); chevron.className = "summary-chevron"; chevron.textContent = "⌄";
  summary.append(time, title, meta, chevron);
  const expanded = document.createElement("div"); expanded.className = "activity-expanded"; expanded.append(createDetailsContent(item, true));
  details.append(summary, expanded); return details;
}

function createDetailsContent(item, includeEditorActions) {
  const wrapper = document.createElement("div"); const details = document.createElement("div"); details.className = "activity-details";
  const combinedNotes = [item.requirements, item.observations].filter(Boolean).join(" · ");
  const fields = [["Fecha/as", dateRangeLabel(item)], ["Organiza", organizerName(item.secretary)]];
  if (!isImportantPeriod(item)) {
    fields.push(["Tipo de actividad", activityDescriptor(item)]);
    if (item.career) fields.push(["Carrera", item.career]);
    if (itemAcademicYear(item)) fields.push(["Año", itemAcademicYear(item)]);
    if (item.subject && !isIngreso(item)) fields.push(["Materia", item.subject]);
    if (isSuspended(item)) fields.push(["Estado", "Suspendida"]);
    if (isPostponed(item)) fields.push(["Estado", "Postergada"], ["Nueva fecha", postponedDateLabel(item)]);
    if (state.canEdit) fields.push(["Responsable / contacto", item.responsible]);
    if (!isVirtual(item)) fields.push(["Aula/Lugar", item.classroom]);
    if (isInProgress(item)) fields.push(["Estado", "▶ En curso"]);
    fields.push(["Modalidad", activityTypeLabel(item)]);
    if (!isPresential(item)) fields.push(["Plataforma", item.platform]);
    if (state.canEdit) fields.push(["Cuenta", item.account_used], ["Grabación", item.recording_required ? "Sí" : "No"]);
  }
  if (state.canEdit) fields.push([isImportantPeriod(item) ? "Descripción / información importante" : "Requerimientos / observaciones", combinedNotes || "Sin indicaciones"]);
  fields.forEach(([label, value]) => {
    const block = document.createElement("div"); block.className = "detail-item";
    const labelNode = document.createElement("span"); labelNode.className = "detail-label"; labelNode.textContent = label;
    const valueNode = document.createElement("span"); valueNode.className = "detail-value";
    if (label === "Organiza") { valueNode.classList.add("organizer-value"); valueNode.style.color = organizerColor(item.secretary); }
    if (label === "Modalidad") valueNode.classList.add("activity-type-value");
    if (label === "Tipo de actividad") valueNode.classList.add("activity-type-value");
    if (label === "Nueva fecha") valueNode.classList.add("activity-status-value");
    if (label === "Estado") valueNode.classList.add("activity-type-value");
    if (label === "Plataforma") { const icon = createPlatformIcon(item.platform); if (icon) valueNode.append(icon); }
    if (label === "Grabación" && item.recording_required) { const dot = document.createElement("i"); dot.className = "recording-dot detail-recording-dot"; dot.title = "Requiere grabación"; valueNode.append(dot); }
    valueNode.append(document.createTextNode(value || "—"));
    block.append(labelNode, valueNode); details.append(block);
  });
  wrapper.append(details);
  const publicLink = item.link_is_public === true;
  const canOpenLink = isSafeUrl(item.meeting_url) && (state.canEdit || publicLink);
  if (!isImportantPeriod(item) && !isPresential(item) && canOpenLink) {
    const meeting = document.createElement("section"); meeting.className = "meeting-section";
    const heading = document.createElement("h3"); heading.textContent = isTransmission(item) ? "Ver transmisión" : "Unirse a la reunión"; meeting.append(heading);
    if (!publicLink) { const notice = document.createElement("p"); notice.className = "private-link"; notice.textContent = "Link privado · visible solo para edición"; meeting.append(notice); }
    const actions = document.createElement("div"); actions.className = "link-actions";
    const open = document.createElement("a"); open.className = "link-button primary"; open.href = item.meeting_url; open.target = "_blank"; open.rel = "noopener noreferrer"; open.textContent = isTransmission(item) ? "Abrir transmisión ↗" : "Abrir reunión ↗";
    const copy = document.createElement("button"); copy.className = "link-button"; copy.type = "button"; copy.textContent = "Copiar enlace"; copy.addEventListener("click", () => copyLink(item.meeting_url));
    actions.append(open, copy); meeting.append(actions); wrapper.append(meeting);
  } else if (!isImportantPeriod(item) && !isPresential(item) && !publicLink) {
    const meeting = document.createElement("section"); meeting.className = "meeting-section";
    const heading = document.createElement("h3"); heading.textContent = "Enlace de acceso";
    const notice = document.createElement("p"); notice.className = "private-link"; notice.textContent = "Link privado";
    meeting.append(heading, notice); wrapper.append(meeting);
  }
  if (isSafeUrl(item.more_info_url)) {
    const information = document.createElement("section"); information.className = "meeting-section information-section";
    const heading = document.createElement("h3"); heading.textContent = "Más información";
    const actions = document.createElement("div"); actions.className = "link-actions";
    const open = document.createElement("a"); open.className = "link-button"; open.href = item.more_info_url; open.target = "_blank"; open.rel = "noopener noreferrer"; open.textContent = "Abrir información ↗";
    actions.append(open); information.append(heading, actions); wrapper.append(information);
  }
  if (includeEditorActions && state.canEdit) {
    const actions = document.createElement("div"); actions.className = "card-actions editor-only";
    actions.append(actionButton("Editar", () => openActivityForm(item)), actionButton("Duplicar", () => duplicateActivity(item)), actionButton("Eliminar", () => deleteActivity(item), "danger"));
    wrapper.append(actions);
  }
  return wrapper;
}

function actionButton(label, handler, className = "") { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.className = className; button.addEventListener("click", handler); return button; }
function activitiesForDate(date) {
  const key = toISODate(date);
  return state.activities.filter((item) => !isImportantPeriod(item) && item.date <= key && activityEndDate(item) >= key && matchesTypeFilter(item) && matchesSearch(item) && matchesAdvancedFilters(item)).sort(sortActivities);
}

function renderMonth() {
  const { start, end, visibleStart, visibleEnd } = periodRange();
  const calendar = document.createElement("div"); calendar.className = "month-calendar";
  const weekdays = document.createElement("div"); weekdays.className = "month-weekdays";
  ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].forEach((name) => { const node = document.createElement("div"); node.textContent = name; weekdays.append(node); });
  const grid = document.createElement("div"); grid.className = "month-grid"; const todayKey = toISODate(new Date());
  for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
    if (date.getDay() === 0 || isAfterCalendarEnd(date)) continue;
    const cell = document.createElement("div"); cell.className = "month-day";
    if (date < visibleStart || date > visibleEnd) cell.classList.add("other-month");
    if (toISODate(date) === todayKey) cell.classList.add("today"); if (isHoliday(date)) cell.classList.add("holiday");
    const number = document.createElement("span"); number.className = "month-number"; number.textContent = date.getDate(); cell.append(number);
    if (isHoliday(date)) { const badge = document.createElement("span"); badge.className = "month-holiday"; badge.textContent = "Feriado"; cell.append(badge); }
    activitiesForDate(date).forEach((item) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "month-event";
      button.style.borderLeftColor = organizerColor(item.secretary);
      if (isTransmission(item)) button.classList.add("transmission");
      const activityType = activityTypeKey(item);
      const badge = document.createElement("span"); badge.className = `month-${activityType}`; badge.textContent = activityTypeLabel(item); button.append(badge);
      if (isSuspended(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "month-status suspended"; stateBadge.textContent = "Suspendida"; button.append(stateBadge); }
      if (isPostponed(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "month-status postponed"; stateBadge.textContent = `Postergada · ${postponedDateLabel(item)}`; button.append(stateBadge); }
      if (isInProgress(item)) { const live = document.createElement("span"); live.className = "month-in-progress"; live.textContent = "▶ En curso"; button.append(live); }
      const time = document.createElement("strong"); time.textContent = cleanTime(item.start_time); button.append(time, document.createTextNode(item.name));
      button.addEventListener("click", () => openDetail(item)); cell.append(button);
    });
    grid.append(cell);
  }
  calendar.append(weekdays, grid);
  const mobileList = document.createElement("div"); mobileList.className = "mobile-month-list";
  const holidayDates = [...holidays].filter((date) => date >= toISODate(visibleStart) && date <= toISODate(visibleEnd));
  const datesWithActivities = [];
  for (let date = new Date(visibleStart); date <= visibleEnd; date = addDays(date, 1)) {
    if (date.getDay() !== 0 && activitiesForDate(date).length) datesWithActivities.push(toISODate(date));
  }
  const currentDate = toISODate(new Date()); const includeToday = currentDate >= toISODate(visibleStart) && currentDate <= toISODate(visibleEnd) && fromISODate(currentDate).getDay() !== 0;
  const dates = [...new Set([...datesWithActivities, ...holidayDates, ...(includeToday ? [currentDate] : [])])].sort();
  if (!dates.length) { const empty = document.createElement("p"); empty.className = "empty-day"; empty.textContent = "Sin actividades este mes"; mobileList.append(empty); }
  else dates.forEach((dateValue) => {
    const date = fromISODate(dateValue); const section = document.createElement("section"); section.className = "day-section"; if (isToday(date)) section.classList.add("today-day");
    const list = document.createElement("div"); list.className = "day-list"; const items = activitiesForDate(date); items.forEach((item) => list.append(createActivityRow(item)));
    if (!items.length) { const empty = document.createElement("p"); empty.className = isHoliday(date) ? "holiday-empty" : "empty-day"; empty.textContent = "Sin actividades"; list.append(empty); }
    section.append(createDayHeading(date), list); mobileList.append(section);
  });
  agenda.append(calendar, mobileList);
}

function openDetail(item) {
  const stateText = isSuspended(item) ? " · Suspendida" : isPostponed(item) ? ` · Postergada · ${postponedDateLabel(item)}` : "";
  el("detailDate").textContent = `${dateRangeLabel(item)} · ${cleanTime(item.start_time)}–${cleanTime(item.end_time)}${stateText}`;
  el("detailTitle").textContent = item.name; el("detailBody").replaceChildren(createDetailsContent(item, true)); detailDialog.showModal();
}

async function copyLink(url) {
  try { await navigator.clipboard.writeText(url); }
  catch (_) { const input = document.createElement("textarea"); input.value = url; input.style.position = "fixed"; input.style.opacity = "0"; document.body.append(input); input.select(); document.execCommand("copy"); input.remove(); }
  showToast("Enlace copiado");
}
function showToast(message) { const toast = el("toast"); toast.textContent = message; toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 2200); }
function isSafeUrl(value) { if (!value) return false; try { return ["https:", "http:"].includes(new URL(value).protocol); } catch (_) { return false; } }

function openActivityForm(item = null) {
  if (!state.canEdit) return; if (detailDialog.open) detailDialog.close();
  const editing = Boolean(item?.id);
  el("activityForm").reset(); el("formError").hidden = true; el("activityId").value = item?.id || ""; el("originalActivityName").value = item?.name || "";
  el("recordKind").value = isImportantPeriod(item) ? "period" : "activity";
  el("originalActivityDate").value = item?.date || "";
  el("bulkEditField").hidden = !item?.id || isImportantPeriod(item); el("updateSameName").checked = false;
  const { start, end } = periodRange(); const today = localDate(new Date()); const defaultDate = today >= start && today <= end ? today : start;
  el("date").value = item?.date || toISODate(defaultDate); el("endDate").value = item?.end_date || item?.date || toISODate(defaultDate);
  el("startTime").value = cleanTime(item?.start_time) || "09:00"; el("endTime").value = cleanTime(item?.end_time) || "10:00";
  el("recurrence").value = "none"; el("recurrence").disabled = Boolean(item?.id); el("recurrenceField").hidden = Boolean(item?.id);
  el("repeatUntil").value = toISODate(calendarEnd);
  el("activityStatus").value = item ? activityStatusKey(item) : "scheduled";
  el("postponedDate").value = item?.postponed_date || "";
  el("postponedDateTbd").checked = item?.postponed_date_tbd === true;
  const storedOrganizer = organizerName(item?.secretary);
  el("name").value = item?.name || "";
  if (secretaryOptions.includes(storedOrganizer)) { el("secretary").value = storedOrganizer; el("otherSecretary").value = ""; }
  else if (storedOrganizer) { el("secretary").value = "__other__"; el("otherSecretary").value = storedOrganizer; }
  else { el("secretary").value = ""; el("otherSecretary").value = ""; }
  toggleOtherSecretary(); el("responsible").value = item?.responsible || "";
  el("activityType").value = item ? (isTransmission(item) ? "transmission" : isVirtual(item) ? "virtual" : isPresential(item) ? "presential" : "hybrid") : "presential";
  el("academicType").value = item?.academic_activity_type || (storedOrganizer === academicSecretary && item?.subject ? "class" : storedOrganizer === academicSecretary ? "other" : "");
  const inferredCareer = item?.career || Object.keys(academicPlans).find((career) => allSubjectsForCareer(career).some((subject) => subjectBaseName(subject) === subjectBaseName(item?.subject))) || "";
  el("career").value = inferredCareer; updateAcademicFields(item?.subject || "", item?.academic_year || inferAcademicYear(inferredCareer, item?.subject));
  const storedClassroom = item?.classroom === "Aula H" ? "Aula H (Magnita)" : item?.classroom || "";
  if (classroomOptions.includes(storedClassroom)) { el("classroom").value = storedClassroom; el("otherClassroom").value = ""; }
  else if (storedClassroom) { el("classroom").value = "__other__"; el("otherClassroom").value = storedClassroom; }
  else { el("classroom").value = ""; el("otherClassroom").value = ""; }
  toggleActivityTypeFields();
  el("platform").value = item?.platform || ""; el("accountUsed").value = item?.account_used || ""; el("meetingUrl").value = item?.meeting_url || ""; el("publicLink").checked = item?.link_is_public === true; el("moreInfoUrl").value = item?.more_info_url || "";
  el("requirements").value = [item?.requirements, item?.observations].filter(Boolean).join(" · "); el("recordingRequired").checked = Boolean(item?.recording_required);
  updateDateInputs(); toggleRecordKindFields(); activityDialog.showModal();
}

function updateDateInputs() {
  if (!el("endDate").value || el("endDate").value < el("date").value) el("endDate").value = el("date").value;
  el("endDate").min = el("date").value;
  if (el("recurrence").value !== "none" && el("repeatUntil").value < el("date").value) el("repeatUntil").value = el("date").value;
  el("repeatUntil").min = el("date").value;
  el("postponedDate").min = el("date").value;
}
function updateDateRangeInputs() {
  if (el("endDate").value < el("date").value) el("endDate").value = el("date").value;
}
function toggleRecurrenceFields() { const repeats = el("recordKind").value === "activity" && el("recurrence").value !== "none"; el("repeatUntilField").hidden = !repeats; el("repeatUntil").required = repeats; }
function toggleActivityStatusFields() {
  const scheduled = el("recordKind").value === "activity";
  const postponed = scheduled && el("activityStatus").value === "postponed";
  const toBeConfirmed = postponed && el("postponedDateTbd").checked;
  el("activityStatusField").hidden = !scheduled;
  el("postponedDateField").hidden = !postponed;
  el("postponedTbdField").hidden = !postponed;
  el("postponedDate").disabled = !postponed || toBeConfirmed;
  el("postponedDate").required = postponed && !toBeConfirmed;
  el("postponedDate").min = el("date").value || "";
  if (!postponed) { el("postponedDate").value = ""; el("postponedDateTbd").checked = false; }
  if (toBeConfirmed) el("postponedDate").value = "";
}

function activityPayload() {
  const academic = el("secretary").value === academicSecretary; const detailedAcademic = academic && ["class", "exam"].includes(el("academicType").value);
  const secretary = el("secretary").value === "__other__" ? el("otherSecretary").value.trim() : el("secretary").value;
  const recordKind = el("recordKind").value;
  if (recordKind === "period") {
    return { record_kind: "period", date: el("date").value, end_date: el("endDate").value, start_time: "", end_time: "", name: el("name").value.trim(), secretary, academic_activity_type: "", career: "", academic_year: "", subject: "", responsible: "", classroom: "", activity_type: "", activity_status: "scheduled", postponed_date: "", postponed_date_tbd: false, platform: "", account_used: "", meeting_url: "", link_is_public: false, more_info_url: el("moreInfoUrl").value.trim(), requirements: el("requirements").value.trim(), observations: "", recording_required: false };
  }
  const classroom = el("activityType").value === "virtual" ? "" : el("classroom").value === "__other__" ? el("otherClassroom").value.trim() : el("classroom").value;
  const activityStatus = el("activityStatus").value || "scheduled";
  const postponedDateTbd = activityStatus === "postponed" && el("postponedDateTbd").checked;
  return { record_kind: "activity", date: el("date").value, end_date: el("endDate").value, start_time: el("startTime").value, end_time: el("endTime").value, name: el("name").value.trim(), secretary, academic_activity_type: academic ? el("academicType").value : "", career: detailedAcademic ? el("career").value : "", academic_year: detailedAcademic ? el("academicYear").value : "", subject: detailedAcademic ? el("subject").value : "", responsible: el("responsible").value.trim(), classroom, activity_type: el("academicType").value === "exam" ? "presential" : el("activityType").value, activity_status: activityStatus, postponed_date: activityStatus === "postponed" && !postponedDateTbd ? el("postponedDate").value : "", postponed_date_tbd: postponedDateTbd, platform: el("platform").value.trim(), account_used: el("accountUsed").value.trim(), meeting_url: el("meetingUrl").value.trim(), link_is_public: el("publicLink").checked, more_info_url: el("moreInfoUrl").value.trim(), requirements: el("requirements").value.trim(), observations: "", recording_required: el("recordingRequired").checked };
}

function validateActivity(payload) {
  if (fromISODate(payload.date) > calendarEnd) return "La agenda finaliza el 28 de diciembre de 2026.";
  if (fromISODate(payload.end_date) > calendarEnd) return "La actividad no puede finalizar después del 28 de diciembre de 2026.";
  if (fromISODate(payload.end_date) < fromISODate(payload.date)) return "La fecha de finalización no puede ser anterior a la fecha de inicio.";
  if (!payload.secretary) return "Seleccioná quién organiza o completá el campo Otro organizador.";
  if (payload.more_info_url && !isSafeUrl(payload.more_info_url)) return "El enlace de más información debe comenzar con http:// o https://.";
  if (isImportantPeriod(payload)) return "";
  if (fromISODate(payload.date).getDay() === 0) return "Los domingos no forman parte de esta agenda.";
  if (payload.activity_type !== "virtual" && !payload.classroom) return "Seleccioná un aula o completá el campo Otro lugar.";
  if (payload.secretary === academicSecretary && !payload.academic_activity_type) return "Seleccioná el tipo de actividad.";
  if (["class", "exam"].includes(payload.academic_activity_type) && (!payload.career || !payload.academic_year || !payload.subject)) return "Seleccioná la carrera, el año y la materia.";
  if (payload.end_time <= payload.start_time) return "La hora de finalización debe ser posterior a la de inicio.";
  if (payload.meeting_url && !isSafeUrl(payload.meeting_url)) return "El enlace debe comenzar con http:// o https://.";
  if (payload.link_is_public && !payload.meeting_url) return "Para publicar el enlace, primero completá el enlace de la actividad.";
  if (payload.activity_status === "postponed" && !payload.postponed_date_tbd && !payload.postponed_date) return "Indicá la nueva fecha o marcá Fecha a confirmar.";
  if (payload.activity_status === "postponed" && payload.postponed_date && fromISODate(payload.postponed_date) <= fromISODate(payload.date)) return "La nueva fecha de una actividad postergada debe ser posterior a la fecha original.";
  if (payload.postponed_date && fromISODate(payload.postponed_date) > calendarEnd) return "La nueva fecha no puede ser posterior al 28 de diciembre de 2026.";
  if (el("recurrence").value !== "none" && fromISODate(el("repeatUntil").value) < fromISODate(payload.date)) return "La fecha final de repetición no puede ser anterior a la actividad.";
  return "";
}

function recurrenceRecords(payload) {
  if (isImportantPeriod(payload)) return [payload];
  const recurrence = el("recurrence").value; if (recurrence === "none") return [payload];
  const step = recurrence === "weekly" ? 7 : 14; const until = fromISODate(el("repeatUntil").value); const seriesId = crypto.randomUUID(); const records = [];
  const durationDays = Math.round((fromISODate(payload.end_date) - fromISODate(payload.date)) / 86400000);
  for (let date = fromISODate(payload.date); date <= until && date <= calendarEnd; date = addDays(date, step)) {
    const occurrenceEnd = addDays(date, durationDays);
    records.push({ ...payload, date: toISODate(date), end_date: toISODate(occurrenceEnd > calendarEnd ? calendarEnd : occurrenceEnd), series_id: seriesId });
  }
  return records;
}

async function saveActivity(event) {
  event.preventDefault(); if (!state.canEdit) return;
  const payload = activityPayload(); const id = el("activityId").value; const errorBox = el("formError"); const validationError = validateActivity(payload);
  if (validationError) { errorBox.textContent = validationError; errorBox.hidden = false; return; }
  const button = el("saveActivity"); button.disabled = true; button.textContent = "Guardando…";
  try {
    let successMessage = isImportantPeriod(payload) ? (id ? "Fecha importante actualizada" : "Fecha importante guardada") : (id ? "Actividad actualizada" : "Actividad guardada");
    if (configured) {
      if (id && el("updateSameName").checked) {
        const updated = await updateActivitiesWithSameName(id, el("originalActivityName").value, el("originalActivityDate").value, payload);
        successMessage = `${updated} ${updated === 1 ? "actividad actualizada" : "actividades actualizadas"}`;
      } else if (id) await writeActivityUpdate(id, payload);
      else await writeNewActivities(recurrenceRecords(payload));
    } else {
      const records = loadDemoData(); const index = records.findIndex((item) => item.id === id);
      if (index >= 0 && el("updateSameName").checked) {
        const originalName = normalizeActivityName(el("originalActivityName").value); const originalDay = fromISODate(el("originalActivityDate").value || payload.date).getDay(); const { date, end_date, ...sharedPayload } = payload; let updated = 0;
        records.forEach((record, recordIndex) => {
          if (normalizeActivityName(record.name) !== originalName || fromISODate(record.date).getDay() !== originalDay) return;
          records[recordIndex] = record.id === id ? { ...record, ...payload } : { ...record, ...sharedPayload }; updated += 1;
        });
        successMessage = `${updated} ${updated === 1 ? "actividad actualizada" : "actividades actualizadas"}`;
      } else if (index >= 0) records[index] = { ...records[index], ...payload };
      else recurrenceRecords(payload).forEach((record) => records.push({ ...record, id: crypto.randomUUID() }));
      writeDemoData(records);
    }
    activityDialog.close(); state.cursor = fromISODate(payload.date); await loadPeriod(); showToast(successMessage);
  } catch (error) { errorBox.textContent = `No se pudo guardar. ${friendlyError(error)}`; errorBox.hidden = false; }
  finally { button.disabled = false; button.textContent = el("recordKind").value === "period" ? "Guardar fecha importante" : "Guardar actividad"; }
}

function publicActivityData(payload) {
  const { account_used, recording_required, meeting_url, responsible, requirements, observations, ...publicData } = payload;
  return { ...publicData, link_is_public: payload.link_is_public === true, meeting_url: payload.link_is_public === true ? meeting_url : "" };
}

function publicActivityUpdate(payload) {
  return { ...publicActivityData(payload), account_used: deleteField(), recording_required: deleteField(), responsible: deleteField(), requirements: deleteField(), observations: deleteField() };
}

function privateActivityData(payload) {
  return { account_used: payload.account_used || "", recording_required: payload.recording_required === true, meeting_url: payload.meeting_url || "", responsible: payload.responsible || "", requirements: payload.requirements || "", observations: payload.observations || "", updated_at: serverTimestamp() };
}

async function writeActivityUpdate(id, payload) {
  const batch = writeBatch(db);
  batch.update(doc(db, activitiesCollection, id), { ...publicActivityUpdate(payload), updated_at: serverTimestamp() });
  batch.set(doc(db, privateActivitiesCollection, id), privateActivityData(payload), { merge: true });
  await batch.commit();
}

async function updateActivitiesWithSameName(currentId, originalName, originalDate, payload) {
  const normalizedName = normalizeActivityName(originalName); const originalDay = fromISODate(originalDate || payload.date).getDay(); const snapshot = await getDocs(collection(db, activitiesCollection));
  const matching = snapshot.docs.filter((record) => normalizeActivityName(record.data().name) === normalizedName && fromISODate(record.data().date).getDay() === originalDay);
  const targets = matching.some((record) => record.id === currentId) ? matching : [...matching, { id: currentId, ref: doc(db, activitiesCollection, currentId) }];
  const { date, end_date, ...sharedPayload } = payload;
  for (let start = 0; start < targets.length; start += 225) {
    const batch = writeBatch(db);
    targets.slice(start, start + 225).forEach((record) => {
      const changes = record.id === currentId ? payload : sharedPayload;
      batch.update(record.ref, { ...publicActivityUpdate(changes), updated_at: serverTimestamp() });
      batch.set(doc(db, privateActivitiesCollection, record.id), privateActivityData(changes), { merge: true });
    });
    await batch.commit();
  }
  return targets.length;
}

async function writeNewActivities(records) {
  for (let start = 0; start < records.length; start += 225) {
    const batch = writeBatch(db);
    records.slice(start, start + 225).forEach((record) => {
      const reference = doc(collection(db, activitiesCollection));
      batch.set(reference, { ...publicActivityData(record), created_at: serverTimestamp(), updated_at: serverTimestamp() });
      batch.set(doc(db, privateActivitiesCollection, reference.id), { ...privateActivityData(record), created_at: serverTimestamp() });
    });
    await batch.commit();
  }
}

function duplicateActivity(item) {
  openActivityForm({ ...item, id: null, date: toISODate(addDays(fromISODate(item.date), 7)), end_date: toISODate(addDays(fromISODate(activityEndDate(item)), 7)), activity_status: "scheduled", postponed_date: "", postponed_date_tbd: false });
}
async function deleteActivity(item) {
  if (!state.canEdit || !confirm(`¿Eliminar “${item.name}”?`)) return;
  try {
    if (configured) {
      const batch = writeBatch(db);
      batch.delete(doc(db, activitiesCollection, item.id));
      batch.delete(doc(db, privateActivitiesCollection, item.id));
      await batch.commit();
    } else writeDemoData(loadDemoData().filter((record) => record.id !== item.id));
    if (detailDialog.open) detailDialog.close(); await loadPeriod(); showToast("Actividad eliminada");
  } catch (error) { alert(`No se pudo eliminar. ${friendlyError(error)}`); }
}

function openImportForm() { if (!state.canEdit) return; el("importForm").reset(); el("icsFileName").textContent = "Ningún archivo seleccionado"; el("importMessage").hidden = true; importDialog.showModal(); }

async function importCalendarFile(event) {
  event.preventDefault(); if (!state.canEdit) return;
  const file = el("icsFile").files[0]; const message = el("importMessage");
  if (!file) { message.textContent = "Seleccioná un archivo .ics."; message.hidden = false; return; }
  const button = el("runImport"); button.disabled = true; button.textContent = "Importando…";
  try {
    const defaults = { secretary: el("importSecretary").value.trim(), responsible: el("importResponsible").value.trim(), platform: el("importPlatform").value.trim(), account_used: el("importAccount").value.trim(), requirements: el("importRequirements").value.trim(), recording_required: el("importRecording").checked, link_is_public: false };
    const parsed = parseICS(await file.text(), defaults)
      .filter((item) => fromISODate(item.date) <= calendarEnd && fromISODate(item.date).getDay() !== 0)
      .map((item) => ({ ...item, end_date: activityEndDate(item) > toISODate(calendarEnd) ? toISODate(calendarEnd) : activityEndDate(item) }));
    if (!parsed.length) throw new Error("No se encontraron eventos con fecha y horario en el archivo.");
    let newEvents = parsed;
    if (configured) {
      const existing = await getDocs(collection(db, activitiesCollection)); const known = new Set(existing.docs.map((record) => record.data().source_uid).filter(Boolean));
      newEvents = parsed.filter((item) => !known.has(item.source_uid)); if (newEvents.length) await writeNewActivities(newEvents);
    } else {
      const records = loadDemoData(); const known = new Set(records.map((item) => item.source_uid).filter(Boolean)); newEvents = parsed.filter((item) => !known.has(item.source_uid));
      newEvents.forEach((item) => records.push({ ...item, id: crypto.randomUUID() })); writeDemoData(records);
    }
    importDialog.close(); state.cursor = fromISODate(parsed[0].date); await loadPeriod(); showToast(`${newEvents.length} ${newEvents.length === 1 ? "actividad importada" : "actividades importadas"}`);
  } catch (error) { message.textContent = `No se pudo importar. ${friendlyError(error)}`; message.hidden = false; }
  finally { button.disabled = false; button.textContent = "Importar actividades"; }
}

function parseICS(text, defaults) {
  const unfolded = text.replace(/\r?\n[ \t]/g, ""); const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || []; const result = [];
  blocks.forEach((block) => {
    const values = {};
    block.split(/\r?\n/).forEach((line) => { const colon = line.indexOf(":"); if (colon < 0) return; const rawKey = line.slice(0, colon); const key = rawKey.split(";")[0].toUpperCase(); if (!values[key]) values[key] = { value: line.slice(colon + 1), rawKey }; });
    if (!values.DTSTART || !values.SUMMARY) return;
    const start = parseICSDate(values.DTSTART.value); const end = values.DTEND ? parseICSDate(values.DTEND.value) : { date: new Date(start.date.getTime() + 3600000), allDay: false };
    const description = unescapeICS(values.DESCRIPTION?.value || ""); const location = unescapeICS(values.LOCATION?.value || "") || "Lugar a confirmar"; const summary = unescapeICS(values.SUMMARY.value);
    const url = extractEventUrl(unescapeICS(values.URL?.value || ""), description); const platform = defaults.platform || detectPlatform(`${url} ${description}`); const uid = unescapeICS(values.UID?.value || `${summary}-${values.DTSTART.value}`);
    const importedEndDate = start.allDay && end.allDay ? addDays(end.date, -1) : end.date;
    const base = { record_kind: "activity", date: toISODate(start.date), end_date: toISODate(importedEndDate < start.date ? start.date : importedEndDate), start_time: start.allDay ? "09:00" : timeFromDate(start.date), end_time: end.allDay ? "10:00" : timeFromDate(end.date), name: summary.slice(0, 160), secretary: defaults.secretary, responsible: defaults.responsible, classroom: location.slice(0, 100), activity_type: "hybrid", activity_status: "scheduled", postponed_date: "", postponed_date_tbd: false, requirements: [description, defaults.requirements].filter(Boolean).join(" · ").slice(0, 1000), observations: "", meeting_url: url, link_is_public: defaults.link_is_public, more_info_url: "", platform, account_used: defaults.account_used, recording_required: defaults.recording_required, source_uid: `${uid}-${toISODate(start.date)}` };
    result.push(base); expandSimpleRecurrence(base, values.RRULE?.value, start.date, end.date, uid).forEach((item) => result.push(item));
  });
  const unique = new Map(); result.forEach((item) => unique.set(item.source_uid, item)); return [...unique.values()].sort(sortActivities);
}

function parseICSDate(value) {
  const clean = value.trim();
  if (/^\d{8}$/.test(clean)) return { date: new Date(Number(clean.slice(0, 4)), Number(clean.slice(4, 6)) - 1, Number(clean.slice(6, 8)), 9, 0), allDay: true };
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/); if (!match) throw new Error(`Fecha de calendario no reconocida: ${clean}`);
  const [, year, month, day, hour, minute, second = "00", utc] = match;
  const date = utc ? new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second)) : new Date(+year, +month - 1, +day, +hour, +minute, +second);
  return { date, allDay: false };
}

function timeFromDate(date) { return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }
function unescapeICS(value) { return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim(); }
function extractEventUrl(explicitUrl, description) { const candidates = `${explicitUrl} ${description}`.match(/https?:\/\/[^\s<>]+/gi) || []; const preferred = candidates.find((url) => /zoom\.us|meet\.google\.com|teams\.microsoft\.com/i.test(url)); return (preferred || candidates[0] || "").replace(/[),.;]+$/, "").slice(0, 500); }
function detectPlatform(text) { if (/zoom\.us/i.test(text)) return "Zoom"; if (/meet\.google\.com/i.test(text)) return "Google Meet"; if (/teams\.microsoft\.com/i.test(text)) return "Microsoft Teams"; if (/youtube\.com|youtu\.be/i.test(text)) return "YouTube"; return ""; }

function expandSimpleRecurrence(base, ruleText, startDate, endDate, uid) {
  if (!ruleText) return []; const rule = Object.fromEntries(ruleText.split(";").map((part) => part.split("="))); if (!["DAILY", "WEEKLY"].includes(rule.FREQ)) return [];
  const limit = rule.UNTIL ? parseICSDate(rule.UNTIL).date : addMonths(startDate, 12); const maxCount = Math.min(Number(rule.COUNT || 400), 400); const duration = endDate.getTime() - startDate.getTime(); const interval = Math.max(Number(rule.INTERVAL || 1), 1);
  const days = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 }; const byDays = (rule.BYDAY || "").split(",").map((day) => days[day.slice(-2)]).filter((day) => day !== undefined); const occurrences = [];
  for (let cursor = addDays(startDate, 1), guard = 0; cursor <= limit && occurrences.length + 1 < maxCount && guard < 3700; cursor = addDays(cursor, 1), guard += 1) {
    const diffDays = Math.round((localDate(cursor) - localDate(startDate)) / 86400000);
    const matches = rule.FREQ === "DAILY" ? diffDays % interval === 0 : Math.floor(diffDays / 7) % interval === 0 && (byDays.length ? byDays.includes(cursor.getDay()) : cursor.getDay() === startDate.getDay());
    if (!matches) continue; const end = new Date(cursor.getTime() + duration);
    const durationDays = Math.round((fromISODate(base.end_date) - fromISODate(base.date)) / 86400000);
    occurrences.push({ ...base, date: toISODate(cursor), end_date: toISODate(addDays(cursor, durationDays)), start_time: timeFromDate(cursor), end_time: timeFromDate(end), source_uid: `${uid}-${toISODate(cursor)}` });
  }
  return occurrences;
}

function friendlyError(error) {
  const code = error?.code || "";
  if (code === "auth/unauthorized-domain") return "Falta autorizar el dominio de GitHub Pages en Firebase.";
  if (code === "permission-denied" || code === "firestore/permission-denied") return "La cuenta no tiene permiso para realizar esta acción.";
  if (code === "unavailable" || code === "firestore/unavailable") return "No hay conexión con Firebase. Revisá Internet e intentá nuevamente.";
  return error?.message || "Intentá nuevamente.";
}

init().catch((error) => {
  status.textContent = `No se pudo iniciar la agenda. ${friendlyError(error)}`;
});
