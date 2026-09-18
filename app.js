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
const demoCalendarStorageKey = "agenda-calendario-config-v30";
const calendarConfigDocumentId = "__calendar_config__";
const calendarFirstYear = 2026;
const calendarLastYear = 2030;
const calendarMinDate = new Date(calendarFirstYear, 0, 1);
const calendarMaxDate = new Date(calendarLastYear, 11, 31);
const defaultCalendarConfig = {
  years: {
    "2026": { start: "2026-01-01", end: "2026-12-28", holidays: [
      { date: "2026-10-12", name: "Feriado" },
      { date: "2026-11-23", name: "Feriado" },
      { date: "2026-12-07", name: "Feriado" },
      { date: "2026-12-08", name: "Feriado" }
    ] },
    "2027": { start: "2027-01-01", end: "2027-12-31", holidays: [] },
    "2028": { start: "2028-01-01", end: "2028-12-31", holidays: [] },
    "2029": { start: "2029-01-01", end: "2029-12-31", holidays: [] },
    "2030": { start: "2030-01-01", end: "2030-12-31", holidays: [] }
  }
};
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
const postgraduateSecretary = "Secretaría de Posgrado";
const generalSecretary = "Secretaría General";
const commonProgramSecretaries = new Set([
  academicSecretary,
  "Secretaría de Investigación, Ciencia y Técnica",
  "Secretaría de Relaciones Estudiantiles y Egresados/as",
  "Secretaría de Extensión, Vinculación y Territorio"
]);
const commonActivityCategoryOptions = [
  ["course", "Curso"],
  ["training", "Capacitación"],
  ["workshop", "Taller"],
  ["days", "Jornada/s"],
  ["congress", "Congreso"],
  ["service", "Servicio"]
];
const activityCategoryLabels = new Map([
  ["class", "Materia"],
  ["exam", "Examen final"],
  ["doctorate", "Doctorado"],
  ["masters", "Maestría"],
  ["specialization", "Especialización"],
  ["diploma", "Diplomatura"],
  ["thesis_defense", "Defensa de tesis"],
  ["seminar", "Seminario"],
  ["course", "Curso"],
  ["training", "Capacitación"],
  ["workshop", "Taller"],
  ["days", "Jornada/s"],
  ["congress", "Congreso"],
  ["service", "Servicio"],
  ["board", "Consejo Directivo"],
  ["other", "Otra actividad"]
]);
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
    "Optativa": ["Derecho Público Provincial y Municipal", "Derecho de la Salud y Responsabilidad Médica", "Criminología", "Derecho del Transporte", "Derecho Electoral", "Derecho del Deporte", "Inteligencia Criminal y Crimen Organizado", "Derecho Aeronáutico", "Derecho Aduanero", "Derecho Procesal Constitucional", "Derecho Informático", "Análisis Económico del Derecho", "Derecho Bancario Bursátil y Seguros", "Propiedad Horizontal y Conjuntos Inmobiliarios", "Derecho Penal Económico", "Procedimientos y Procesos Administrativos Especiales", "Empresa Familiar", "Integración Regional", "Derecho de los Negocios Internacionales", "Derecho Notarial y Registral"]
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

const state = { view: "day", cursor: new Date(), activities: [], allActivities: [], user: null, canEdit: !configured, filters: new Set(["presential", "hybrid", "virtual", "featured"]), searchQuery: "", calendarConfig: null };
const el = (id) => document.getElementById(id);
const agenda = el("agenda");
const status = el("status");
const activityDialog = el("activityDialog");
const importDialog = el("importDialog");
const detailDialog = el("detailDialog");
const calendarDialog = el("calendarDialog");

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
function cloneDefaultCalendarConfig() { return JSON.parse(JSON.stringify(defaultCalendarConfig)); }
function validISODate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")); }
function normalizeCalendarConfig(raw) {
  const result = cloneDefaultCalendarConfig();
  for (let year = calendarFirstYear; year <= calendarLastYear; year += 1) {
    const key = String(year); const source = raw?.years?.[key]; if (!source) continue;
    const start = validISODate(source.start) && Number(source.start.slice(0, 4)) === year ? source.start : result.years[key].start;
    const end = validISODate(source.end) && Number(source.end.slice(0, 4)) === year ? source.end : result.years[key].end;
    const holidays = Array.isArray(source.holidays) ? source.holidays.map((entry) => {
      if (typeof entry === "string") return { date: entry, name: "Feriado" };
      return { date: String(entry?.date || ""), name: String(entry?.name || "Feriado").trim() || "Feriado" };
    }).filter((entry) => validISODate(entry.date) && Number(entry.date.slice(0, 4)) === year) : [];
    result.years[key] = { start, end: end < start ? start : end, holidays };
  }
  return result;
}
function calendarConfigForYear(year) { return state.calendarConfig?.years?.[String(year)] || cloneDefaultCalendarConfig().years[String(year)]; }
function isCalendarConfigRecord(item) { return item?.id === calendarConfigDocumentId || String(item?.record_kind || "").toLowerCase() === "calendar_config"; }
function isWithinConfiguredCalendar(date) {
  const day = localDate(date); if (day < calendarMinDate || day > calendarMaxDate) return false;
  const configYear = calendarConfigForYear(day.getFullYear()); if (!configYear) return false;
  const key = toISODate(day); return key >= configYear.start && key <= configYear.end;
}
function holidayForDate(date) {
  const configYear = calendarConfigForYear(date.getFullYear()); if (!configYear) return null;
  const key = toISODate(date); return (configYear.holidays || []).find((entry) => entry.date === key) || null;
}
function holidayLabel(date) { return holidayForDate(date)?.name || "Feriado"; }
function normalizedModality(item) {
  const value = String(item?.activity_type || "").trim().toLocaleLowerCase(locale);
  if (["presential", "presencial"].includes(value)) return "presential";
  if (value === "virtual") return "virtual";
  return "hybrid"; // Las transmisiones históricas se integran como híbridas.
}
function isVirtual(item) { return normalizedModality(item) === "virtual"; }
function isPresential(item) { return normalizedModality(item) === "presential"; }
function isHybrid(item) { return normalizedModality(item) === "hybrid"; }
function activityTypeLabel(item) { return isVirtual(item) ? "Virtual" : isPresential(item) ? "Presencial" : "Híbrida"; }
function activityTypeKey(item) { return normalizedModality(item); }
function normalizeAcademicYear(value) { return value === "Optativas / otras" ? "Optativa" : (value || ""); }
function activityCategoryOptionsForSecretary(secretary) {
  const organizer = organizerName(secretary);
  if (organizer === postgraduateSecretary) return [
    ["doctorate", "Doctorado"], ["masters", "Maestría"], ["specialization", "Especialización"], ["diploma", "Diplomatura"],
    ["thesis_defense", "Defensa de tesis"], ["seminar", "Seminario"], ["course", "Curso"], ["days", "Jornada/s"]
  ];
  if (organizer === generalSecretary) return [["board", "Consejo Directivo"]];
  if (organizer === academicSecretary) return [["class", "Materia"], ["exam", "Examen final"], ...commonActivityCategoryOptions];
  if (commonProgramSecretaries.has(organizer)) return commonActivityCategoryOptions;
  return [...commonActivityCategoryOptions, ["other", "Otra actividad"]];
}
function inferActivityCategory(item) {
  const organizer = organizerName(item?.secretary);
  const text = `${item?.name || ""} ${item?.subject || ""}`.toLocaleLowerCase(locale);
  const legacy = String(item?.academic_activity_type || "").trim().toLocaleLowerCase(locale);
  if (["class", "exam", "other"].includes(legacy)) return legacy;
  if (organizer === academicSecretary && item?.subject) return "class";
  if (organizer === generalSecretary || text.includes("consejo directivo")) return "board";
  if (text.includes("defensa") && text.includes("tesis")) return "thesis_defense";
  if (text.includes("doctorado")) return "doctorate";
  if (text.includes("maestr")) return "masters";
  if (text.includes("especializ")) return "specialization";
  if (text.includes("diplom")) return "diploma";
  if (text.includes("seminar")) return "seminar";
  if (text.includes("capacita")) return "training";
  if (text.includes("taller")) return "workshop";
  if (text.includes("jornada")) return "days";
  if (text.includes("congreso")) return "congress";
  if (text.includes("servicio")) return "service";
  if (text.includes("curso")) return "course";
  return "";
}
function activityCategoryKey(item) {
  const stored = String(item?.activity_category || "").trim().toLocaleLowerCase(locale);
  return activityCategoryLabels.has(stored) ? stored : inferActivityCategory(item);
}
function activityCategoryLabel(item) {
  if (subjectBaseName(item?.subject) === "Ingreso") return "Ingreso";
  return activityCategoryLabels.get(activityCategoryKey(item)) || "Actividad";
}
function activityDescriptor(item) { return activityCategoryLabel(item); }
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
function itemAcademicYear(item) { return normalizeAcademicYear(item?.academic_year || inferAcademicYear(item?.career, item?.subject)); }
function minutesFromTime(value) { const [hours, minutes] = cleanTime(value).split(":").map(Number); return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : -1; }
function isInProgress(item, now = new Date()) {
  if (isSuspended(item) || isPostponed(item)) return false;
  const today = toISODate(now); if (today < item.date || today > activityEndDate(item)) return false;
  const current = now.getHours() * 60 + now.getMinutes(); const start = minutesFromTime(item.start_time); const end = minutesFromTime(item.end_time);
  return start >= 0 && end >= 0 && current >= start && current < end;
}
function activityDateTime(dateValue, timeValue) {
  const date = fromISODate(dateValue); const minutes = minutesFromTime(timeValue);
  if (minutes < 0) return date;
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0); return date;
}
function activityStartDateTime(item) { return activityDateTime(item.date, item.start_time); }
function activityEndDateTime(item) { return activityDateTime(activityEndDate(item), item.end_time); }
function isPastActivity(item, now = new Date()) {
  if (isSuspended(item) || isPostponed(item)) return false;
  return activityEndDateTime(item).getTime() <= now.getTime();
}
function formatDuration(milliseconds) {
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60000));
  const days = Math.floor(totalMinutes / 1440); const hours = Math.floor((totalMinutes % 1440) / 60); const minutes = totalMinutes % 60;
  if (days) return `${days} ${days === 1 ? "día" : "días"}${hours ? ` ${hours} h` : ""}`;
  if (hours) return `${hours} h${minutes ? ` ${minutes} min` : ""}`;
  return `${minutes} min`;
}
function dailyTiming(item, now = new Date()) {
  if (isSuspended(item) || isPostponed(item)) return null;
  const start = activityStartDateTime(item); const end = activityEndDateTime(item);
  if (now < start) return { kind: "upcoming", label: `Empieza en ${formatDuration(start - now)}` };
  if (now < end) return { kind: "elapsed", label: `${formatDuration(now - start)} transcurridos` };
  return null;
}
function isPastDay(date, now = new Date()) { return localDate(date) < localDate(now); }
function isImportantPeriod(item) { return String(item?.record_kind || "").trim().toLocaleLowerCase(locale) === "period"; }
function periodTypeKey(item) {
  const stored = String(item?.period_type || "").trim().toLocaleLowerCase(locale);
  if (["inscriptions", "exam_tables", "recess", "suspension", "other"].includes(stored)) return stored;
  const text = String(item?.name || "").toLocaleLowerCase(locale);
  if (text.includes("mesa") && text.includes("examen")) return "exam_tables";
  if (text.includes("inscrip")) return "inscriptions";
  if (text.includes("receso") || text.includes("vacacion")) return "recess";
  if (text.includes("suspens")) return "suspension";
  return "other";
}
function periodTypeLabel(item) { return { inscriptions: "Inscripciones", exam_tables: "Mesas de examen", recess: "Recesos", suspension: "Suspensión de actividades", other: "Otra fecha destacada" }[periodTypeKey(item)]; }
function importantPeriodStatus(item) {
  const today = toISODate(new Date());
  if (today < item.date) return "Próximamente";
  if (today > activityEndDate(item)) return "Finalizada";
  const remaining = Math.round((fromISODate(activityEndDate(item)) - fromISODate(today)) / 86400000);
  return remaining <= 2 ? "Últimos días" : "Vigente";
}
function isHoliday(date) { return Boolean(holidayForDate(date)); }
function matchesQuickFilter(item) {
  const categoryMatches = isImportantPeriod(item) ? state.filters.has("featured") : state.filters.has(activityTypeKey(item));
  if (!categoryMatches) return false;
  const query = String(state.searchQuery || "").trim().toLocaleLowerCase(locale);
  if (!query) return true;
  const searchable = [
    item.name, item.secretary, organizerName(item.secretary), item.responsible, item.career, item.subject,
    item.academic_year, item.year, item.classroom, item.platform, item.activity_detail, item.academic_type,
    item.period_description, item.requirements, item.observations, activityDescriptor(item), activityTypeLabel(item),
    isImportantPeriod(item) ? periodTypeLabel(item) : ""
  ].filter(Boolean).join(" ").toLocaleLowerCase(locale);
  return searchable.includes(query);
}
function itemHasDisplayableDay(item, start, end) {
  const itemStart = fromISODate(item.date) > localDate(start) ? fromISODate(item.date) : localDate(start);
  const itemEnd = fromISODate(activityEndDate(item)) < localDate(end) ? fromISODate(activityEndDate(item)) : localDate(end);
  for (let date = new Date(itemStart); date <= itemEnd; date = addDays(date, 1)) {
    if (date.getDay() !== 0 && isWithinConfiguredCalendar(date) && !isHoliday(date)) return true;
  }
  return false;
}
function isAfterCalendarEnd(date) { return localDate(date) > calendarMaxDate; }
function isBeforeCalendarStart(date) { return localDate(date) < calendarMinDate; }
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
    { id: "demo-1", date: toISODate(monday), end_date: toISODate(addDays(monday, 1)), start_time: "09:00", end_time: "11:00", name: "Jornada de actualización en Derecho Procesal", secretary: "Secretaría de Posgrado", activity_category: "days", activity_type: "hybrid", responsible: "Mariana López", classroom: "Aula Magna", requirements: "Dos micrófonos, cámara fija y presentación. Realizar prueba técnica 30 minutos antes.", meeting_url: "https://meet.google.com/", link_is_public: false, platform: "Google Meet", account_used: "Cuenta institucional Posgrado", recording_required: true, observations: "" },
    { id: "demo-2", date: toISODate(addDays(monday, 1)), end_date: toISODate(addDays(monday, 1)), start_time: "16:00", end_time: "18:00", name: "Clase híbrida de Derecho Constitucional", secretary: "Secretaría Académica", activity_category: "class", academic_activity_type: "class", activity_type: "hybrid", career: lawCareer, subject: "Derecho Constitucional", responsible: "Lucas Fernández", classroom: "Aula H (Magnita)", requirements: "Notebook, proyector y audio bidireccional.", meeting_url: "https://zoom.us/", link_is_public: true, platform: "Zoom", account_used: "Licencia Zoom Facultad", recording_required: true, observations: "" },
    { id: "demo-3", date: toISODate(addDays(monday, 3)), end_date: toISODate(addDays(monday, 3)), start_time: "10:30", end_time: "12:00", name: "Sesión del Consejo Directivo", secretary: "Secretaría General", activity_category: "board", responsible: "Sofía Martínez", classroom: "Consejo Directivo", activity_type: "hybrid", requirements: "Verificar audio y transmisión 30 minutos antes.", meeting_url: "https://www.youtube.com/", link_is_public: true, platform: "YouTube", account_used: "Canal institucional", recording_required: true, observations: "" },
    { id: "demo-4", record_kind: "period", period_type: "inscriptions", date: toISODate(monday), end_date: toISODate(addDays(monday, 12)), start_time: "", end_time: "", name: "Inscripción a mesas de exámenes", secretary: "Secretaría Académica", responsible: "", classroom: "", requirements: "Consultá el cronograma y realizá la inscripción dentro del período indicado.", more_info_url: "https://www.uncuyo.edu.ar/", meeting_url: "", link_is_public: false, platform: "", account_used: "", recording_required: false, observations: "" }
  ].filter((item) => fromISODate(item.date) <= calendarMaxDate);
}

function loadDemoData() {
  const saved = localStorage.getItem(demoStorageKey);
  if (saved) { try { return JSON.parse(saved); } catch (_) { /* regenerar */ } }
  const examples = demoRecords();
  localStorage.setItem(demoStorageKey, JSON.stringify(examples));
  return examples;
}
function writeDemoData(records) { localStorage.setItem(demoStorageKey, JSON.stringify(records)); }
function loadDemoCalendarConfig() {
  const saved = localStorage.getItem(demoCalendarStorageKey);
  if (!saved) return cloneDefaultCalendarConfig();
  try { return normalizeCalendarConfig(JSON.parse(saved)); } catch (_) { return cloneDefaultCalendarConfig(); }
}
function writeDemoCalendarConfig(calendarConfig) { localStorage.setItem(demoCalendarStorageKey, JSON.stringify(calendarConfig)); }

async function init() {
  state.calendarConfig = cloneDefaultCalendarConfig();
  el("demoBanner").hidden = configured;
  populateFormOptions();
  populateCalendarYearOptions();
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
  el("currentPeriod").addEventListener("click", () => { const today = localDate(new Date()); state.cursor = today < calendarMinDate ? calendarMinDate : today > calendarMaxDate ? calendarMaxDate : today; loadPeriod(); });
  document.querySelectorAll(".view-filter-check").forEach((checkbox) => checkbox.addEventListener("change", syncViewFilters));
  el("agendaSearch").addEventListener("input", (event) => { state.searchQuery = event.target.value; render(); });
  el("newActivity").addEventListener("click", () => openActivityForm());
  el("updateCalendar").addEventListener("click", openCalendarForm);
  el("importCalendar").addEventListener("click", openImportForm);
  el("authButton").addEventListener("click", handleAuthButton);
  el("activityForm").addEventListener("submit", saveActivity);
  el("importForm").addEventListener("submit", importCalendarFile);
  el("calendarForm").addEventListener("submit", saveCalendarConfig);
  el("calendarYear").addEventListener("change", loadCalendarYearForm);
  el("date").addEventListener("change", updateDateInputs);
  el("endDate").addEventListener("change", updateDateRangeInputs);
  el("recurrence").addEventListener("change", toggleRecurrenceFields);
  el("activityStatus").addEventListener("change", toggleActivityStatusFields);
  el("postponedDateTbd").addEventListener("change", toggleActivityStatusFields);
  el("secretary").addEventListener("change", () => { toggleOtherSecretary(); updateAcademicFields(); });
  el("otherSecretary").addEventListener("input", () => { if (el("secretary").value === "__other__") updateAcademicFields(); });
  el("academicType").addEventListener("change", () => updateAcademicFields());
  el("career").addEventListener("change", () => updateAcademicYearOptions());
  el("academicYear").addEventListener("change", () => updateSubjectOptions());
  el("classroom").addEventListener("change", toggleOtherClassroom);
  el("activityType").addEventListener("change", toggleActivityTypeFields);
  el("recordKind").addEventListener("change", toggleRecordKindFields);
  el("icsFile").addEventListener("change", () => { el("icsFileName").textContent = el("icsFile").files[0]?.name || "Ningún archivo seleccionado"; });
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => el(button.dataset.close).close()));
  [importDialog, detailDialog, calendarDialog].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  activityDialog.addEventListener("cancel", (event) => event.preventDefault());
  setInterval(() => { if (!document.hidden) render(); }, 60000);
}

function syncViewFilters() {
  state.filters = new Set([...document.querySelectorAll(".view-filter-check:checked")].map((checkbox) => checkbox.value));
  render();
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
  populateSelect(el("academicType"), [], "Primero seleccioná un área organizadora");
  populateSelect(el("classroom"), [...classroomOptions, "__other__"], "Seleccionar aula o lugar");
  el("classroom").querySelector('option[value="__other__"]').textContent = "Otro (especificar)";
}

function updateAcademicFields(preferredSubject = "", preferredYear = "", preferredCategory = "") {
  const scheduled = el("recordKind").value === "activity";
  const organizer = el("secretary").value === "__other__" ? el("otherSecretary").value.trim() : el("secretary").value;
  const currentCategory = preferredCategory || el("academicType").value;
  const options = organizer ? [...activityCategoryOptionsForSecretary(organizer)] : [];
  if (currentCategory && activityCategoryLabels.has(currentCategory) && !options.some(([value]) => value === currentCategory)) options.push([currentCategory, activityCategoryLabels.get(currentCategory)]);
  el("academicType").replaceChildren();
  const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = organizer ? "Seleccionar" : "Primero seleccioná un área organizadora"; el("academicType").append(placeholder);
  options.forEach(([value, label]) => { const option = document.createElement("option"); option.value = value; option.textContent = label; el("academicType").append(option); });
  if (options.some(([value]) => value === currentCategory)) el("academicType").value = currentCategory;
  else if (options.length === 1) el("academicType").value = options[0][0];
  const academic = scheduled && organizerName(organizer) === academicSecretary;
  const detailed = academic && ["class", "exam"].includes(el("academicType").value);
  el("academicTypeField").hidden = !scheduled || !organizer;
  el("academicType").required = scheduled && Boolean(organizer);
  el("careerField").hidden = !detailed; el("academicYearField").hidden = !detailed; el("subjectField").hidden = !detailed;
  el("career").required = detailed; el("academicYear").required = detailed; el("subject").required = detailed;
  el("activityType").disabled = academic && el("academicType").value === "exam";
  if (academic && el("academicType").value === "exam") el("activityType").value = "presential";
  if (!detailed) { el("career").value = ""; populateSelect(el("academicYear"), [], "Primero seleccioná una carrera"); populateSelect(el("subject"), [], "Primero seleccioná un año"); toggleActivityTypeFields(); return; }
  updateAcademicYearOptions(preferredYear, preferredSubject);
  toggleActivityTypeFields();
}

function updateAcademicYearOptions(preferredYear = "", preferredSubject = "") {
  const years = Object.keys(academicPlans[el("career").value] || {});
  populateSelect(el("academicYear"), years, years.length ? "Seleccionar año" : "Primero seleccioná una carrera");
  const inferred = normalizeAcademicYear(preferredYear || inferAcademicYear(el("career").value, preferredSubject));
  if (years.includes(inferred)) el("academicYear").value = inferred;
  updateSubjectOptions(preferredSubject);
}

function updateSubjectOptions(preferredSubject = "") {
  const subjects = subjectsForPlan(el("career").value, el("academicYear").value);
  populateSelect(el("subject"), subjects, subjects.length ? "Seleccionar" : "Primero seleccioná un año");
  if (subjects.includes(preferredSubject)) el("subject").value = preferredSubject;
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
}

function toggleRecordKindFields() {
  const scheduled = el("recordKind").value === "activity"; const editing = Boolean(el("activityId").value);
  document.querySelectorAll("[data-scheduled-only]").forEach((node) => { node.hidden = !scheduled; });
  document.querySelectorAll("[data-period-only]").forEach((node) => { node.hidden = scheduled; });
  el("periodType").required = !scheduled;
  el("nameLabel").textContent = scheduled ? "Título" : "Detalle";
  el("startTime").required = scheduled; el("endTime").required = scheduled; el("activityType").required = scheduled; el("responsible").required = scheduled;
  el("recurrenceField").hidden = !scheduled || editing;
  el("recurrence").disabled = editing || !scheduled;
  if (!scheduled) { el("recurrence").value = "none"; el("updateSameName").checked = false; }
  el("bulkEditField").hidden = !scheduled || !editing;
  el("requirementsLabel").textContent = scheduled ? "Requerimientos / observaciones" : "Descripción / información importante";
  el("formTitle").textContent = editing ? (scheduled ? "Editar actividad" : "Editar fecha destacada") : (scheduled ? "Nueva actividad" : "Nueva fecha destacada");
  el("saveActivity").textContent = scheduled ? "Guardar actividad" : "Guardar fecha destacada";
  toggleRecurrenceFields(); updateAcademicFields(el("subject").value); toggleActivityTypeFields(); toggleActivityStatusFields();
}

function toggleOtherSecretary() {
  const other = el("secretary").value === "__other__";
  el("otherSecretaryField").hidden = !other; el("otherSecretary").required = other;
  if (!other) el("otherSecretary").value = "";
}

function updateAuthUI() {
  const button = el("authButton");
  el("sessionLabel").hidden = true;
  el("sessionLabel").textContent = state.canEdit && state.user?.email ? state.user.email : "";
  if (!configured) { button.setAttribute("aria-label", "Volver a la agenda pública"); button.title = "Volver a la agenda pública"; }
  else if (state.user && state.canEdit) { button.setAttribute("aria-label", "Salir del modo administrador"); button.title = "Salir del modo administrador"; }
  else { button.setAttribute("aria-label", "Administración"); button.title = "Administración"; }
  document.querySelectorAll(".editor-only").forEach((node) => { node.hidden = !state.canEdit; });
}

async function handleAuthButton() {
  if (!configured) {
    const url = new URL(location.href); url.searchParams.delete("demo"); location.href = url.toString(); return;
  }
  if (state.user) { await signOut(auth); return; }
  try {
    const provider = new GoogleAuthProvider();
    if (adminEmail) provider.setCustomParameters({ login_hint: adminEmail });
    const result = await signInWithPopup(auth, provider);
    if (!result.user?.email || result.user.email.toLowerCase() !== adminEmail) { await signOut(auth); alert("Esta cuenta no tiene permisos de administración."); }
  } catch (error) { if (error?.code !== "auth/popup-closed-by-user") alert(`No se pudo iniciar sesión. ${friendlyError(error)}`); }
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
  let candidate = addDays(date, direction); let guard = 0;
  while (guard < 2000 && (candidate.getDay() === 0 || !isWithinConfiguredCalendar(candidate))) { candidate = addDays(candidate, direction); guard += 1; if (candidate < calendarMinDate || candidate > calendarMaxDate) break; }
  return candidate;
}

function movePeriod(direction) {
  const candidate = state.view === "day" ? moveAgendaDay(state.cursor, direction) : state.view === "week" ? addDays(state.cursor, direction * 7) : addMonths(state.cursor, direction);
  const candidateStart = state.view === "day" ? localDate(candidate) : state.view === "week" ? startOfWeek(candidate) : startOfMonth(candidate);
  if (direction > 0 && candidateStart > calendarMaxDate) return;
  if (direction < 0 && candidateStart < calendarMinDate) return;
  state.cursor = candidate; loadPeriod();
}

function periodRange() {
  if (state.view === "day") {
    const day = state.cursor.getDay() === 0 ? addDays(localDate(state.cursor), 1) : localDate(state.cursor);
    return { start: day, end: day, visibleStart: day, visibleEnd: day };
  }
  if (state.view === "week") {
    const start = startOfWeek(state.cursor); const naturalEnd = addDays(start, 5); const end = naturalEnd > calendarMaxDate ? calendarMaxDate : naturalEnd;
    return { start, end, visibleStart: start, visibleEnd: end };
  }
  const monthStart = startOfMonth(state.cursor); const gridStart = startOfWeek(monthStart);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const naturalGridEnd = addDays(startOfWeek(monthEnd), 5); const visibleEnd = monthEnd > calendarMaxDate ? calendarMaxDate : monthEnd;
  const gridEnd = naturalGridEnd > calendarMaxDate ? calendarMaxDate : naturalGridEnd;
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
      const configRecord = records.find(isCalendarConfigRecord);
      state.calendarConfig = normalizeCalendarConfig(configRecord?.calendar_config);
      records = records.filter((item) => !isCalendarConfigRecord(item));
      state.allActivities = records.sort(sortActivities);
      state.activities = records.filter((item) => overlapsPeriod(item, start, end)).sort(sortActivities);
    } else {
      state.calendarConfig = loadDemoCalendarConfig();
      const records = loadDemoData().filter((item) => !isCalendarConfigRecord(item)).sort(sortActivities); state.allActivities = records;
      state.activities = records.filter((item) => overlapsPeriod(item, start, end)).sort(sortActivities);
    }
  } catch (error) {
    status.textContent = `No se pudo cargar la agenda. ${friendlyError(error)}`; return;
  }
  updatePeriodTitle(); updateNavigationState(); render();
}

function updateNavigationState() {
  const nextCandidate = state.view === "day" ? moveAgendaDay(state.cursor, 1) : state.view === "week" ? startOfWeek(addDays(state.cursor, 7)) : startOfMonth(addMonths(state.cursor, 1));
  const previousCandidate = state.view === "day" ? moveAgendaDay(state.cursor, -1) : state.view === "week" ? startOfWeek(addDays(state.cursor, -7)) : startOfMonth(addMonths(state.cursor, -1));
  el("nextPeriod").disabled = nextCandidate > calendarMaxDate;
  el("previousPeriod").disabled = previousCandidate < calendarMinDate;
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
  agenda.replaceChildren(); if (state.view === "day") renderDay(); else if (state.view === "week") renderWeek(); else renderMonth();
  const { visibleStart, visibleEnd } = periodRange();
  const candidates = state.activities.filter((item) => matchesQuickFilter(item) && overlapsPeriod(item, visibleStart, visibleEnd) && itemHasDisplayableDay(item, visibleStart, visibleEnd));
  const count = candidates.length;
  status.className = "status activity-count";
  const countNumber = document.createElement("strong"); countNumber.className = "activity-count-number"; countNumber.textContent = String(count);
  const countText = document.createElement("span"); countText.className = "activity-count-text"; countText.textContent = count === 1 ? "evento" : "eventos";
  status.replaceChildren(countNumber, countText);
  updateHeaderEventTotal();
}

function updateHeaderEventTotal() {
  const count = state.allActivities.length;
  const total = el("headerEventTotal");
  const number = document.createElement("strong"); number.className = "header-event-number"; number.textContent = String(count);
  const desktop = document.createElement("span"); desktop.className = "header-event-label header-event-label-desktop"; desktop.textContent = count === 1 ? "evento total" : "eventos totales";
  const mobile = document.createElement("span"); mobile.className = "header-event-label header-event-label-mobile"; mobile.textContent = count === 1 ? "evento" : "eventos";
  total.replaceChildren(number, desktop, mobile);
}

function isToday(date) { return toISODate(date) === toISODate(new Date()); }

function renderDay() {
  const { start } = periodRange();
  const section = document.createElement("section"); section.className = "day-section day-view-section";
  if (isToday(start)) section.classList.add("today-day");
  if (!isWithinConfiguredCalendar(start)) section.classList.add("outside-calendar-day");
  const list = document.createElement("div"); list.className = "day-list"; const items = calendarItemsForDate(start);
  if (!items.length) {
    section.classList.add("empty-day-section"); if (isHoliday(start)) section.classList.add("holiday-day");
    const empty = document.createElement("p"); empty.className = isHoliday(start) ? "holiday-empty" : "empty-day"; empty.textContent = isHoliday(start) ? `${holidayLabel(start)} · sin actividades` : !isWithinConfiguredCalendar(start) ? "Fuera del calendario" : "Sin actividades"; list.append(empty);
  } else items.forEach((item) => list.append(isImportantPeriod(item) ? createPeriodRow(item) : createActivityRow(item)));
  section.append(createDayHeading(start), list); agenda.append(section);
}

function renderWeek() {
  const start = startOfWeek(state.cursor);
  for (let index = 0; index < 6; index += 1) {
    const date = addDays(start, index); if (isAfterCalendarEnd(date)) break;
    const section = document.createElement("section"); section.className = "day-section"; if (isToday(date)) section.classList.add("today-day"); else if (isPastDay(date)) section.classList.add("past-day"); if (!isWithinConfiguredCalendar(date)) section.classList.add("outside-calendar-day");
    const list = document.createElement("div"); list.className = "day-list"; const items = calendarItemsForDate(date);
    if (!items.length) {
      section.classList.add("empty-day-section"); if (isHoliday(date)) section.classList.add("holiday-day");
      const empty = document.createElement("p"); empty.className = isHoliday(date) ? "holiday-empty" : "empty-day"; empty.textContent = isHoliday(date) ? `${holidayLabel(date)} · sin actividades` : !isWithinConfiguredCalendar(date) ? "Fuera del calendario" : "Sin actividades"; list.append(empty);
    } else items.forEach((item) => list.append(isImportantPeriod(item) ? createPeriodRow(item) : createActivityRow(item)));
    section.append(createDayHeading(date), list); agenda.append(section);
  }
}

function createDayHeading(date) {
  const heading = document.createElement("div"); heading.className = "day-heading";
  const title = document.createElement("h3"); title.textContent = weekday(date);
  const dateText = document.createElement("p"); dateText.textContent = formatDate(date, { day: "numeric", month: "long" });
  heading.append(title, dateText);
  if (isToday(date)) { const badge = document.createElement("span"); badge.className = "today-badge"; badge.textContent = "Hoy"; heading.append(badge); }
  if (isHoliday(date)) { const badge = document.createElement("span"); badge.className = "holiday-badge"; badge.textContent = holidayLabel(date); heading.append(badge); }
  return heading;
}

function createPeriodRow(item) {
  const details = document.createElement("details"); details.className = "activity-row period-row";
  details.style.setProperty("--organizer-color", organizerColor(item.secretary));
  const summary = document.createElement("summary"); summary.className = "activity-summary";
  const marker = document.createElement("span"); marker.className = "summary-time period-marker"; marker.textContent = periodTypeLabel(item);
  const title = document.createElement("span"); title.className = "summary-title";
  const periodName = document.createElement("strong"); periodName.className = "summary-activity-name"; periodName.textContent = item.name; title.append(periodName);
  if (item.secretary) {
    const organizer = document.createElement("span"); organizer.className = "summary-organizer"; organizer.textContent = organizerName(item.secretary); organizer.style.color = organizerColor(item.secretary); title.append(organizer);
  }
  const meta = document.createElement("span"); meta.className = "summary-meta";
  const statusBadge = document.createElement("span"); statusBadge.className = "period-status"; statusBadge.textContent = importantPeriodStatus(item);
  const dates = document.createElement("span"); dates.className = "summary-room period-range"; dates.textContent = dateRangeLabel(item);
  meta.append(statusBadge, dates);
  const chevron = document.createElement("span"); chevron.className = "summary-chevron"; chevron.textContent = "⌄";
  summary.append(marker, title, meta, chevron);
  const expanded = document.createElement("div"); expanded.className = "activity-expanded"; expanded.append(createDetailsContent(item, true));
  details.append(summary, expanded); return details;
}

function createActivityRow(item) {
  const details = document.createElement("details"); details.className = "activity-row";
  details.style.setProperty("--organizer-color", organizerColor(item.secretary));
  if (isSuspended(item)) details.classList.add("is-suspended");
  if (isPostponed(item)) details.classList.add("is-postponed");
  if (state.view === "day" && isPastActivity(item)) details.classList.add("is-past-activity");
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
  const categoryBadge = document.createElement("span"); categoryBadge.className = "activity-category-badge"; categoryBadge.textContent = activityDescriptor(item); labels.append(categoryBadge);
  if (isSuspended(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "activity-status-badge suspended"; stateBadge.textContent = "Suspendida"; labels.append(stateBadge); }
  if (isPostponed(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "activity-status-badge postponed"; stateBadge.textContent = `Postergada · ${postponedDateLabel(item)}`; labels.append(stateBadge); }
  if (isInProgress(item)) { const live = document.createElement("span"); live.className = "in-progress-badge"; live.textContent = "▶ En curso"; labels.append(live); }
  if (state.view === "day") {
    const timing = dailyTiming(item);
    if (timing) { const timingBadge = document.createElement("span"); timingBadge.className = `daily-time-badge ${timing.kind}`; timingBadge.textContent = timing.label; labels.append(timingBadge); }
  }
  const placePlatform = document.createElement("span"); placePlatform.className = "summary-place-platform";
  if (!isVirtual(item)) { const room = document.createElement("span"); room.className = "summary-room"; room.textContent = item.classroom || "Lugar a confirmar"; placePlatform.append(room); }
  if (!isPresential(item)) { const platformIcon = createPlatformIcon(item.platform); if (platformIcon) placePlatform.append(platformIcon); }
  meta.append(labels, placePlatform);
  const chevron = document.createElement("span"); chevron.className = "summary-chevron"; chevron.textContent = "⌄";
  summary.append(time, title, meta, chevron);
  const expanded = document.createElement("div"); expanded.className = "activity-expanded"; expanded.append(createDetailsContent(item, true));
  details.append(summary, expanded); return details;
}

function detailFieldsForItem(item) {
  const noteValues = isImportantPeriod(item) ? [item.period_description, item.requirements, item.observations] : [item.requirements, item.observations];
  const combinedNotes = [...new Set(noteValues.filter(Boolean))].join(" · ");
  const fields = [["Fecha/as", dateRangeLabel(item)], ["Organiza", organizerName(item.secretary)]];
  if (isImportantPeriod(item)) {
    fields.push(["Fecha destacada", periodTypeLabel(item)], ["Estado", importantPeriodStatus(item)]);
    if (combinedNotes) fields.push(["Información", combinedNotes]);
    return fields;
  }
  fields.push(["Horario", `${cleanTime(item.start_time)}–${cleanTime(item.end_time)}`], ["Tipo de actividad", activityDescriptor(item)]);
  if (item.career) fields.push(["Carrera", item.career]);
  if (itemAcademicYear(item)) fields.push(["Año", itemAcademicYear(item)]);
  if (item.subject && !isIngreso(item)) fields.push(["Materia", item.subject]);
  if (isSuspended(item)) fields.push(["Estado", "Suspendida"]);
  else if (isPostponed(item)) fields.push(["Estado", "Postergada"], ["Nueva fecha", postponedDateLabel(item)]);
  else if (isInProgress(item)) fields.push(["Estado", "▶ En curso"]);
  if (state.canEdit) fields.push(["Responsable / contacto", item.responsible]);
  if (!isVirtual(item)) fields.push(["Aula/Lugar", item.classroom]);
  fields.push(["Modalidad", activityTypeLabel(item)]);
  if (!isPresential(item)) fields.push(["Plataforma", item.platform]);
  if (state.canEdit) fields.push(["Cuenta", item.account_used], ["Grabación", item.recording_required ? "Sí" : "No"], ["Requerimientos / observaciones", combinedNotes || "Sin indicaciones"]);
  return fields;
}

function createDetailsContent(item, includeEditorActions) {
  const wrapper = document.createElement("div"); const details = document.createElement("div"); details.className = "activity-details";
  detailFieldsForItem(item).forEach(([label, value]) => {
    const block = document.createElement("div"); block.className = "detail-item";
    const labelNode = document.createElement("span"); labelNode.className = "detail-label"; labelNode.textContent = label;
    const valueNode = document.createElement("span"); valueNode.className = "detail-value";
    if (label === "Organiza") { valueNode.classList.add("organizer-value"); valueNode.style.color = organizerColor(item.secretary); }
    if (["Modalidad", "Tipo de actividad", "Fecha destacada", "Estado"].includes(label)) valueNode.classList.add("activity-type-value");
    if (label === "Nueva fecha") valueNode.classList.add("activity-status-value");
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
    const heading = document.createElement("h3"); heading.textContent = "Unirse a la actividad"; meeting.append(heading);
    if (!publicLink && state.canEdit) { const notice = document.createElement("p"); notice.className = "private-link"; notice.textContent = "Link privado · visible solo para administración"; meeting.append(notice); }
    const actions = document.createElement("div"); actions.className = "link-actions";
    const open = document.createElement("a"); open.className = "link-button primary"; open.href = item.meeting_url; open.target = "_blank"; open.rel = "noopener noreferrer"; open.textContent = "Abrir enlace ↗";
    const copy = document.createElement("button"); copy.className = "link-button"; copy.type = "button"; copy.textContent = "Copiar enlace"; copy.addEventListener("click", () => copyLink(item.meeting_url));
    actions.append(open, copy); meeting.append(actions); wrapper.append(meeting);
  }
  if (isSafeUrl(item.more_info_url)) {
    const information = document.createElement("section"); information.className = "meeting-section information-section";
    const heading = document.createElement("h3"); heading.textContent = "Más información";
    const actions = document.createElement("div"); actions.className = "link-actions";
    const open = document.createElement("a"); open.className = "link-button"; open.href = item.more_info_url; open.target = "_blank"; open.rel = "noopener noreferrer"; open.textContent = "Abrir información ↗";
    actions.append(open); information.append(heading, actions); wrapper.append(information);
  }
  const share = document.createElement("div"); share.className = "share-actions";
  const whatsapp = document.createElement("button"); whatsapp.type = "button"; whatsapp.className = "copy-icon-button"; whatsapp.setAttribute("aria-label", "Copiar información"); whatsapp.title = "Copiar información"; whatsapp.append(createCopyIcon());
  whatsapp.addEventListener("click", () => copyWhatsAppInfo(item)); share.append(whatsapp); wrapper.append(share);
  if (includeEditorActions && state.canEdit) {
    const actions = document.createElement("div"); actions.className = "card-actions editor-only";
    actions.append(actionButton("Editar", () => openActivityForm(item)), actionButton("Duplicar", () => duplicateActivity(item)), actionButton("Eliminar", () => deleteActivity(item), "danger"));
    wrapper.append(actions);
  }
  return wrapper;
}

function whatsappTextForItem(item) {
  const lines = [`*${item.name || "Actividad"}*`, ""];
  detailFieldsForItem(item).forEach(([label, value]) => {
    if (!value) return;
    const cleanValue = String(value).replace(/^▶\s*/, "");
    lines.push(`*${label}:* ${cleanValue}`);
  });
  const publicLink = item.link_is_public === true;
  const canIncludeMeetingLink = !isImportantPeriod(item) && !isPresential(item) && isSafeUrl(item.meeting_url) && (state.canEdit || publicLink);
  if (canIncludeMeetingLink) {
    const linkLabel = state.canEdit && !publicLink ? "Enlace privado (administración)" : "Enlace de la actividad";
    lines.push(`🔗 *${linkLabel}:* ${item.meeting_url}`);
  }
  if (isSafeUrl(item.more_info_url)) lines.push(`🔗 *Más información:* ${item.more_info_url}`);
  return lines.join("\n");
}
function createCopyIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
  const rectBack = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rectBack.setAttribute("x", "8"); rectBack.setAttribute("y", "8"); rectBack.setAttribute("width", "11"); rectBack.setAttribute("height", "11"); rectBack.setAttribute("rx", "1.5");
  const pathFront = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathFront.setAttribute("d", "M16 6V5.5A1.5 1.5 0 0 0 14.5 4h-10A1.5 1.5 0 0 0 3 5.5v10A1.5 1.5 0 0 0 4.5 17H5");
  svg.append(rectBack, pathFront);
  return svg;
}
async function copyText(text, successMessage = "Copiado") {
  try { await navigator.clipboard.writeText(text); }
  catch (_) { const input = document.createElement("textarea"); input.value = text; input.style.position = "fixed"; input.style.opacity = "0"; document.body.append(input); input.select(); document.execCommand("copy"); input.remove(); }
  showToast(successMessage);
}
async function copyWhatsAppInfo(item) { await copyText(whatsappTextForItem(item), "Información copiada"); }
function actionButton(label, handler, className = "") { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.className = className; button.addEventListener("click", handler); return button; }

function activitiesForDate(date) {
  if (!isWithinConfiguredCalendar(date) || isHoliday(date)) return [];
  const key = toISODate(date);
  return state.activities.filter((item) => !isImportantPeriod(item) && matchesQuickFilter(item) && item.date <= key && activityEndDate(item) >= key).sort(sortActivities);
}
function periodsForDate(date) {
  if (!isWithinConfiguredCalendar(date) || isHoliday(date)) return [];
  const key = toISODate(date);
  return state.activities.filter((item) => isImportantPeriod(item) && matchesQuickFilter(item) && item.date <= key && activityEndDate(item) >= key).sort(sortActivities);
}
function calendarItemsForDate(date) { return [...periodsForDate(date), ...activitiesForDate(date)]; }

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
    if (toISODate(date) === todayKey) cell.classList.add("today"); else if (isPastDay(date)) cell.classList.add("past-day");
    if (!isWithinConfiguredCalendar(date)) cell.classList.add("outside-calendar");
    if (isHoliday(date)) cell.classList.add("holiday");
    const dayItems = calendarItemsForDate(date); if (!dayItems.length) cell.classList.add("no-activity");
    const number = document.createElement("span"); number.className = "month-number"; number.textContent = date.getDate(); cell.append(number);
    if (isHoliday(date)) { const badge = document.createElement("span"); badge.className = "month-holiday"; badge.textContent = holidayLabel(date); cell.append(badge); }
    periodsForDate(date).forEach((item) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "month-event month-period";
      button.style.borderLeftColor = organizerColor(item.secretary);
      const badge = document.createElement("span"); badge.className = "month-period-label"; badge.textContent = periodTypeLabel(item);
      const statusBadge = document.createElement("span"); statusBadge.className = "month-period-status"; statusBadge.textContent = importantPeriodStatus(item);
      const title = document.createElement("strong"); title.textContent = item.name;
      button.append(badge, statusBadge, title);
      button.addEventListener("click", () => openDetail(item)); cell.append(button);
    });
    activitiesForDate(date).forEach((item) => {
      const button = document.createElement("button"); button.type = "button"; button.className = "month-event";
      button.style.borderLeftColor = organizerColor(item.secretary);
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
  const holidayDates = [];
  const datesWithActivities = [];
  for (let date = new Date(visibleStart); date <= visibleEnd; date = addDays(date, 1)) {
    if (date.getDay() !== 0 && isHoliday(date)) holidayDates.push(toISODate(date));
    if (date.getDay() !== 0 && calendarItemsForDate(date).length) datesWithActivities.push(toISODate(date));
  }
  const currentDate = toISODate(new Date()); const includeToday = currentDate >= toISODate(visibleStart) && currentDate <= toISODate(visibleEnd) && fromISODate(currentDate).getDay() !== 0;
  const dates = [...new Set([...datesWithActivities, ...holidayDates, ...(includeToday ? [currentDate] : [])])].sort();
  if (!dates.length) { const empty = document.createElement("p"); empty.className = "empty-day"; empty.textContent = "Sin actividades este mes"; mobileList.append(empty); }
  else dates.forEach((dateValue) => {
    const date = fromISODate(dateValue); const section = document.createElement("section"); section.className = "day-section"; if (isToday(date)) section.classList.add("today-day"); else if (isPastDay(date)) section.classList.add("past-day"); if (!isWithinConfiguredCalendar(date)) section.classList.add("outside-calendar-day");
    const list = document.createElement("div"); list.className = "day-list"; const items = calendarItemsForDate(date); items.forEach((item) => list.append(isImportantPeriod(item) ? createPeriodRow(item) : createActivityRow(item)));
    if (!items.length) { section.classList.add("empty-day-section"); if (isHoliday(date)) section.classList.add("holiday-day"); const empty = document.createElement("p"); empty.className = isHoliday(date) ? "holiday-empty" : "empty-day"; empty.textContent = isHoliday(date) ? `${holidayLabel(date)} · sin actividades` : !isWithinConfiguredCalendar(date) ? "Fuera del calendario" : "Sin actividades"; list.append(empty); }
    section.append(createDayHeading(date), list); mobileList.append(section);
  });
  agenda.append(calendar, mobileList);
}

function openDetail(item) {
  if (isImportantPeriod(item)) {
    el("detailDate").textContent = `${periodTypeLabel(item)} · ${dateRangeLabel(item)} · ${importantPeriodStatus(item)}`;
  } else {
    const stateText = isSuspended(item) ? " · Suspendida" : isPostponed(item) ? ` · Postergada · ${postponedDateLabel(item)}` : "";
    el("detailDate").textContent = `${dateRangeLabel(item)} · ${cleanTime(item.start_time)}–${cleanTime(item.end_time)}${stateText}`;
  }
  el("detailTitle").textContent = item.name; el("detailBody").replaceChildren(createDetailsContent(item, true)); detailDialog.showModal();
}

async function copyLink(url) { await copyText(url, "Enlace copiado"); }
function showToast(message) { const toast = el("toast"); toast.textContent = message; toast.hidden = false; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.hidden = true; }, 2200); }
function isSafeUrl(value) { if (!value) return false; try { return ["https:", "http:"].includes(new URL(value).protocol); } catch (_) { return false; } }

function populateCalendarYearOptions() {
  const select = el("calendarYear"); select.replaceChildren();
  for (let year = calendarFirstYear; year <= calendarLastYear; year += 1) { const option = document.createElement("option"); option.value = String(year); option.textContent = String(year); select.append(option); }
}
function calendarHolidaysText(year) {
  return [...(calendarConfigForYear(year)?.holidays || [])].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => {
    const date = fromISODate(entry.date); return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")} | ${entry.name || "Feriado"}`;
  }).join("\n");
}
function loadCalendarYearForm() {
  const year = Number(el("calendarYear").value); const configYear = calendarConfigForYear(year); if (!configYear) return;
  el("calendarYearStart").min = `${year}-01-01`; el("calendarYearStart").max = `${year}-12-31`;
  el("calendarYearEnd").min = `${year}-01-01`; el("calendarYearEnd").max = `${year}-12-31`;
  el("calendarYearStart").value = configYear.start; el("calendarYearEnd").value = configYear.end; el("calendarHolidays").value = calendarHolidaysText(year);
  el("calendarMessage").hidden = true;
}
function openCalendarForm() {
  if (!state.canEdit) return;
  const year = Math.min(calendarLastYear, Math.max(calendarFirstYear, state.cursor.getFullYear()));
  el("calendarYear").value = String(year); loadCalendarYearForm(); calendarDialog.showModal();
}
function parseCalendarHolidayLines(year, text) {
  const holidays = []; const seen = new Set(); const errors = [];
  String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((line, index) => {
    const match = line.match(/^(\d{1,2})\/(\d{1,2})(?:\s*\|\s*(.+))?$/);
    if (!match) { errors.push(`Línea ${index + 1}: usá DD/MM | Nombre.`); return; }
    const day = Number(match[1]); const month = Number(match[2]); const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) { errors.push(`Línea ${index + 1}: la fecha no es válida.`); return; }
    const iso = toISODate(date); if (seen.has(iso)) return; seen.add(iso); holidays.push({ date: iso, name: (match[3] || "Feriado").trim() || "Feriado" });
  });
  if (errors.length) throw new Error(errors[0]); return holidays.sort((a, b) => a.date.localeCompare(b.date));
}
async function saveCalendarConfig(event) {
  event.preventDefault(); if (!state.canEdit) return;
  const message = el("calendarMessage"); message.hidden = true;
  const year = Number(el("calendarYear").value); const start = el("calendarYearStart").value; const end = el("calendarYearEnd").value;
  try {
    if (!year || Number(start.slice(0, 4)) !== year || Number(end.slice(0, 4)) !== year) throw new Error("El inicio y el fin deben corresponder al año seleccionado.");
    if (end < start) throw new Error("La fecha de fin no puede ser anterior al inicio.");
    const holidays = parseCalendarHolidayLines(year, el("calendarHolidays").value);
    if (holidays.some((entry) => entry.date < start || entry.date > end)) throw new Error("Todos los feriados deben estar dentro del período habilitado del año.");
    const next = normalizeCalendarConfig(state.calendarConfig); next.years[String(year)] = { start, end, holidays };
    const button = el("saveCalendar"); button.disabled = true; button.textContent = "Guardando…";
    try {
      if (configured) {
        const batch = writeBatch(db); batch.set(doc(db, activitiesCollection, calendarConfigDocumentId), { record_kind: "calendar_config", date: `${calendarFirstYear}-01-01`, end_date: `${calendarLastYear}-12-31`, name: "Configuración del calendario", calendar_config: next, updated_at: serverTimestamp() }); await batch.commit();
      } else writeDemoCalendarConfig(next);
      state.calendarConfig = next; calendarDialog.close(); await loadPeriod(); showToast(`Calendario ${year} actualizado`);
    } finally { button.disabled = false; button.textContent = "Guardar calendario"; }
  } catch (error) { message.textContent = error?.message || "No se pudo actualizar el calendario."; message.hidden = false; }
}

function openActivityForm(item = null) {
  if (!state.canEdit) return; if (detailDialog.open) detailDialog.close();
  const editing = Boolean(item?.id);
  el("activityForm").reset(); el("formError").hidden = true; el("activityId").value = item?.id || ""; el("originalActivityName").value = item?.name || "";
  el("recordKind").value = isImportantPeriod(item) ? "period" : "activity";
  el("periodType").value = isImportantPeriod(item) ? periodTypeKey(item) : "inscriptions";
  el("originalActivityDate").value = item?.date || "";
  el("bulkEditField").hidden = !item?.id || isImportantPeriod(item); el("updateSameName").checked = false;
  const { start, end } = periodRange(); const today = localDate(new Date()); const defaultDate = today >= start && today <= end ? today : start;
  el("date").value = item?.date || toISODate(defaultDate); el("endDate").value = item?.end_date || item?.date || toISODate(defaultDate);
  el("startTime").value = cleanTime(item?.start_time) || "09:00"; el("endTime").value = cleanTime(item?.end_time) || "10:00";
  el("recurrence").value = "none"; el("recurrence").disabled = Boolean(item?.id); el("recurrenceField").hidden = Boolean(item?.id);
  el("repeatUntil").value = calendarConfigForYear((item?.date ? fromISODate(item.date) : defaultDate).getFullYear())?.end || toISODate(calendarMaxDate);
  el("activityStatus").value = item ? activityStatusKey(item) : "scheduled";
  el("postponedDate").value = item?.postponed_date || "";
  el("postponedDateTbd").checked = item?.postponed_date_tbd === true;
  const storedOrganizer = organizerName(item?.secretary);
  el("name").value = item?.name || "";
  if (secretaryOptions.includes(storedOrganizer)) { el("secretary").value = storedOrganizer; el("otherSecretary").value = ""; }
  else if (storedOrganizer) { el("secretary").value = "__other__"; el("otherSecretary").value = storedOrganizer; }
  else { el("secretary").value = ""; el("otherSecretary").value = ""; }
  toggleOtherSecretary(); el("responsible").value = item?.responsible || "";
  el("activityType").value = item ? activityTypeKey(item) : "presential";
  const preferredCategory = item ? activityCategoryKey(item) : "";
  const inferredCareer = item?.career || Object.keys(academicPlans).find((career) => allSubjectsForCareer(career).some((subject) => subjectBaseName(subject) === subjectBaseName(item?.subject))) || "";
  el("career").value = inferredCareer; updateAcademicFields(item?.subject || "", normalizeAcademicYear(item?.academic_year || inferAcademicYear(inferredCareer, item?.subject)), preferredCategory);
  const storedClassroom = item?.classroom === "Aula H" ? "Aula H (Magnita)" : item?.classroom || "";
  if (classroomOptions.includes(storedClassroom)) { el("classroom").value = storedClassroom; el("otherClassroom").value = ""; }
  else if (storedClassroom) { el("classroom").value = "__other__"; el("otherClassroom").value = storedClassroom; }
  else { el("classroom").value = ""; el("otherClassroom").value = ""; }
  toggleActivityTypeFields();
  el("platform").value = item?.platform || ""; el("accountUsed").value = item?.account_used || ""; el("meetingUrl").value = item?.meeting_url || ""; el("publicLink").checked = item?.link_is_public === true; el("moreInfoUrl").value = item?.more_info_url || "";
  el("requirements").value = [...new Set([item?.requirements, item?.period_description, item?.observations].filter(Boolean))].join(" · "); el("recordingRequired").checked = Boolean(item?.recording_required);
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
  const secretary = el("secretary").value === "__other__" ? el("otherSecretary").value.trim() : el("secretary").value;
  const academic = organizerName(secretary) === academicSecretary;
  const category = el("academicType").value;
  const detailedAcademic = academic && ["class", "exam"].includes(category);
  const recordKind = el("recordKind").value;
  if (recordKind === "period") {
    return { record_kind: "period", period_type: el("periodType").value, date: el("date").value, end_date: el("endDate").value, start_time: "", end_time: "", name: el("name").value.trim(), secretary, activity_category: "", academic_activity_type: "", career: "", academic_year: "", subject: "", responsible: "", classroom: "", activity_type: "", activity_status: "scheduled", postponed_date: "", postponed_date_tbd: false, platform: "", account_used: "", meeting_url: "", link_is_public: false, more_info_url: el("moreInfoUrl").value.trim(), requirements: el("requirements").value.trim(), observations: "", recording_required: false };
  }
  const classroom = el("activityType").value === "virtual" ? "" : el("classroom").value === "__other__" ? el("otherClassroom").value.trim() : el("classroom").value;
  const activityStatus = el("activityStatus").value || "scheduled";
  const postponedDateTbd = activityStatus === "postponed" && el("postponedDateTbd").checked;
  return { record_kind: "activity", date: el("date").value, end_date: el("endDate").value, start_time: el("startTime").value, end_time: el("endTime").value, name: el("name").value.trim(), secretary, activity_category: category, academic_activity_type: academic && ["class", "exam"].includes(category) ? category : "", career: detailedAcademic ? el("career").value : "", academic_year: detailedAcademic ? normalizeAcademicYear(el("academicYear").value) : "", subject: detailedAcademic ? el("subject").value : "", responsible: el("responsible").value.trim(), classroom, activity_type: category === "exam" ? "presential" : el("activityType").value, activity_status: activityStatus, postponed_date: activityStatus === "postponed" && !postponedDateTbd ? el("postponedDate").value : "", postponed_date_tbd: postponedDateTbd, platform: el("platform").value.trim(), account_used: el("accountUsed").value.trim(), meeting_url: el("meetingUrl").value.trim(), link_is_public: el("publicLink").checked, more_info_url: el("moreInfoUrl").value.trim(), requirements: el("requirements").value.trim(), observations: "", recording_required: el("recordingRequired").checked };
}

function validateActivity(payload) {
  if (fromISODate(payload.date) < calendarMinDate || fromISODate(payload.date) > calendarMaxDate) return `La agenda admite fechas entre ${calendarFirstYear} y ${calendarLastYear}.`;
  if (fromISODate(payload.end_date) < calendarMinDate || fromISODate(payload.end_date) > calendarMaxDate) return `La fecha final debe estar entre ${calendarFirstYear} y ${calendarLastYear}.`;
  if (!isWithinConfiguredCalendar(fromISODate(payload.date)) || !isWithinConfiguredCalendar(fromISODate(payload.end_date))) return "La fecha está fuera del período habilitado para ese año. Podés cambiarlo desde Actualizar calendario.";
  if (fromISODate(payload.end_date) < fromISODate(payload.date)) return "La fecha de finalización no puede ser anterior a la fecha de inicio.";
  if (!payload.secretary) return "Seleccioná quién organiza o completá el campo Otro organizador.";
  if (payload.more_info_url && !isSafeUrl(payload.more_info_url)) return "El enlace de más información debe comenzar con http:// o https://.";
  if (isImportantPeriod(payload)) {
    if (!payload.period_type) return "Seleccioná el tipo de fecha destacada.";
    return "";
  }
  if (fromISODate(payload.date).getDay() === 0) return "Los domingos no forman parte de esta agenda.";
  if (payload.activity_type !== "virtual" && !payload.classroom) return "Seleccioná un aula o completá el campo Otro lugar.";
  if (!payload.activity_category) return "Seleccioná el tipo de actividad.";
  if (["class", "exam"].includes(payload.activity_category) && (!payload.career || !payload.academic_year || !payload.subject)) return "Seleccioná la carrera, el año y la materia.";
  if (payload.end_time <= payload.start_time) return "La hora de finalización debe ser posterior a la de inicio.";
  if (payload.meeting_url && !isSafeUrl(payload.meeting_url)) return "El enlace debe comenzar con http:// o https://.";
  if (payload.link_is_public && !payload.meeting_url) return "Para publicar el enlace, primero completá el enlace de la actividad.";
  if (payload.activity_status === "postponed" && !payload.postponed_date_tbd && !payload.postponed_date) return "Indicá la nueva fecha o marcá Fecha a confirmar.";
  if (payload.activity_status === "postponed" && payload.postponed_date && fromISODate(payload.postponed_date) <= fromISODate(payload.date)) return "La nueva fecha de una actividad postergada debe ser posterior a la fecha original.";
  if (payload.postponed_date && !isWithinConfiguredCalendar(fromISODate(payload.postponed_date))) return "La nueva fecha está fuera del calendario habilitado para ese año.";
  if (el("recurrence").value !== "none" && fromISODate(el("repeatUntil").value) < fromISODate(payload.date)) return "La fecha final de repetición no puede ser anterior a la actividad.";
  return "";
}

function recurrenceRecords(payload) {
  if (isImportantPeriod(payload)) return [payload];
  const recurrence = el("recurrence").value; if (recurrence === "none") return [payload];
  const step = recurrence === "weekly" ? 7 : 14; const until = fromISODate(el("repeatUntil").value); const seriesId = crypto.randomUUID(); const records = [];
  const durationDays = Math.round((fromISODate(payload.end_date) - fromISODate(payload.date)) / 86400000);
  for (let date = fromISODate(payload.date); date <= until && date <= calendarMaxDate; date = addDays(date, step)) {
    const occurrenceEnd = addDays(date, durationDays);
    if (!isWithinConfiguredCalendar(date) || !isWithinConfiguredCalendar(occurrenceEnd)) continue;
    records.push({ ...payload, date: toISODate(date), end_date: toISODate(occurrenceEnd), series_id: seriesId });
  }
  return records;
}

async function saveActivity(event) {
  event.preventDefault(); if (!state.canEdit) return;
  const payload = activityPayload(); const id = el("activityId").value; const errorBox = el("formError"); const validationError = validateActivity(payload);
  if (validationError) { errorBox.textContent = validationError; errorBox.hidden = false; return; }
  const button = el("saveActivity"); button.disabled = true; button.textContent = "Guardando…";
  try {
    let successMessage = isImportantPeriod(payload) ? (id ? "Fecha destacada actualizada" : "Fecha destacada guardada") : (id ? "Actividad actualizada" : "Actividad guardada");
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
  finally { button.disabled = false; button.textContent = el("recordKind").value === "period" ? "Guardar fecha destacada" : "Guardar actividad"; }
}

function publicActivityData(payload) {
  const { account_used, recording_required, meeting_url, responsible, requirements, observations, ...publicData } = payload;
  const result = { ...publicData, link_is_public: payload.link_is_public === true, meeting_url: payload.link_is_public === true ? meeting_url : "" };
  if (isImportantPeriod(payload)) result.period_description = requirements || "";
  return result;
}

function publicActivityUpdate(payload) {
  return { ...publicActivityData(payload), period_description: isImportantPeriod(payload) ? (payload.requirements || "") : deleteField(), account_used: deleteField(), recording_required: deleteField(), responsible: deleteField(), requirements: deleteField(), observations: deleteField() };
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
      .filter((item) => isWithinConfiguredCalendar(fromISODate(item.date)) && fromISODate(item.date).getDay() !== 0)
      .map((item) => ({ ...item, end_date: activityEndDate(item) > toISODate(calendarMaxDate) ? toISODate(calendarMaxDate) : activityEndDate(item) }));
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
