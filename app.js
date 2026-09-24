import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, onAuthStateChanged, setPersistence, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { collection, deleteField, doc, getDocs, getFirestore, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const config = window.AGENDA_CONFIG || {};
const configured = Boolean(config.firebaseConfig?.apiKey);
const adminEmail = String(config.adminEmail || "").trim().toLowerCase();
const firebaseApp = configured ? initializeApp(config.firebaseConfig) : null;
const db = configured ? getFirestore(firebaseApp) : null;
const auth = configured ? getAuth(firebaseApp) : null;
const activitiesCollection = "actividades";
const privateActivitiesCollection = "actividades_privadas";
const locale = "es-AR";
const demoStorageKey = "agenda-hibrida-demo-firebase-v2";
const demoCalendarStorageKey = "agenda-calendario-config-v30";
const viewPreferencesStorageKey = "agenda-derecho-view-preferences-v1";
const calendarConfigDocumentId = "agenda_calendar_config";
const academicCalendarBulkMarker = "academic_calendar_2026_2027_loaded";
const academicCalendarCleanupMarker = "academic_calendar_cleanup_done";
const hibridacionesBulkMarker = "hibridaciones_2026_from_2026_08_16_loaded";
const gradeScheduleBulkMarker = "grade_schedule_2026_from_2026_08_16_loaded_v2";
const legalClinicsBulkMarker = "legal_clinics_2026_from_2026_08_16_loaded_v2";
const mediationCenterBulkMarker = "mediation_center_2026_from_2026_08_16_loaded";
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
const extensionSecretary = "Secretaría de Extensión, Vinculación y Territorio";
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
  ["service", "Servicio"],
  ["info_talk", "Charla informativa"],
  ["other", "Otro"]
];
const activityCategoryLabels = new Map([
  ["class", "Clase de grado"],
  ["open_class", "Clase abierta"],
  ["exam", "Examen final"],
  ["global_knowledge_exam", "Examen Global de Conocimientos"],
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
  ["info_talk", "Charla informativa"],
  ["legal_clinic", "Consultorio jurídico"],
  ["other", "Otro"]
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

const academicCalendarImportantDates = [
  { id: "calacad-2026-fin-cursado-segundo-semestre", period_type: "classes", date: "2026-11-06", end_date: "2026-11-06", name: "Fin del cursado · Segundo semestre 2026", description: "Último día de cursado del segundo semestre. Todas las cátedras deberán finalizar sus actividades evaluativas, incluidos los exámenes recuperatorios, dentro de esta fecha." },
  { id: "calacad-2026-inscripcion-mesas-agosto", period_type: "inscriptions", date: "2026-08-18", end_date: "2026-08-19", name: "Inscripción · Mesas de agosto 2026", description: "Inscripción a exámenes finales ordinarios del turno agosto 2026." },
  { id: "calacad-2026-mesas-agosto", period_type: "exam_tables", date: "2026-08-24", end_date: "2026-08-28", name: "Mesas de agosto 2026", description: "Turno ordinario de exámenes finales." },
  { id: "calacad-2026-suspension-clases-agosto", period_type: "suspension", date: "2026-08-24", end_date: "2026-08-28", name: "Suspensión del dictado de clases · Turno de agosto", description: "El dictado de clases se suspende durante este turno de exámenes finales por no contar con aulas disponibles para desarrollar ambas actividades simultáneamente." },
  { id: "calacad-2026-inscripcion-mesas-especiales-septiembre", period_type: "inscriptions", date: "2026-09-09", end_date: "2026-09-10", name: "Inscripción · Mesas especiales de septiembre 2026", description: "Inscripción al turno especial de exámenes finales de septiembre 2026." },
  { id: "calacad-2026-mesas-especiales-septiembre", period_type: "exam_tables", date: "2026-09-14", end_date: "2026-09-16", name: "Mesas especiales de septiembre 2026", description: "Turno especial de exámenes finales. Sin suspensión de clases." },
  { id: "calacad-2026-inscripcion-mesas-octubre", period_type: "inscriptions", date: "2026-10-07", end_date: "2026-10-08", name: "Inscripción · Mesas de octubre 2026", description: "Inscripción a exámenes finales ordinarios del turno octubre 2026." },
  { id: "calacad-2026-mesas-octubre", period_type: "exam_tables", date: "2026-10-13", end_date: "2026-10-19", name: "Mesas de octubre 2026", description: "Turno ordinario de exámenes finales." },
  { id: "calacad-2026-suspension-clases-octubre", period_type: "suspension", date: "2026-10-13", end_date: "2026-10-19", name: "Suspensión del dictado de clases · Turno de octubre", description: "El dictado de clases se suspende durante este turno de exámenes finales por no contar con aulas disponibles para desarrollar ambas actividades simultáneamente." },
  { id: "calacad-2026-cierre-regularidades-segundo-semestre", period_type: "academic_closure", date: "2026-11-02", end_date: "2026-11-06", name: "Cierre de regularidades y carga en SIU-Guaraní · Segundo semestre", description: "Durante este período no se pueden tomar evaluaciones." },
  { id: "calacad-2026-inscripcion-mesas-noviembre", period_type: "inscriptions", date: "2026-11-10", end_date: "2026-11-11", name: "Inscripción · Mesas de noviembre 2026", description: "Inscripción a exámenes finales ordinarios del turno noviembre 2026." },
  { id: "calacad-2026-mesas-noviembre", period_type: "exam_tables", date: "2026-11-13", end_date: "2026-11-19", name: "Mesas de noviembre 2026", description: "Turno ordinario de exámenes finales." },
  { id: "calacad-2026-inscripcion-mesas-diciembre", period_type: "inscriptions", date: "2026-12-09", end_date: "2026-12-10", name: "Inscripción · Mesas de diciembre 2026", description: "Inscripción a exámenes finales ordinarios del turno diciembre 2026." },
  { id: "calacad-2026-mesas-diciembre", period_type: "exam_tables", date: "2026-12-14", end_date: "2026-12-18", name: "Mesas de diciembre 2026", description: "Turno ordinario de exámenes finales." },
  { id: "calacad-2026-receso-estival", period_type: "recess", date: "2026-12-28", end_date: "2027-01-31", name: "Receso estival 2026–2027", description: "Dada la fecha programada para los exámenes finales del turno febrero 2027, los docentes deberán retomar las consultas a partir del 1 de febrero de 2027." },
  { id: "calacad-2027-inscripcion-mesas-febrero", period_type: "inscriptions", date: "2027-02-03", end_date: "2027-02-04", name: "Inscripción · Mesas de febrero 2027", description: "Inscripción a exámenes finales ordinarios del turno febrero 2027." },
  { id: "calacad-2027-mesas-febrero", period_type: "exam_tables", date: "2027-02-08", end_date: "2027-02-12", name: "Mesas de febrero 2027", description: "Turno ordinario de exámenes finales." },
  { id: "calacad-2027-inscripcion-mesas-marzo", period_type: "inscriptions", date: "2027-03-10", end_date: "2027-03-11", name: "Inscripción · Mesas de marzo 2027", description: "Inscripción a exámenes finales ordinarios del turno marzo 2027." },
  { id: "calacad-2027-mesas-marzo", period_type: "exam_tables", date: "2027-03-15", end_date: "2027-03-19", name: "Mesas de marzo 2027", description: "Turno ordinario de exámenes finales." }
];

const hibridaciones2026FromAugust16 = [{"record_kind":"activity","date":"2026-08-19","end_date":"2026-08-19","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-08-19"},{"record_kind":"activity","date":"2026-08-19","end_date":"2026-08-19","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-08-19"},{"record_kind":"activity","date":"2026-08-21","end_date":"2026-08-21","start_time":"08:30","end_time":"19:00","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"3aeufdfcc27amdd9auk0ctln0u@google.com-2026-08-21"},{"record_kind":"activity","date":"2026-08-21","end_date":"2026-08-21","start_time":"15:00","end_time":"20:00","name":"Diplomatura en Mediación","secretary":"Secretaría de Posgrado","activity_category":"diploma","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"","account_used":"mediacion@derecho.uncu.edu.arcontraseña","meeting_url":"","link_is_public":false,"more_info_url":"","requirements":"Con la cuenta mediacion@derecho.uncu.edu.arcontraseña: +mediacion2023+","observations":"","recording_required":false,"source_uid":"6lsvv153dnacfdcm789c2hejp4@google.com-2026-08-21"},{"record_kind":"activity","date":"2026-08-22","end_date":"2026-08-22","start_time":"08:30","end_time":"13:30","name":"Diplomatura en Mediación","secretary":"Secretaría de Posgrado","activity_category":"diploma","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"","account_used":"mediacion@derecho.uncu.edu.arcontraseña","meeting_url":"","link_is_public":false,"more_info_url":"","requirements":"Con la cuenta mediacion@derecho.uncu.edu.arcontraseña: +mediacion2023+","observations":"","recording_required":false,"source_uid":"36hnpjk1jmqtk9jju30atanmim@google.com-2026-08-22"},{"record_kind":"activity","date":"2026-08-26","end_date":"2026-08-26","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-08-26"},{"record_kind":"activity","date":"2026-08-26","end_date":"2026-08-26","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-08-26"},{"record_kind":"activity","date":"2026-08-28","end_date":"2026-08-28","start_time":"15:00","end_time":"19:00","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"6bk9vkbckqss37etach3l9md3l@google.com-2026-08-28"},{"record_kind":"activity","date":"2026-08-29","end_date":"2026-08-29","start_time":"08:30","end_time":"12:30","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"4fpnrfb73j3c00l3dtufkdove4@google.com-2026-08-29"},{"record_kind":"activity","date":"2026-09-02","end_date":"2026-09-02","start_time":"09:00","end_time":"20:00","name":"Congreso de Derechos Humanos e Internacional","secretary":"","activity_category":"congress","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula H","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/hnj-zptj-pef","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nhttps://meet.google.com/hnj-zptj-pef\nMiércoles 2 de septiembre 9 a 20 - Aula H\nJueves 3 de septiembre 14.30 a 20 - Aula Magna","observations":"","recording_required":false,"source_uid":"1ebs2juj6tp6erfgd1dcqtspod@google.com-2026-09-02-a"},{"record_kind":"activity","date":"2026-09-03","end_date":"2026-09-03","start_time":"14:30","end_time":"20:00","name":"Congreso de Derechos Humanos e Internacional","secretary":"","activity_category":"congress","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula Magna","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/hnj-zptj-pef","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nhttps://meet.google.com/hnj-zptj-pef\nMiércoles 2 de septiembre 9 a 20 - Aula H\nJueves 3 de septiembre 14.30 a 20 - Aula Magna","observations":"","recording_required":false,"source_uid":"1ebs2juj6tp6erfgd1dcqtspod@google.com-2026-09-03-b"},{"record_kind":"activity","date":"2026-09-02","end_date":"2026-09-02","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-09-02"},{"record_kind":"activity","date":"2026-09-02","end_date":"2026-09-02","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-09-02"},{"record_kind":"activity","date":"2026-09-02","end_date":"2026-09-02","start_time":"16:00","end_time":"19:00","name":"Jornada Ley 9715: el nuevo desalojo monitorio de viviendas sociales del IPV","secretary":"","activity_category":"days","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/udw-otwn-rpt","link_is_public":false,"more_info_url":"","requirements":"Cuanta: facultad@derecho.uncu.edu.ar\nJornada Ley 9715: el nuevo desalojo monitorio de viviendas sociales del IPV\nhttps://meet.google.com/udw-otwn-rpt","observations":"","recording_required":false,"source_uid":"49ij6fj6svgcgt9lu3nea8kj5q@google.com-2026-09-02"},{"record_kind":"activity","date":"2026-09-04","end_date":"2026-09-04","start_time":"15:00","end_time":"20:00","name":"Diplomatura en Mediación","secretary":"Secretaría de Posgrado","activity_category":"diploma","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"","account_used":"mediacion@derecho.uncu.edu.arcontraseña","meeting_url":"","link_is_public":false,"more_info_url":"","requirements":"Con la cuenta mediacion@derecho.uncu.edu.arcontraseña: +mediacion2023+","observations":"","recording_required":false,"source_uid":"532ekgf20es94d9t25jajgaic6@google.com-2026-09-04"},{"record_kind":"activity","date":"2026-09-05","end_date":"2026-09-05","start_time":"08:30","end_time":"13:30","name":"Diplomatura en Mediación","secretary":"Secretaría de Posgrado","activity_category":"diploma","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"","account_used":"mediacion@derecho.uncu.edu.arcontraseña","meeting_url":"","link_is_public":false,"more_info_url":"","requirements":"Con la cuenta mediacion@derecho.uncu.edu.arcontraseña: +mediacion2023+","observations":"","recording_required":false,"source_uid":"7cbbcts3pboo4ntl7q1djes0f5@google.com-2026-09-05"},{"record_kind":"activity","date":"2026-09-08","end_date":"2026-09-08","start_time":"14:00","end_time":"15:00","name":"Grabación asamblea aula H Irene","secretary":"","activity_category":"service","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"","account_used":"","meeting_url":"","link_is_public":false,"more_info_url":"","requirements":"","observations":"","recording_required":false,"source_uid":"2v4h5pn3msomillkkmc1kp4seq@google.com-2026-09-08"},{"record_kind":"activity","date":"2026-09-09","end_date":"2026-09-09","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-09-09"},{"record_kind":"activity","date":"2026-09-09","end_date":"2026-09-09","start_time":"14:30","end_time":"16:10","name":"Clase Abierta Derecho Procesal Penal - Clase abierta: aportes de la genética forense en la investigación penal","secretary":"Secretaría Académica","activity_category":"open_class","academic_activity_type":"open_class","career":"Abogacía","academic_year":"","subject":"","responsible":"","classroom":"Aula C","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/nfm-vhbc-jue","link_is_public":false,"more_info_url":"","requirements":"Cuenta: facultad@derecho.uncu.edu.ar\nClase Abierta Derecho Procesal Penal\nMiércoles, 9 septiembre · 2:30 – 4:10pm\nVínculo a la videollamada: https://meet.google.com/nfm-vhbc-jue","observations":"","recording_required":false,"source_uid":"4k9ispsqg327of170nck189qsm@google.com-2026-09-09"},{"record_kind":"activity","date":"2026-09-09","end_date":"2026-09-09","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-09-09"},{"record_kind":"activity","date":"2026-09-09","end_date":"2026-09-09","start_time":"17:00","end_time":"19:00","name":"Conjuntos inmobiliarios sin fines residenciales: Análisis, desafío y propuestas","secretary":"","activity_category":"other","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula H","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/jhh-mwzj-yuu","link_is_public":false,"more_info_url":"","requirements":"Cuanta facultad@derecho.uncu.edu.ar\nhttps://meet.google.com/jhh-mwzj-yuu","observations":"","recording_required":false,"source_uid":"5s5msgs63kooodnjfhf1aiciha@google.com-2026-09-09"},{"record_kind":"activity","date":"2026-09-11","end_date":"2026-09-11","start_time":"08:30","end_time":"19:00","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"5ett2qmlaernvhp8su2bmecr43@google.com-2026-09-11"},{"record_kind":"activity","date":"2026-09-12","end_date":"2026-09-12","start_time":"08:30","end_time":"12:30","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"01i12as0hb5o0242pnijdbncl3@google.com-2026-09-12"},{"record_kind":"activity","date":"2026-09-16","end_date":"2026-09-16","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-09-16"},{"record_kind":"activity","date":"2026-09-16","end_date":"2026-09-16","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-09-16"},{"record_kind":"activity","date":"2026-09-23","end_date":"2026-09-23","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-09-23"},{"record_kind":"activity","date":"2026-09-23","end_date":"2026-09-23","start_time":"15:30","end_time":"19:00","name":"Seminario de Posgrado en Contrataciones Públicas","secretary":"Secretaría de Posgrado","activity_category":"seminar","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"posgradoderechouncuyo@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/iqb-qnfs-xfd","link_is_public":false,"more_info_url":"","requirements":"Cuenta posgradoderechouncuyo@derecho.uncu.edu.ar contraseña: administrativo2024+++ \nhttps://meet.google.com/iqb-qnfs-xfd","observations":"","recording_required":false,"source_uid":"1iisaa8lso89plrgih0gasfp6r@google.com-2026-09-23"},{"record_kind":"activity","date":"2026-09-23","end_date":"2026-09-23","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-09-23"},{"record_kind":"activity","date":"2026-09-25","end_date":"2026-09-25","start_time":"15:00","end_time":"19:00","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"60504lo570gkr6o7tcn0i5mpa5@google.com-2026-09-25"},{"record_kind":"activity","date":"2026-09-26","end_date":"2026-09-26","start_time":"08:30","end_time":"12:30","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"3sldgvf1c8o3mp0m740hptb85k@google.com-2026-09-26"},{"record_kind":"activity","date":"2026-09-30","end_date":"2026-09-30","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-09-30"},{"record_kind":"activity","date":"2026-09-30","end_date":"2026-09-30","start_time":"15:30","end_time":"19:00","name":"Seminario de Posgrado en Contrataciones Públicas","secretary":"Secretaría de Posgrado","activity_category":"seminar","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"posgradoderechouncuyo@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/iqb-qnfs-xfd","link_is_public":false,"more_info_url":"","requirements":"Cuenta posgradoderechouncuyo@derecho.uncu.edu.ar contraseña: administrativo2024+++ \nhttps://meet.google.com/iqb-qnfs-xfd","observations":"","recording_required":false,"source_uid":"1iisaa8lso89plrgih0gasfp6r@google.com-2026-09-30"},{"record_kind":"activity","date":"2026-09-30","end_date":"2026-09-30","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-09-30"},{"record_kind":"activity","date":"2026-10-07","end_date":"2026-10-07","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-10-07"},{"record_kind":"activity","date":"2026-10-07","end_date":"2026-10-07","start_time":"15:30","end_time":"19:00","name":"Seminario de Posgrado en Contrataciones Públicas","secretary":"Secretaría de Posgrado","activity_category":"seminar","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"posgradoderechouncuyo@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/iqb-qnfs-xfd","link_is_public":false,"more_info_url":"","requirements":"Cuenta posgradoderechouncuyo@derecho.uncu.edu.ar contraseña: administrativo2024+++ \nhttps://meet.google.com/iqb-qnfs-xfd","observations":"","recording_required":false,"source_uid":"1iisaa8lso89plrgih0gasfp6r@google.com-2026-10-07"},{"record_kind":"activity","date":"2026-10-07","end_date":"2026-10-07","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-10-07"},{"record_kind":"activity","date":"2026-10-14","end_date":"2026-10-14","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-10-14"},{"record_kind":"activity","date":"2026-10-14","end_date":"2026-10-14","start_time":"15:30","end_time":"19:00","name":"Seminario de Posgrado en Contrataciones Públicas","secretary":"Secretaría de Posgrado","activity_category":"seminar","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"posgradoderechouncuyo@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/iqb-qnfs-xfd","link_is_public":false,"more_info_url":"","requirements":"Cuenta posgradoderechouncuyo@derecho.uncu.edu.ar contraseña: administrativo2024+++ \nhttps://meet.google.com/iqb-qnfs-xfd","observations":"","recording_required":false,"source_uid":"1iisaa8lso89plrgih0gasfp6r@google.com-2026-10-14"},{"record_kind":"activity","date":"2026-10-14","end_date":"2026-10-14","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-10-14"},{"record_kind":"activity","date":"2026-10-16","end_date":"2026-10-16","start_time":"08:30","end_time":"19:00","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"7epdec0qsjurb45nsbi3pb6h0t@google.com-2026-10-16"},{"record_kind":"activity","date":"2026-10-17","end_date":"2026-10-17","start_time":"08:30","end_time":"12:30","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"7tr8ldnig9hfklfjulsv5edo34@google.com-2026-10-17"},{"record_kind":"activity","date":"2026-10-21","end_date":"2026-10-21","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-10-21"},{"record_kind":"activity","date":"2026-10-21","end_date":"2026-10-21","start_time":"15:30","end_time":"19:00","name":"Seminario de Posgrado en Contrataciones Públicas","secretary":"Secretaría de Posgrado","activity_category":"seminar","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"posgradoderechouncuyo@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/iqb-qnfs-xfd","link_is_public":false,"more_info_url":"","requirements":"Cuenta posgradoderechouncuyo@derecho.uncu.edu.ar contraseña: administrativo2024+++ \nhttps://meet.google.com/iqb-qnfs-xfd","observations":"","recording_required":false,"source_uid":"1iisaa8lso89plrgih0gasfp6r@google.com-2026-10-21"},{"record_kind":"activity","date":"2026-10-21","end_date":"2026-10-21","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-10-21"},{"record_kind":"activity","date":"2026-10-28","end_date":"2026-10-28","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-10-28"},{"record_kind":"activity","date":"2026-10-28","end_date":"2026-10-28","start_time":"15:30","end_time":"19:00","name":"Seminario de Posgrado en Contrataciones Públicas","secretary":"Secretaría de Posgrado","activity_category":"seminar","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"posgradoderechouncuyo@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/iqb-qnfs-xfd","link_is_public":false,"more_info_url":"","requirements":"Cuenta posgradoderechouncuyo@derecho.uncu.edu.ar contraseña: administrativo2024+++ \nhttps://meet.google.com/iqb-qnfs-xfd","observations":"","recording_required":false,"source_uid":"1iisaa8lso89plrgih0gasfp6r@google.com-2026-10-28"},{"record_kind":"activity","date":"2026-10-28","end_date":"2026-10-28","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-10-28"},{"record_kind":"activity","date":"2026-10-30","end_date":"2026-10-30","start_time":"08:30","end_time":"19:00","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"02dumj6a3mhpa5dffihmfkgeg0@google.com-2026-10-30"},{"record_kind":"activity","date":"2026-10-31","end_date":"2026-10-31","start_time":"08:30","end_time":"12:30","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"1jdfhufduscernpe54sdovetvc@google.com-2026-10-31"},{"record_kind":"activity","date":"2026-11-04","end_date":"2026-11-04","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-11-04"},{"record_kind":"activity","date":"2026-11-04","end_date":"2026-11-04","start_time":"15:30","end_time":"19:00","name":"Seminario de Posgrado en Contrataciones Públicas","secretary":"Secretaría de Posgrado","activity_category":"seminar","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"posgradoderechouncuyo@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/iqb-qnfs-xfd","link_is_public":false,"more_info_url":"","requirements":"Cuenta posgradoderechouncuyo@derecho.uncu.edu.ar contraseña: administrativo2024+++ \nhttps://meet.google.com/iqb-qnfs-xfd","observations":"","recording_required":false,"source_uid":"1iisaa8lso89plrgih0gasfp6r@google.com-2026-11-04"},{"record_kind":"activity","date":"2026-11-04","end_date":"2026-11-04","start_time":"16:00","end_time":"18:00","name":"Derecho Público y Provincial","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho Público Provincial y Municipal","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/tau-ykap-uuj","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho.uncu.edu.ar\nDerecho Público y Provincial\nMiércoles · 4:00 – 6:10pm\nInformación para unirse a la reunión de Google Meet\nVínculo a la videollamada: https://meet.google.com/tau-ykap-uuj","observations":"","recording_required":false,"source_uid":"7ku60us1o8tujgf0fksug707tu@google.com-2026-11-04"},{"record_kind":"activity","date":"2026-11-11","end_date":"2026-11-11","start_time":"14:00","end_time":"16:00","name":"Derecho del Transporte","secretary":"Secretaría Académica","activity_category":"class","academic_activity_type":"class","career":"Abogacía","academic_year":"Optativa","subject":"Derecho del Transporte","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"facultad@derecho","meeting_url":"https://meet.google.com/bne-fqho-fix","link_is_public":false,"more_info_url":"","requirements":"Cuenta facultad@derecho \nhttps://meet.google.com/bne-fqho-fix","observations":"","recording_required":false,"source_uid":"2bc5qb1mvgu77dtnp1plveup3l@google.com-2026-11-11"},{"record_kind":"activity","date":"2026-11-11","end_date":"2026-11-11","start_time":"15:30","end_time":"19:00","name":"Seminario de Posgrado en Contrataciones Públicas","secretary":"Secretaría de Posgrado","activity_category":"seminar","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"posgradoderechouncuyo@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/iqb-qnfs-xfd","link_is_public":false,"more_info_url":"","requirements":"Cuenta posgradoderechouncuyo@derecho.uncu.edu.ar contraseña: administrativo2024+++ \nhttps://meet.google.com/iqb-qnfs-xfd","observations":"","recording_required":false,"source_uid":"1iisaa8lso89plrgih0gasfp6r@google.com-2026-11-11"},{"record_kind":"activity","date":"2026-11-13","end_date":"2026-11-13","start_time":"08:30","end_time":"19:00","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"3ov8v0l5o8or4eus9oi3or8qdc@google.com-2026-11-13"},{"record_kind":"activity","date":"2026-11-14","end_date":"2026-11-14","start_time":"08:30","end_time":"12:30","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"7jbgtm3v0dolfeo8o7bpjbq4gn@google.com-2026-11-14"},{"record_kind":"activity","date":"2026-11-18","end_date":"2026-11-18","start_time":"15:30","end_time":"19:00","name":"Seminario de Posgrado en Contrataciones Públicas","secretary":"Secretaría de Posgrado","activity_category":"seminar","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Google Meet","account_used":"posgradoderechouncuyo@derecho.uncu.edu.ar","meeting_url":"https://meet.google.com/iqb-qnfs-xfd","link_is_public":false,"more_info_url":"","requirements":"Cuenta posgradoderechouncuyo@derecho.uncu.edu.ar contraseña: administrativo2024+++ \nhttps://meet.google.com/iqb-qnfs-xfd","observations":"","recording_required":false,"source_uid":"1iisaa8lso89plrgih0gasfp6r@google.com-2026-11-18"},{"record_kind":"activity","date":"2026-11-27","end_date":"2026-11-27","start_time":"15:00","end_time":"19:00","name":"Maestría en Derecho del Trabajo","secretary":"Secretaría de Posgrado","activity_category":"masters","academic_activity_type":"","career":"","academic_year":"","subject":"","responsible":"","classroom":"Aula L","activity_type":"hybrid","activity_status":"scheduled","postponed_date":"","postponed_date_tbd":false,"platform":"Zoom","account_used":"zoomposgradoderecho@gmail.com","meeting_url":"https://us06web.zoom.us/j/86969228525","link_is_public":false,"more_info_url":"","requirements":"por la cuenta de zoom:zoomposgradoderecho@gmail.com \nFacultad de Derecho UNCuyo le está invitando a una reunión de Zoom programada.\nTema: Especialización y Maestría en Derecho de las Familias\nHora: Este es una reunión recurrente Reunirse en cualquier momento\nÚnase a la reunión de Zoom\nhttps://us06web.zoom.us/j/86969228525","observations":"","recording_required":false,"source_uid":"6v968tvdpdqlh6oj6oq620e35h@google.com-2026-11-27"}];


const gradeSchedule2026Weekly = [{"id":"1tm-lun-historia","weekday":"MO","start_time":"08:45","end_time":"10:10","subject":"Historia de las Instituciones Argentinas y Latinoamericanas · TM","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tm-lun-politico","weekday":"MO","start_time":"10:15","end_time":"12:25","subject":"Derecho Político · TM","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tm-mar-politico","weekday":"TU","start_time":"08:45","end_time":"10:10","subject":"Derecho Político · TM","academic_year":"Primer año","classroom":"","activity_type":"virtual"},{"id":"1tm-mar-civil","weekday":"TU","start_time":"12:30","end_time":"13:55","subject":"Derecho Civil · TM","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tm-mie-historia","weekday":"WE","start_time":"08:45","end_time":"10:55","subject":"Historia de las Instituciones Argentinas y Latinoamericanas · TM","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tm-mie-civil","weekday":"WE","start_time":"11:00","end_time":"12:25","subject":"Derecho Civil · TM","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tt-lun-politico","weekday":"MO","start_time":"16:15","end_time":"18:25","subject":"Derecho Político · TT","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tt-lun-civil","weekday":"MO","start_time":"18:30","end_time":"19:55","subject":"Derecho Civil · TT","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tt-mar-politico","weekday":"TU","start_time":"17:00","end_time":"18:25","subject":"Derecho Político · TT","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tt-mar-civil","weekday":"TU","start_time":"18:30","end_time":"19:55","subject":"Derecho Civil · TT","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tt-mie-historia","weekday":"WE","start_time":"16:15","end_time":"18:25","subject":"Historia de las Instituciones Argentinas y Latinoamericanas · TT","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tt-mie-civil","weekday":"WE","start_time":"18:30","end_time":"19:55","subject":"Derecho Civil · TT","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"2tm-lun-obligaciones","weekday":"MO","start_time":"09:30","end_time":"10:55","subject":"Derecho de las Obligaciones II · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"2tm-lun-consumidor","weekday":"MO","start_time":"11:00","end_time":"13:10","subject":"Derecho del Consumidor y Defensa de la Competencia · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"2tm-lun-penal","weekday":"MO","start_time":"13:15","end_time":"15:25","subject":"Derecho Penal Parte General II · TM","academic_year":"Segundo año","classroom":"Aula F","activity_type":"presential"},{"id":"2tm-mar-finanzas","weekday":"TU","start_time":"08:00","end_time":"09:25","subject":"Finanzas Públicas y Derecho Tributario · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"2tm-mar-ingles3","weekday":"TU","start_time":"09:30","end_time":"10:55","subject":"Inglés III · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"2tm-mar-obligaciones","weekday":"TU","start_time":"11:00","end_time":"12:25","subject":"Derecho de las Obligaciones II · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"2tm-mar-penal","weekday":"TU","start_time":"12:30","end_time":"13:55","subject":"Derecho Penal Parte General II · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"2tm-mie-finanzas","weekday":"WE","start_time":"08:00","end_time":"10:10","subject":"Finanzas Públicas y Derecho Tributario · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"2tm-mie-pps2","weekday":"WE","start_time":"10:15","end_time":"12:25","subject":"Práctica Profesional Supervisada II · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"3-lun-comercial2","weekday":"MO","start_time":"14:45","end_time":"16:10","subject":"Derecho Comercial y Societario II","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"3-lun-contratos2","weekday":"MO","start_time":"16:15","end_time":"17:40","subject":"Contratos Civiles y Comerciales II","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"3-lun-pps4","weekday":"MO","start_time":"17:45","end_time":"19:55","subject":"Práctica Profesional Supervisada IV","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"3-mar-contratos2","weekday":"TU","start_time":"16:15","end_time":"17:40","subject":"Contratos Civiles y Comerciales II","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"3-mar-mediacion1","weekday":"TU","start_time":"17:45","end_time":"19:55","subject":"Mediación I","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"3-mie-penal-especial2","weekday":"WE","start_time":"16:15","end_time":"17:40","subject":"Derecho Penal Parte Especial II","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"3-mie-filosofia","weekday":"WE","start_time":"17:45","end_time":"19:55","subject":"Filosofía del Derecho","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"opt-mar-salud","weekday":"TU","start_time":"14:00","end_time":"16:10","subject":"Derecho de la Salud y Responsabilidad Médica","academic_year":"Optativa","classroom":"Aula C","activity_type":"presential"},{"id":"opt-mie-criminologia","weekday":"WE","start_time":"14:00","end_time":"16:10","subject":"Criminología","academic_year":"Optativa","classroom":"Aula E","activity_type":"presential"},{"id":"opt-mie-transporte","weekday":"WE","start_time":"14:00","end_time":"16:10","subject":"Derecho del Transporte","academic_year":"Optativa","classroom":"Aula K","activity_type":"hybrid"},{"id":"opt-mie-publico-prov","weekday":"WE","start_time":"16:00","end_time":"18:10","subject":"Derecho Público Provincial y Municipal","academic_year":"Optativa","classroom":"Aula K","activity_type":"hybrid"},{"id":"4-lun-familias","weekday":"MO","start_time":"14:45","end_time":"16:55","subject":"Derecho de las Familias","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"4-lun-procesal-esp","weekday":"MO","start_time":"17:00","end_time":"19:10","subject":"Derecho Procesal Civil y Comercial. Parte Especial","academic_year":"Cuarto año","classroom":"Aula F","activity_type":"presential"},{"id":"4-lun-concursal","weekday":"MO","start_time":"19:15","end_time":"20:40","subject":"Derecho Concursal","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"4-mar-metodologia1","weekday":"TU","start_time":"16:15","end_time":"17:40","subject":"Metodología de la Investigación I","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"4-mar-familias","weekday":"TU","start_time":"17:45","end_time":"19:10","subject":"Derecho de las Familias","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"4-mar-concursal","weekday":"TU","start_time":"19:15","end_time":"20:40","subject":"Derecho Concursal","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"4-mie-ddhh","weekday":"WE","start_time":"14:45","end_time":"16:55","subject":"Derechos Humanos","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"4-mie-reales2","weekday":"WE","start_time":"17:00","end_time":"18:25","subject":"Derechos Reales II","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"4-mie-procesal-esp","weekday":"WE","start_time":"18:30","end_time":"19:55","subject":"Derecho Procesal Civil y Comercial. Parte Especial","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"opt-mar-aduanero","weekday":"TU","start_time":"14:00","end_time":"16:10","subject":"Derecho Aduanero","academic_year":"Optativa","classroom":"Aula K","activity_type":"presential"},{"id":"opt-mar-prop-horiz","weekday":"TU","start_time":"14:00","end_time":"16:10","subject":"Propiedad Horizontal y Conjuntos Inmobiliarios","academic_year":"Optativa","classroom":"Aula J","activity_type":"presential"},{"id":"opt-mar-proc-const","weekday":"TU","start_time":"14:00","end_time":"16:10","subject":"Derecho Procesal Constitucional","academic_year":"Optativa","classroom":"Aula D","activity_type":"presential"},{"id":"opt-mar-informatico","weekday":"TU","start_time":"14:00","end_time":"16:10","subject":"Derecho Informático","academic_year":"Optativa","classroom":"Aula M","activity_type":"presential"},{"id":"opt-mar-bancario","weekday":"TU","start_time":"14:00","end_time":"16:10","subject":"Derecho Bancario Bursátil y Seguros","academic_year":"Optativa","classroom":"Aula E","activity_type":"presential"},{"id":"5-lun-rec-naturales","weekday":"MO","start_time":"14:45","end_time":"16:55","subject":"Derecho de los Recursos Naturales, Aguas; y Protección del Medio Ambiente","academic_year":"Quinto año","classroom":"Aula C","activity_type":"presential"},{"id":"5-lun-adm2","weekday":"MO","start_time":"17:00","end_time":"18:25","subject":"Derecho Administrativo II","academic_year":"Quinto año","classroom":"Aula C","activity_type":"presential"},{"id":"5-mar-pps8","weekday":"TU","start_time":"14:00","end_time":"15:25","subject":"Práctica Profesional Supervisada VIII","academic_year":"Quinto año","classroom":"Aula L","activity_type":"presential"},{"id":"5-mar-int-priv","weekday":"TU","start_time":"15:30","end_time":"16:55","subject":"Derecho Internacional Privado","academic_year":"Quinto año","classroom":"Aula A","activity_type":"presential"},{"id":"5-mar-proc-penal2","weekday":"TU","start_time":"17:00","end_time":"19:10","subject":"Derecho Procesal Penal II","academic_year":"Quinto año","classroom":"Aula C","activity_type":"presential"},{"id":"5-mar-metodologia2","weekday":"TU","start_time":"19:15","end_time":"20:40","subject":"Metodología de la Investigación II","academic_year":"Quinto año","classroom":"Aula C","activity_type":"presential"},{"id":"5-mie-proc-penal2","weekday":"WE","start_time":"14:45","end_time":"16:10","subject":"Derecho Procesal Penal II","academic_year":"Quinto año","classroom":"Aula C","activity_type":"presential"},{"id":"5-mie-int-priv","weekday":"WE","start_time":"16:15","end_time":"18:25","subject":"Derecho Internacional Privado","academic_year":"Quinto año","classroom":"Aula F","activity_type":"presential"},{"id":"5-mie-rec-naturales","weekday":"WE","start_time":"18:30","end_time":"19:55","subject":"Derecho de los Recursos Naturales, Aguas; y Protección del Medio Ambiente","academic_year":"Quinto año","classroom":"Aula C","activity_type":"presential"},{"id":"1tm-jue-ingles1","weekday":"TH","start_time":"08:45","end_time":"10:55","subject":"Inglés I · TM","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tm-jue-civil","weekday":"TH","start_time":"11:00","end_time":"12:25","subject":"Derecho Civil · TM","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tt-jue-ingles1","weekday":"TH","start_time":"16:15","end_time":"18:25","subject":"Inglés I · TT","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"1tt-jue-historia","weekday":"TH","start_time":"18:30","end_time":"19:55","subject":"Historia de las Instituciones Argentinas y Latinoamericanas · TT","academic_year":"Primer año","classroom":"Aula A","activity_type":"presential"},{"id":"2tm-jue-ingles3","weekday":"TH","start_time":"09:30","end_time":"10:55","subject":"Inglés III · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"2tm-jue-consumidor","weekday":"TH","start_time":"11:00","end_time":"12:25","subject":"Derecho del Consumidor y Defensa de la Competencia · TM","academic_year":"Segundo año","classroom":"Aula B","activity_type":"presential"},{"id":"3-jue-penal-especial2","weekday":"TH","start_time":"15:30","end_time":"16:55","subject":"Derecho Penal Parte Especial II","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"3-jue-comercial2","weekday":"TH","start_time":"17:00","end_time":"18:25","subject":"Derecho Comercial y Societario II","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"3-jue-filosofia","weekday":"TH","start_time":"18:30","end_time":"19:55","subject":"Filosofía del Derecho","academic_year":"Tercer año","classroom":"Aula E","activity_type":"presential"},{"id":"4-jue-metodologia1","weekday":"TH","start_time":"14:45","end_time":"16:10","subject":"Metodología de la Investigación I","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"4-jue-reales2","weekday":"TH","start_time":"16:15","end_time":"17:40","subject":"Derechos Reales II","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"4-jue-pps6","weekday":"TH","start_time":"17:45","end_time":"19:55","subject":"Práctica Profesional Supervisada VI","academic_year":"Cuarto año","classroom":"Aula B","activity_type":"presential"},{"id":"5-jue-pps8","weekday":"TH","start_time":"14:45","end_time":"16:10","subject":"Práctica Profesional Supervisada VIII","academic_year":"Quinto año","classroom":"Aula L","activity_type":"presential"},{"id":"5-jue-adm2","weekday":"TH","start_time":"16:15","end_time":"18:25","subject":"Derecho Administrativo II","academic_year":"Quinto año","classroom":"Aula C","activity_type":"presential"},{"id":"5-jue-metodologia2","weekday":"TH","start_time":"18:30","end_time":"19:55","subject":"Metodología de la Investigación II","academic_year":"Quinto año","classroom":"Aula C","activity_type":"presential"}];

const state = { view: "day", cursor: new Date(), activities: [], allActivities: [], user: null, canEdit: false, filters: new Set(["presential", "hybrid", "virtual", "telephone", "featured"]), audienceFilters: new Set(["pregrado", "grado", "posgrado", "general"]), searchQuery: "", calendarConfig: null, academicCalendarBulkLoaded: false, academicCalendarCleanupDone: false, hibridacionesBulkLoaded: false, gradeScheduleBulkLoaded: false, legalClinicsBulkLoaded: false, mediationCenterBulkLoaded: false };
const el = (id) => document.getElementById(id);
const agenda = el("agenda");
const status = el("status");
const activityDialog = el("activityDialog");
const importDialog = el("importDialog");
const detailDialog = el("detailDialog");
const calendarDialog = el("calendarDialog");
const bulkDatesDialog = el("bulkDatesDialog");
const hibridacionesDialog = el("hibridacionesDialog");
const gradeScheduleDialog = el("gradeScheduleDialog");
const legalClinicsDialog = el("legalClinicsDialog");
const mediationCenterDialog = el("mediationCenterDialog");
const reportDialog = el("reportDialog");

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
function isCalendarConfigRecord(item) { return item?.id === calendarConfigDocumentId || item?.id === "__calendar_config__" || String(item?.record_kind || "").toLowerCase() === "calendar_config"; }
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
  if (["telephone", "telefonica", "telefónica"].includes(value)) return "telephone";
  return "hybrid"; // Las transmisiones históricas se integran como híbridas.
}
function isVirtual(item) { return normalizedModality(item) === "virtual"; }
function isTelephone(item) { return normalizedModality(item) === "telephone"; }
function isRemote(item) { return isVirtual(item) || isTelephone(item); }
function isPresential(item) { return normalizedModality(item) === "presential"; }
function isHybrid(item) { return normalizedModality(item) === "hybrid"; }
function activityTypeLabel(item) { return isTelephone(item) ? "Telefónica" : isVirtual(item) ? "Virtual" : isPresential(item) ? "Presencial" : "Híbrida"; }
function activityTypeKey(item) { return normalizedModality(item); }
function normalizeAcademicYear(value) { return value === "Optativas / otras" ? "Optativa" : (value || ""); }
function activityCategoryOptionsForSecretary(secretary) {
  const organizer = organizerName(secretary);
  if (organizer === postgraduateSecretary) return [
    ["doctorate", "Doctorado"], ["masters", "Maestría"], ["specialization", "Especialización"], ["diploma", "Diplomatura"],
    ["thesis_defense", "Defensa de tesis"], ["seminar", "Seminario"], ["course", "Curso"], ["days", "Jornada/s"],
    ["info_talk", "Charla informativa"], ["other", "Otro"]
  ];
  if (organizer === generalSecretary) return [["board", "Consejo Directivo"], ["info_talk", "Charla informativa"], ["other", "Otro"]];
  if (organizer === academicSecretary) return [["class", "Clase de grado"], ["open_class", "Clase abierta"], ["exam", "Examen final"], ["global_knowledge_exam", "Examen Global de Conocimientos"], ...commonActivityCategoryOptions];
  if (organizer === extensionSecretary) return [["legal_clinic", "Consultorio jurídico"], ...commonActivityCategoryOptions];
  if (commonProgramSecretaries.has(organizer)) return commonActivityCategoryOptions;
  return commonActivityCategoryOptions;
}
function inferActivityCategory(item) {
  const organizer = organizerName(item?.secretary);
  const text = `${item?.name || ""} ${item?.subject || ""}`.toLocaleLowerCase(locale);
  const legacy = String(item?.academic_activity_type || "").trim().toLocaleLowerCase(locale);
  if (["class", "open_class", "exam", "global_knowledge_exam", "other"].includes(legacy)) return legacy;
  if (organizer === academicSecretary && item?.subject) return "class";
  if (text.includes("consultorio jur")) return "legal_clinic";
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
  if (text.includes("charla informativa")) return "info_talk";
  if (text.includes("curso")) return "course";
  return "";
}
function activityCategoryKey(item) {
  const stored = String(item?.activity_category || "").trim().toLocaleLowerCase(locale);
  return activityCategoryLabels.has(stored) ? stored : inferActivityCategory(item);
}
function activityCategoryLabel(item) {
  if (subjectBaseName(item?.subject) === "Ingreso") return "Ingreso";
  const category = activityCategoryKey(item);
  if (category === "other") {
    const custom = String(item?.activity_category_custom || "").trim();
    if (custom) return custom;
  }
  return activityCategoryLabels.get(category) || "Actividad";
}
function activityDescriptor(item) { return activityCategoryLabel(item); }
function isIngreso(item) { return subjectBaseName(item?.subject) === "Ingreso"; }
function activityStatusKey(item) {
  const stored = String(item?.activity_status || "scheduled").trim().toLocaleLowerCase(locale);
  return ["scheduled", "suspended", "postponed"].includes(stored) ? stored : "scheduled";
}
function suspensionScopeKey(item) {
  const stored = String(item?.suspension_scope || "").trim().toLocaleLowerCase(locale);
  return ["morning", "afternoon", "full_day"].includes(stored) ? stored : "full_day";
}
function suspensionScopeLabel(item) {
  return { morning: "Turno mañana", afternoon: "Turno tarde", full_day: "Día completo" }[suspensionScopeKey(item)];
}
function suspensionTargetsAllActivities(period) {
  const stored = String(period?.suspension_applies_to || "").trim().toLocaleLowerCase(locale);
  if (stored === "all") return true;
  if (stored === "classes") return false;
  const text = normalizeSearchText([period?.name, period?.period_description, period?.requirements, period?.calendar_source].filter(Boolean).join(" "));
  return !(text.includes("dictado de clases") || text.includes("calendario academico"));
}
function activityMatchesSuspensionScope(item, period) {
  const scope = suspensionScopeKey(period);
  if (scope === "full_day") return true;
  const start = minutesFromTime(item?.start_time);
  if (start < 0) return false;
  return scope === "morning" ? start < 14 * 60 : start >= 14 * 60;
}
function suspensionPeriodForActivity(item) {
  if (!item || isImportantPeriod(item)) return null;
  const key = String(item.date || "");
  if (!key) return null;
  return (state.allActivities || []).find((period) => {
    if (!isImportantPeriod(period) || periodTypeKey(period) !== "suspension") return false;
    if (!(period.date <= key && activityEndDate(period) >= key)) return false;
    if (!suspensionTargetsAllActivities(period) && !["class", "open_class"].includes(activityCategoryKey(item))) return false;
    return activityMatchesSuspensionScope(item, period);
  }) || null;
}
function isExplicitlySuspended(item) { return activityStatusKey(item) === "suspended"; }
function suspensionStateLabel(item) {
  const period = suspensionPeriodForActivity(item);
  return period ? `Suspendida · ${suspensionScopeLabel(period)}` : "Suspendida";
}
function activityStatusLabel(item) {
  if (isSuspended(item)) return suspensionStateLabel(item);
  return { scheduled: "Programada", suspended: "Suspendida", postponed: "Postergada" }[activityStatusKey(item)];
}
function isSuspended(item) { return isExplicitlySuspended(item) || Boolean(suspensionPeriodForActivity(item)); }
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
  if (["inscriptions", "exam_tables", "recess", "restart", "suspension", "classes", "academic_closure", "other"].includes(stored)) return stored;
  const text = String(item?.name || "").toLocaleLowerCase(locale);
  if (text.includes("mesa") && text.includes("examen")) return "exam_tables";
  if (text.includes("inscrip")) return "inscriptions";
  if (text.includes("reinicio") || text.includes("retoma")) return "restart";
  if (text.includes("receso") || text.includes("vacacion")) return "recess";
  if (text.includes("suspens")) return "suspension";
  if (text.includes("cursado") || text.includes("semestre")) return "classes";
  if (text.includes("regularidad") || text.includes("siu-guaran")) return "academic_closure";
  return "other";
}
function periodTypeLabel(item) {
  const key = periodTypeKey(item);
  const base = { inscriptions: "Inscripciones", exam_tables: "Mesas de examen", recess: "Receso", restart: "Reinicio de actividades", suspension: "Suspensión de actividades", classes: "Cursado", academic_closure: "Cierre académico", other: "Otra fecha destacada" }[key];
  return key === "suspension" ? `${base} · ${suspensionScopeLabel(item)}` : base;
}
function importantPeriodStatus(item) {
  const today = localDate(new Date());
  const start = localDate(fromISODate(item.date));
  const end = localDate(fromISODate(activityEndDate(item)));
  if (today < start) {
    const days = Math.max(1, Math.round((start - today) / 86400000));
    return `En ${days} ${days === 1 ? "día" : "días"}`;
  }
  if (today > end) return "Finalizada";
  const remaining = Math.round((end - today) / 86400000);
  return remaining <= 2 && item.date !== activityEndDate(item) ? "Últimos días" : "Vigente";
}
function isCalendarMarkerPeriod(item) { return isImportantPeriod(item) && ["recess", "restart"].includes(periodTypeKey(item)); }
function displayOrganizer(item) {
  if (isImportantPeriod(item) && ["recess", "restart", "suspension"].includes(periodTypeKey(item))) return "";
  return organizerName(item?.secretary);
}
function periodDisplayInstances(item) {
  if (!isImportantPeriod(item)) return [item];
  const type = periodTypeKey(item);
  if (type === "recess") {
    const recess = { ...item, end_date: item.date, secretary: "", _calendar_marker: true };
    const restartDate = toISODate(addDays(fromISODate(activityEndDate(item)), 1));
    const restart = {
      ...item,
      id: `${item.id || "recess"}__restart`,
      period_type: "restart",
      date: restartDate,
      end_date: restartDate,
      name: "Reinicio de actividades",
      secretary: "",
      period_description: "",
      requirements: "",
      observations: "",
      more_info_url: "",
      _calendar_marker: true,
      _derived_marker: true
    };
    return [recess, restart];
  }
  if (type === "restart") return [{ ...item, end_date: item.date, secretary: "", _calendar_marker: true }];
  return [item];
}
function expandedDisplayItems(items) { return (items || []).flatMap(periodDisplayInstances); }
function isHoliday(date) { return Boolean(holidayForDate(date)); }
function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase(locale)
    .replace(/\s+/g, " ")
    .trim();
}
function searchableTextForItem(item) {
  const rawValues = Object.values(item || {}).filter((value) => typeof value === "string" || typeof value === "number");
  return normalizeSearchText([
    ...rawValues,
    displayOrganizer(item),
    activityDescriptor(item),
    activityTypeLabel(item),
    activityStatusLabel(item),
    isImportantPeriod(item) ? periodTypeLabel(item) : "",
    isImportantPeriod(item) ? importantPeriodStatus(item) : ""
  ].filter(Boolean).join(" "));
}
function matchesSearch(item) {
  const query = normalizeSearchText(state.searchQuery);
  if (!query) return true;
  return query.split(" ").filter(Boolean).every((term) => searchableTextForItem(item).includes(term));
}
function activityAudienceKey(item) {
  if (isImportantPeriod(item)) return "general";
  const career = String(item?.career || "").trim();
  const organizer = organizerName(item?.secretary);
  const category = activityCategoryKey(item);
  if (career === buildingCareer) return "pregrado";
  if (organizer === postgraduateSecretary || ["doctorate", "masters", "specialization", "diploma", "thesis_defense", "seminar"].includes(category)) return "posgrado";
  if (career === lawCareer || (organizer === academicSecretary && ["class", "open_class", "exam"].includes(category))) return "grado";
  return "general";
}

function matchesQuickFilter(item) {
  const modalityMatches = isImportantPeriod(item) ? state.filters.has("featured") : state.filters.has(activityTypeKey(item));
  const audienceMatches = state.audienceFilters.has(activityAudienceKey(item));
  return modalityMatches && audienceMatches && matchesSearch(item);
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

function saveViewPreferences() {
  try {
    localStorage.setItem(viewPreferencesStorageKey, JSON.stringify({
      view: state.view,
      cursor: toISODate(state.cursor),
      filters: [...state.filters],
      audienceFilters: [...state.audienceFilters],
      searchQuery: state.searchQuery || "",
      version: 2
    }));
  } catch (_) { /* Las preferencias son opcionales. */ }
}

function restoreViewPreferences() {
  try {
    const raw = localStorage.getItem(viewPreferencesStorageKey);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (["day", "week", "month"].includes(saved?.view)) state.view = saved.view;
    if (validISODate(saved?.cursor)) {
      const restoredDate = fromISODate(saved.cursor);
      if (restoredDate >= calendarMinDate && restoredDate <= calendarMaxDate) state.cursor = restoredDate;
    }
    const modalityValues = new Set(["presential", "hybrid", "virtual", "telephone", "featured"]);
    if (Array.isArray(saved?.filters)) {
      state.filters = new Set(saved.filters.filter((value) => modalityValues.has(value)));
      if (saved?.version !== 2) state.filters.add("telephone");
    }
    const audienceValues = new Set(["pregrado", "grado", "posgrado", "general"]);
    if (Array.isArray(saved?.audienceFilters)) state.audienceFilters = new Set(saved.audienceFilters.filter((value) => audienceValues.has(value)));
    state.searchQuery = typeof saved?.searchQuery === "string" ? saved.searchQuery : "";
  } catch (_) { /* Si hay preferencias antiguas o dañadas, se usan los valores por defecto. */ }
}

function applyViewPreferencesToControls() {
  document.querySelectorAll(".view-filter-check").forEach((checkbox) => { checkbox.checked = state.filters.has(checkbox.value); });
  document.querySelectorAll(".audience-filter-check").forEach((checkbox) => { checkbox.checked = state.audienceFilters.has(checkbox.value); });
  const searchInput = el("agendaSearch");
  if (searchInput) searchInput.value = state.searchQuery;
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
  el("demoBanner").hidden = true;
  populateFormOptions();
  populateCalendarYearOptions();
  restoreViewPreferences();
  applyViewPreferencesToControls();
  bindEvents();
  applyViewStateUI();
  if (configured) {
    await setPersistence(auth, browserLocalPersistence).catch(() => {});
    onAuthStateChanged(auth, async (user) => {
      state.user = user;
      state.canEdit = Boolean(user && String(user.email || "").trim().toLowerCase() === adminEmail);
      updateAuthUI();
      await loadPeriod();
    });
  } else {
    updateAuthUI();
    status.textContent = "La agenda no tiene configurada la conexión con Firebase.";
  }
}

function bindEvents() {
  el("dayView").addEventListener("click", () => setView("day"));
  el("weekView").addEventListener("click", () => setView("week"));
  el("monthView").addEventListener("click", () => setView("month"));
  el("previousPeriod").addEventListener("click", () => movePeriod(-1));
  el("nextPeriod").addEventListener("click", () => movePeriod(1));
  el("currentPeriod").addEventListener("click", () => { const today = localDate(new Date()); state.cursor = today < calendarMinDate ? calendarMinDate : today > calendarMaxDate ? calendarMaxDate : today; loadPeriod(); });
  el("copyVisibleEvents").addEventListener("click", copyCurrentPublicView);
  document.querySelectorAll(".view-filter-check").forEach((checkbox) => checkbox.addEventListener("change", syncViewFilters));
  document.querySelectorAll(".audience-filter-check").forEach((checkbox) => checkbox.addEventListener("change", syncAudienceFilters));
  const searchInput = el("agendaSearch");
  const applySearch = () => { state.searchQuery = searchInput.value; saveViewPreferences(); render(); };
  searchInput.addEventListener("input", applySearch);
  searchInput.addEventListener("search", applySearch);
  searchInput.addEventListener("change", applySearch);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchInput.value) { searchInput.value = ""; applySearch(); }
  });
  el("newActivity").addEventListener("click", () => openActivityForm());
  el("updateCalendar").addEventListener("click", openCalendarForm);
  el("bulkAcademicDates").addEventListener("click", openBulkAcademicDates);
  el("cleanupAgenda").addEventListener("click", cleanupAgendaKeepingAcademicDates);
  el("bulkHibridaciones").addEventListener("click", openBulkHibridaciones);
  el("bulkGradeSchedule").addEventListener("click", openBulkGradeSchedule);
  el("bulkLegalClinics").addEventListener("click", openBulkLegalClinics);
  el("bulkMediationCenter").addEventListener("click", openBulkMediationCenter);
  el("downloadReport").addEventListener("click", openReportForm);
  el("importCalendar").addEventListener("click", openImportForm);
  el("authButton").addEventListener("click", handleAuthButton);
  el("logoutAdmin").addEventListener("click", handleLogout);
  el("activityForm").addEventListener("submit", saveActivity);
  el("importForm").addEventListener("submit", importCalendarFile);
  el("calendarForm").addEventListener("submit", saveCalendarConfig);
  el("bulkDatesForm").addEventListener("submit", saveBulkAcademicDates);
  el("hibridacionesForm").addEventListener("submit", saveBulkHibridaciones);
  el("gradeScheduleForm").addEventListener("submit", saveBulkGradeSchedule);
  el("legalClinicsForm").addEventListener("submit", saveBulkLegalClinics);
  el("mediationCenterForm").addEventListener("submit", saveBulkMediationCenter);
  el("reportForm").addEventListener("submit", generateReportPdf);
  el("reportPeriodType").addEventListener("change", updateReportFormFields);
  el("reportOutputType").addEventListener("change", updateReportFormFields);
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
  el("periodType").addEventListener("change", () => { syncPeriodOrganizer(); toggleSuspensionScopeField(); });
  el("icsFile").addEventListener("change", () => { el("icsFileName").textContent = el("icsFile").files[0]?.name || "Ningún archivo seleccionado"; });
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => el(button.dataset.close).close()));
  [importDialog, detailDialog, calendarDialog, reportDialog, bulkDatesDialog, hibridacionesDialog, gradeScheduleDialog, legalClinicsDialog, mediationCenterDialog].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  activityDialog.addEventListener("cancel", (event) => event.preventDefault());
  setInterval(() => { if (!document.hidden) render(); }, 60000);
}

function syncViewFilters() {
  state.filters = new Set([...document.querySelectorAll(".view-filter-check:checked")].map((checkbox) => checkbox.value));
  saveViewPreferences();
  render();
}

function syncAudienceFilters() {
  state.audienceFilters = new Set([...document.querySelectorAll(".audience-filter-check:checked")].map((checkbox) => checkbox.value));
  saveViewPreferences();
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
  const detailed = academic && ["class", "open_class", "exam"].includes(el("academicType").value);
  const customActivityType = scheduled && el("academicType").value === "other";
  el("academicTypeField").hidden = !scheduled || !organizer;
  el("academicType").required = scheduled && Boolean(organizer);
  el("responsible").required = scheduled && el("academicType").value !== "legal_clinic";
  el("otherActivityTypeField").hidden = !customActivityType;
  el("otherActivityType").required = customActivityType;
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
  const other = el("recordKind").value === "activity" && !["virtual", "telephone"].includes(el("activityType").value) && el("classroom").value === "__other__";
  el("otherClassroomField").hidden = !other; el("otherClassroom").required = other;
  if (!other) el("otherClassroom").value = "";
}

function toggleActivityTypeFields() {
  const scheduled = el("recordKind").value === "activity"; const remote = ["virtual", "telephone"].includes(el("activityType").value);
  el("classroomField").hidden = !scheduled || remote;
  el("classroom").required = scheduled && !remote;
  toggleOtherClassroom();
}

function toggleRecordKindFields() {
  const scheduled = el("recordKind").value === "activity"; const editing = Boolean(el("activityId").value);
  document.querySelectorAll("[data-scheduled-only]").forEach((node) => { node.hidden = !scheduled; });
  document.querySelectorAll("[data-period-only]").forEach((node) => { node.hidden = scheduled; });
  el("periodType").required = !scheduled;
  el("nameLabel").textContent = scheduled ? "Título" : "Detalle";
  el("startTime").required = scheduled; el("endTime").required = scheduled; el("activityType").required = scheduled;
  el("secretary").required = scheduled;
  const organizerPlaceholder = el("secretary").querySelector('option[value=""]');
  if (organizerPlaceholder) organizerPlaceholder.textContent = scheduled ? "Seleccionar área organizadora" : "Sin organizador / no corresponde";
  el("recurrenceField").hidden = !scheduled || editing;
  el("recurrence").disabled = editing || !scheduled;
  if (!scheduled) { el("recurrence").value = "none"; el("updateSameName").checked = false; }
  el("bulkEditField").hidden = !scheduled || !editing;
  el("requirementsLabel").textContent = scheduled ? "Requerimientos / observaciones" : "Descripción / información importante";
  el("formTitle").textContent = editing ? (scheduled ? "Editar actividad" : "Editar fecha destacada") : (scheduled ? "Nueva actividad" : "Nueva fecha destacada");
  el("saveActivity").textContent = scheduled ? "Guardar actividad" : "Guardar fecha destacada";
  toggleRecurrenceFields(); updateAcademicFields(el("subject").value); toggleActivityTypeFields(); toggleActivityStatusFields(); toggleSuspensionScopeField(); syncPeriodOrganizer();
}

function toggleSuspensionScopeField() {
  const isPeriod = el("recordKind").value === "period";
  const isSuspension = isPeriod && el("periodType").value === "suspension";
  el("suspensionScopeField").hidden = !isSuspension;
  el("suspensionScope").required = isSuspension;
  if (!isSuspension) el("suspensionScope").value = "full_day";
  el("nameLabel").textContent = isPeriod ? (isSuspension ? "Motivo / detalle" : "Detalle") : "Título";
}

function syncPeriodOrganizer() {
  const neutralPeriod = el("recordKind").value === "period" && ["recess", "restart", "suspension"].includes(el("periodType").value);
  el("organizerField").hidden = neutralPeriod;
  if (!neutralPeriod) return;
  el("secretary").value = "";
  el("otherSecretary").value = "";
  toggleOtherSecretary();
  updateAcademicFields();
}

function toggleOtherSecretary() {
  const other = el("secretary").value === "__other__";
  el("otherSecretaryField").hidden = !other; el("otherSecretary").required = other;
  if (!other) el("otherSecretary").value = "";
}

function updateAuthUI() {
  const button = el("authButton");
  const sessionLabel = el("sessionLabel");
  sessionLabel.hidden = true;
  sessionLabel.textContent = "";
  if (!configured) {
    button.setAttribute("aria-label", "Administración no disponible");
    button.title = "Administración no disponible";
    button.disabled = true;
  } else if (state.user) {
    button.disabled = false;
    button.setAttribute("aria-label", state.canEdit ? "Cerrar administración" : "Cerrar sesión");
    button.title = state.canEdit ? "Cerrar administración" : "Cerrar sesión";
  } else {
    button.disabled = false;
    button.setAttribute("aria-label", "Administración");
    button.title = "Administración";
  }
  document.querySelectorAll(".editor-only").forEach((node) => { node.hidden = !state.canEdit; });
  updateBulkAcademicDatesVisibility();
  updateCleanupAgendaVisibility();
  updateBulkHibridacionesVisibility();
  updateBulkGradeScheduleVisibility();
  updateBulkLegalClinicsVisibility();
  updateBulkMediationCenterVisibility();
}

function updateBulkAcademicDatesVisibility() {
  const button = el("bulkAcademicDates");
  if (!button) return;
  button.hidden = !state.canEdit || state.academicCalendarBulkLoaded;
}

function updateCleanupAgendaVisibility() {
  const button = el("cleanupAgenda");
  if (!button) return;
  button.hidden = !state.canEdit || !state.academicCalendarBulkLoaded || state.academicCalendarCleanupDone || state.hibridacionesBulkLoaded;
}

function updateBulkHibridacionesVisibility() {
  const button = el("bulkHibridaciones");
  if (!button) return;
  button.hidden = !state.canEdit || !state.academicCalendarCleanupDone || state.hibridacionesBulkLoaded;
}

function updateBulkGradeScheduleVisibility() {
  const button = el("bulkGradeSchedule");
  if (!button) return;
  button.hidden = !state.canEdit || !state.academicCalendarCleanupDone || !state.hibridacionesBulkLoaded || state.gradeScheduleBulkLoaded;
}

function updateBulkLegalClinicsVisibility() {
  const button = el("bulkLegalClinics");
  if (!button) return;
  button.hidden = !state.canEdit || state.legalClinicsBulkLoaded;
}

function updateBulkMediationCenterVisibility() {
  const button = el("bulkMediationCenter");
  if (!button) return;
  button.hidden = !state.canEdit || state.mediationCenterBulkLoaded;
}

async function handleLogout() {
  if (!configured || !state.user) return;
  try {
    await signOut(auth);
    showToast("Sesión de administración cerrada");
  } catch (error) {
    alert(`No se pudo cerrar sesión. ${friendlyError(error)}`);
  }
}

async function handleAuthButton() {
  if (!configured) return;
  try {
    if (state.user) {
      await signOut(auth);
      showToast("Sesión de administración cerrada");
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    const email = String(result.user?.email || "").trim().toLowerCase();
    if (email !== adminEmail) {
      await signOut(auth);
      alert("Esta cuenta no tiene permisos para administrar la agenda.");
    }
  } catch (error) {
    if (["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(error?.code)) return;
    alert(`No se pudo iniciar sesión. ${friendlyError(error)}`);
  }
}

function applyViewStateUI() {
  ["day", "week", "month"].forEach((name) => {
    const button = el(`${name}View`); const active = name === state.view;
    button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active));
  });
  el("viewEyebrow").textContent = { day: "Vista diaria", week: "Vista semanal", month: "Vista mensual" }[state.view];
}

function setView(view) {
  state.view = view;
  applyViewStateUI();
  saveViewPreferences();
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
  saveViewPreferences();
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
      state.academicCalendarBulkLoaded = Boolean(configRecord?.[academicCalendarBulkMarker]);
      state.academicCalendarCleanupDone = Boolean(configRecord?.[academicCalendarCleanupMarker]);
      state.hibridacionesBulkLoaded = Boolean(configRecord?.[hibridacionesBulkMarker]);
      state.gradeScheduleBulkLoaded = Boolean(configRecord?.[gradeScheduleBulkMarker]);
      state.legalClinicsBulkLoaded = Boolean(configRecord?.[legalClinicsBulkMarker]);
      state.mediationCenterBulkLoaded = Boolean(configRecord?.[mediationCenterBulkMarker]);
      records = records.filter((item) => !isCalendarConfigRecord(item));
      state.allActivities = records.sort(sortActivities);
      state.activities = records.filter((item) => overlapsPeriod(item, start, end)).sort(sortActivities);
    } else {
      state.calendarConfig = loadDemoCalendarConfig();
      state.academicCalendarBulkLoaded = false;
      state.academicCalendarCleanupDone = false;
      state.hibridacionesBulkLoaded = false;
      state.gradeScheduleBulkLoaded = false;
      state.legalClinicsBulkLoaded = false;
      state.mediationCenterBulkLoaded = false;
      const records = loadDemoData().filter((item) => !isCalendarConfigRecord(item)).sort(sortActivities); state.allActivities = records;
      state.activities = records.filter((item) => overlapsPeriod(item, start, end)).sort(sortActivities);
    }
  } catch (error) {
    status.textContent = `No se pudo cargar la agenda. ${friendlyError(error)}`; return;
  }
  updatePeriodTitle(); updateNavigationState(); updateBulkAcademicDatesVisibility(); updateCleanupAgendaVisibility(); updateBulkHibridacionesVisibility(); updateBulkGradeScheduleVisibility(); updateBulkLegalClinicsVisibility(); updateBulkMediationCenterVisibility(); render();
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
  const candidates = currentVisibleFilteredItems();
  const count = candidates.length;
  const copyViewButton = el("copyVisibleEvents");
  if (copyViewButton) {
    copyViewButton.disabled = count === 0;
    copyViewButton.title = count ? `Copiar ${count} ${count === 1 ? "evento visible" : "eventos visibles"}` : "No hay eventos visibles para copiar";
  }
  status.className = "status activity-count";
  const countNumber = document.createElement("strong"); countNumber.className = "activity-count-number"; countNumber.textContent = String(count);
  const countText = document.createElement("span"); countText.className = "activity-count-text"; countText.textContent = count === 1 ? "evento" : "eventos";
  status.replaceChildren(countNumber, countText);
  updateHeaderEventTotal();
}

function updateHeaderEventTotal() {
  const count = expandedDisplayItems(state.allActivities).length;
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
    const markers = calendarMarkersForDate(start);
    section.classList.add("empty-day-section"); if (isHoliday(start)) section.classList.add("holiday-day");
    if (!markers.length) {
      const empty = document.createElement("p"); empty.className = isHoliday(start) ? "holiday-empty" : "empty-day"; empty.textContent = isHoliday(start) ? `${holidayLabel(start)} · sin actividades` : !isWithinConfiguredCalendar(start) ? "Fuera del calendario" : "Sin actividades"; list.append(empty);
    }
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
      const markers = calendarMarkersForDate(date);
      section.classList.add("empty-day-section"); if (isHoliday(date)) section.classList.add("holiday-day");
      if (!markers.length) {
        const empty = document.createElement("p"); empty.className = isHoliday(date) ? "holiday-empty" : "empty-day"; empty.textContent = isHoliday(date) ? `${holidayLabel(date)} · sin actividades` : !isWithinConfiguredCalendar(date) ? "Fuera del calendario" : "Sin actividades"; list.append(empty);
      }
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
  calendarMarkersForDate(date).forEach((item) => {
    const badge = document.createElement("span"); badge.className = "holiday-badge calendar-marker-badge"; badge.textContent = periodTypeLabel(item); heading.append(badge);
  });
  return heading;
}

function createPeriodRow(item) {
  const details = document.createElement("details"); details.className = "activity-row period-row";
  if (periodTypeKey(item) === "suspension") details.classList.add("period-suspension");
  details.style.setProperty("--organizer-color", organizerColor(item.secretary));
  const summary = document.createElement("summary"); summary.className = "activity-summary";
  const marker = document.createElement("span"); marker.className = "summary-time period-marker"; marker.textContent = periodTypeLabel(item);
  const title = document.createElement("span"); title.className = "summary-title";
  const periodName = document.createElement("strong"); periodName.className = "summary-activity-name"; periodName.textContent = item.name; title.append(periodName);
  const periodOrganizer = displayOrganizer(item);
  if (periodOrganizer) {
    const organizer = document.createElement("span"); organizer.className = "summary-organizer"; organizer.textContent = periodOrganizer; organizer.style.color = organizerColor(item.secretary); title.append(organizer);
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
  if (isSuspended(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "activity-status-badge suspended"; stateBadge.textContent = suspensionStateLabel(item); labels.append(stateBadge); }
  if (isPostponed(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "activity-status-badge postponed"; stateBadge.textContent = `Postergada · ${postponedDateLabel(item)}`; labels.append(stateBadge); }
  if (isInProgress(item)) { const live = document.createElement("span"); live.className = "in-progress-badge"; live.innerHTML = '<span class="live-arrow" aria-hidden="true">▶</span> En curso'; labels.append(live); }
  if (state.view === "day") {
    const timing = dailyTiming(item);
    if (timing) { const timingBadge = document.createElement("span"); timingBadge.className = `daily-time-badge ${timing.kind}`; timingBadge.textContent = timing.label; labels.append(timingBadge); }
  }
  const placePlatform = document.createElement("span"); placePlatform.className = "summary-place-platform";
  if (!isRemote(item)) { const room = document.createElement("span"); room.className = "summary-room"; room.textContent = item.classroom || "Lugar a confirmar"; placePlatform.append(room); }
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
  const fields = [["Fecha/as", dateRangeLabel(item)]];
  const organizer = displayOrganizer(item);
  if (organizer) fields.push(["Organiza", organizer]);
  if (isImportantPeriod(item)) {
    fields.push(["Fecha destacada", periodTypeLabel(item)], ["Estado", importantPeriodStatus(item)]);
    if (combinedNotes) fields.push(["Información", combinedNotes]);
    return fields;
  }
  fields.push(["Horario", `${cleanTime(item.start_time)}–${cleanTime(item.end_time)}`], ["Tipo de actividad", activityDescriptor(item)]);
  if (item.career) fields.push(["Carrera", item.career]);
  if (itemAcademicYear(item)) fields.push(["Año", itemAcademicYear(item)]);
  if (item.subject && !isIngreso(item)) fields.push(["Materia", item.subject]);
  if (isSuspended(item)) {
    fields.push(["Estado", suspensionStateLabel(item)]);
    const suspension = suspensionPeriodForActivity(item);
    if (suspension?.name) fields.push(["Motivo de suspensión", suspension.name]);
  } else if (isPostponed(item)) fields.push(["Estado", "Postergada"], ["Nueva fecha", postponedDateLabel(item)]);
  else if (isInProgress(item)) fields.push(["Estado", "▶ En curso"]);
  const visibleResponsible = state.canEdit ? (item.responsible || item.public_responsible) : (item.responsible_is_public === true ? item.public_responsible : "");
  if (visibleResponsible) fields.push(["Responsable", visibleResponsible]);
  if (!isRemote(item)) fields.push(["Aula/Lugar", item.classroom]);
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

function currentVisibleFilteredItems() {
  const { visibleStart, visibleEnd } = periodRange();
  return expandedDisplayItems(state.allActivities)
    .filter((item) => matchesQuickFilter(item)
      && overlapsPeriod(item, visibleStart, visibleEnd)
      && itemHasDisplayableDay(item, visibleStart, visibleEnd))
    .sort(sortActivities);
}

function publicCopyDateRangeLabel(start, end) {
  if (toISODate(start) === toISODate(end)) {
    return formatDate(start, { day: "numeric", month: "long", year: "numeric" });
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()} al ${formatDate(end, { day: "numeric", month: "long", year: "numeric" })}`;
  }
  return `${formatDate(start, { day: "numeric", month: "long", year: sameYear ? undefined : "numeric" })} al ${formatDate(end, { day: "numeric", month: "long", year: "numeric" })}`;
}

function activePublicFilterLines() {
  const lines = [];
  const modalityLabels = {
    presential: "Presenciales",
    hybrid: "Híbridas",
    virtual: "Virtuales",
    telephone: "Telefónicas",
    featured: "Fechas destacadas"
  };
  const audienceLabels = {
    pregrado: "Pregrado",
    grado: "Grado",
    posgrado: "Posgrado",
    general: "Actividades generales"
  };
  const allModalities = ["presential", "hybrid", "virtual", "telephone", "featured"];
  const allAudiences = ["pregrado", "grado", "posgrado", "general"];
  const selectedModalities = allModalities.filter((key) => state.filters.has(key));
  const selectedAudiences = allAudiences.filter((key) => state.audienceFilters.has(key));
  if (selectedModalities.length !== allModalities.length) {
    lines.push(`*Modalidad:* ${selectedModalities.length ? selectedModalities.map((key) => modalityLabels[key]).join(" · ") : "Ninguna"}`);
  }
  if (selectedAudiences.length !== allAudiences.length) {
    lines.push(`*Nivel:* ${selectedAudiences.length ? selectedAudiences.map((key) => audienceLabels[key]).join(" · ") : "Ninguno"}`);
  }
  if (state.searchQuery.trim()) lines.push(`*Búsqueda:* ${state.searchQuery.trim()}`);
  return lines;
}

function publicCopyLinesForItem(item) {
  const lines = [];
  if (isImportantPeriod(item)) {
    lines.push(`*${item.name || "Fecha destacada"}*`);
    lines.push(`*Fecha/as:* ${dateRangeLabel(item)}`);
    lines.push(`*Tipo:* ${periodTypeLabel(item)}`);
    const organizer = displayOrganizer(item);
    if (organizer) lines.push(`*Organiza:* ${organizer}`);
    if (item.period_description) lines.push(`*Información:* ${item.period_description}`);
    if (isSafeUrl(item.more_info_url)) lines.push(`🔗 *Más información:* ${item.more_info_url}`);
    return lines;
  }

  lines.push(`*${item.name || "Actividad"}*`);
  lines.push(`*Fecha/as:* ${dateRangeLabel(item)}`);
  if (item.start_time || item.end_time) lines.push(`*Horario:* ${cleanTime(item.start_time)}–${cleanTime(item.end_time)}`);
  const descriptor = activityDescriptor(item);
  if (descriptor) lines.push(`*Tipo de actividad:* ${descriptor}`);
  const organizer = displayOrganizer(item);
  if (organizer) lines.push(`*Organiza:* ${organizer}`);
  if (item.career) lines.push(`*Carrera:* ${item.career}`);
  if (itemAcademicYear(item)) lines.push(`*Año:* ${itemAcademicYear(item)}`);
  if (item.subject && !isIngreso(item)) lines.push(`*Materia:* ${item.subject}`);
  if (isSuspended(item)) {
    lines.push(`*Estado:* ${suspensionStateLabel(item)}`);
    const suspension = suspensionPeriodForActivity(item);
    if (suspension?.name) lines.push(`*Motivo de suspensión:* ${suspension.name}`);
  } else if (isPostponed(item)) {
    lines.push("*Estado:* Postergada");
    lines.push(`*Nueva fecha:* ${postponedDateLabel(item)}`);
  }
  if (!isRemote(item) && item.classroom) lines.push(`*Aula/Lugar:* ${item.classroom}`);
  const publicResponsible = item.responsible_is_public === true ? item.public_responsible : "";
  if (publicResponsible) lines.push(`*Responsable:* ${publicResponsible}`);
  lines.push(`*Modalidad:* ${activityTypeLabel(item)}`);
  if (!isPresential(item) && item.platform) lines.push(`*Plataforma:* ${item.platform}`);
  if (!isImportantPeriod(item) && !isPresential(item) && item.link_is_public === true && isSafeUrl(item.meeting_url)) {
    lines.push(`🔗 *Enlace de la actividad:* ${item.meeting_url}`);
  }
  if (isSafeUrl(item.more_info_url)) lines.push(`🔗 *Más información:* ${item.more_info_url}`);
  return lines;
}

function currentPublicViewCopyText(items) {
  const { visibleStart, visibleEnd } = periodRange();
  const viewLabel = ({ day: "Día", week: "Semana", month: "Mes" })[state.view] || "Agenda";
  const lines = [
    `*Agenda · ${viewLabel}*`,
    publicCopyDateRangeLabel(visibleStart, visibleEnd),
    ""
  ];
  const filterLines = activePublicFilterLines();
  if (filterLines.length) lines.push(...filterLines, "");
  lines.push(`*${items.length} ${items.length === 1 ? "evento" : "eventos"}*`, "");

  items.forEach((item, index) => {
    lines.push(...publicCopyLinesForItem(item));
    if (index < items.length - 1) lines.push("");
  });
  return lines.join("\n");
}

async function copyCurrentPublicView() {
  const items = currentVisibleFilteredItems();
  if (!items.length) {
    showToast("No hay eventos visibles para copiar");
    return;
  }
  await copyText(currentPublicViewCopyText(items), `${items.length} ${items.length === 1 ? "evento copiado" : "eventos copiados"}`);
}
function actionButton(label, handler, className = "") { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.className = className; button.addEventListener("click", handler); return button; }

function activitiesForDate(date) {
  if (!isWithinConfiguredCalendar(date) || isHoliday(date)) return [];
  const key = toISODate(date);
  return state.allActivities.filter((item) => !isImportantPeriod(item) && matchesQuickFilter(item) && item.date <= key && activityEndDate(item) >= key).sort(sortActivities);
}
function periodsForDate(date) {
  if (!isWithinConfiguredCalendar(date) || isHoliday(date)) return [];
  const key = toISODate(date);
  return expandedDisplayItems(state.allActivities)
    .filter((item) => isImportantPeriod(item) && !isCalendarMarkerPeriod(item) && matchesQuickFilter(item) && item.date <= key && activityEndDate(item) >= key)
    .sort(sortActivities);
}
function calendarMarkersForDate(date) {
  if (!isWithinConfiguredCalendar(date) || isHoliday(date)) return [];
  const key = toISODate(date);
  return expandedDisplayItems(state.allActivities)
    .filter((item) => isCalendarMarkerPeriod(item) && matchesQuickFilter(item) && item.date === key)
    .sort(sortActivities);
}
function calendarItemsForDate(date) { return [...periodsForDate(date), ...activitiesForDate(date)]; }
function calendarDayHasContent(date) { return calendarItemsForDate(date).length > 0 || calendarMarkersForDate(date).length > 0 || isHoliday(date); }

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
    const dayItems = calendarItemsForDate(date); const markerItems = calendarMarkersForDate(date); if (!dayItems.length && !markerItems.length && !isHoliday(date)) cell.classList.add("no-activity");
    const number = document.createElement("span"); number.className = "month-number"; number.textContent = date.getDate(); cell.append(number);
    if (isHoliday(date)) { const badge = document.createElement("span"); badge.className = "month-holiday"; badge.textContent = holidayLabel(date); cell.append(badge); }
    markerItems.forEach((item) => { const badge = document.createElement("span"); badge.className = "month-holiday month-calendar-marker"; badge.textContent = periodTypeLabel(item); cell.append(badge); });
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
      if (isSuspended(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "month-status suspended"; stateBadge.textContent = suspensionStateLabel(item); button.append(stateBadge); }
      if (isPostponed(item)) { const stateBadge = document.createElement("span"); stateBadge.className = "month-status postponed"; stateBadge.textContent = `Postergada · ${postponedDateLabel(item)}`; button.append(stateBadge); }
      if (isInProgress(item)) { const live = document.createElement("span"); live.className = "month-in-progress"; live.innerHTML = '<span class="live-arrow" aria-hidden="true">▶</span> En curso'; button.append(live); }
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
    if (date.getDay() !== 0 && calendarDayHasContent(date)) datesWithActivities.push(toISODate(date));
  }
  const currentDate = toISODate(new Date()); const includeToday = currentDate >= toISODate(visibleStart) && currentDate <= toISODate(visibleEnd) && fromISODate(currentDate).getDay() !== 0;
  const dates = [...new Set([...datesWithActivities, ...holidayDates, ...(includeToday ? [currentDate] : [])])].sort();
  if (!dates.length) { const empty = document.createElement("p"); empty.className = "empty-day"; empty.textContent = "Sin actividades este mes"; mobileList.append(empty); }
  else dates.forEach((dateValue) => {
    const date = fromISODate(dateValue); const section = document.createElement("section"); section.className = "day-section"; if (isToday(date)) section.classList.add("today-day"); else if (isPastDay(date)) section.classList.add("past-day"); if (!isWithinConfiguredCalendar(date)) section.classList.add("outside-calendar-day");
    const list = document.createElement("div"); list.className = "day-list"; const items = calendarItemsForDate(date); items.forEach((item) => list.append(isImportantPeriod(item) ? createPeriodRow(item) : createActivityRow(item)));
    if (!items.length) { section.classList.add("empty-day-section"); if (isHoliday(date)) section.classList.add("holiday-day"); const markers = calendarMarkersForDate(date); if (!markers.length) { const empty = document.createElement("p"); empty.className = isHoliday(date) ? "holiday-empty" : "empty-day"; empty.textContent = isHoliday(date) ? `${holidayLabel(date)} · sin actividades` : !isWithinConfiguredCalendar(date) ? "Fuera del calendario" : "Sin actividades"; list.append(empty); } }
    section.append(createDayHeading(date), list); mobileList.append(section);
  });
  agenda.append(calendar, mobileList);
}

function openDetail(item) {
  if (isImportantPeriod(item)) {
    el("detailDate").textContent = `${periodTypeLabel(item)} · ${dateRangeLabel(item)} · ${importantPeriodStatus(item)}`;
  } else {
    const stateText = isSuspended(item) ? ` · ${suspensionStateLabel(item)}` : isPostponed(item) ? ` · Postergada · ${postponedDateLabel(item)}` : "";
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
        const batch = writeBatch(db); batch.set(doc(db, activitiesCollection, calendarConfigDocumentId), { record_kind: "calendar_config", date: `${calendarFirstYear}-01-01`, end_date: `${calendarLastYear}-12-31`, name: "Configuración del calendario", calendar_config: next, updated_at: serverTimestamp() }, { merge: true }); await batch.commit();
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
  el("suspensionScope").value = isImportantPeriod(item) && periodTypeKey(item) === "suspension" ? suspensionScopeKey(item) : "full_day";
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
  const storedOrganizer = isImportantPeriod(item) && ["recess", "restart", "suspension"].includes(periodTypeKey(item)) ? "" : organizerName(item?.secretary);
  el("name").value = item?.name || "";
  if (secretaryOptions.includes(storedOrganizer)) { el("secretary").value = storedOrganizer; el("otherSecretary").value = ""; }
  else if (storedOrganizer) { el("secretary").value = "__other__"; el("otherSecretary").value = storedOrganizer; }
  else { el("secretary").value = ""; el("otherSecretary").value = ""; }
  toggleOtherSecretary(); el("responsible").value = item?.responsible || item?.public_responsible || "";
  el("publicResponsible").checked = item?.responsible_is_public === true || Boolean(item?.public_responsible);
  el("activityType").value = item ? activityTypeKey(item) : "presential";
  el("otherActivityType").value = item?.activity_category_custom || "";
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
  const recordKind = el("recordKind").value;
  const periodType = el("periodType").value;
  let secretary = el("secretary").value === "__other__" ? el("otherSecretary").value.trim() : el("secretary").value;
  if (recordKind === "period" && ["recess", "restart", "suspension"].includes(periodType)) secretary = "";
  const academic = organizerName(secretary) === academicSecretary;
  const category = el("academicType").value;
  const detailedAcademic = academic && ["class", "open_class", "exam"].includes(category);
  if (recordKind === "period") {
    return { record_kind: "period", period_type: periodType, suspension_scope: periodType === "suspension" ? el("suspensionScope").value : "", suspension_applies_to: periodType === "suspension" ? "all" : "", date: el("date").value, end_date: el("endDate").value, start_time: "", end_time: "", name: el("name").value.trim(), secretary, activity_category: "", academic_activity_type: "", career: "", academic_year: "", subject: "", responsible: "", classroom: "", activity_type: "", activity_status: "scheduled", postponed_date: "", postponed_date_tbd: false, platform: "", account_used: "", meeting_url: "", link_is_public: false, more_info_url: el("moreInfoUrl").value.trim(), requirements: el("requirements").value.trim(), observations: "", recording_required: false };
  }
  const classroom = ["virtual", "telephone"].includes(el("activityType").value) ? "" : el("classroom").value === "__other__" ? el("otherClassroom").value.trim() : el("classroom").value;
  const activityStatus = el("activityStatus").value || "scheduled";
  const postponedDateTbd = activityStatus === "postponed" && el("postponedDateTbd").checked;
  return { record_kind: "activity", date: el("date").value, end_date: el("endDate").value, start_time: el("startTime").value, end_time: el("endTime").value, name: el("name").value.trim(), secretary, activity_category: category, activity_category_custom: category === "other" ? el("otherActivityType").value.trim() : "", academic_activity_type: academic && ["class", "open_class", "exam"].includes(category) ? category : "", career: detailedAcademic ? el("career").value : "", academic_year: detailedAcademic ? normalizeAcademicYear(el("academicYear").value) : "", subject: detailedAcademic ? el("subject").value : "", responsible: el("responsible").value.trim(), responsible_is_public: el("publicResponsible").checked, public_responsible: el("publicResponsible").checked ? el("responsible").value.trim() : "", classroom, activity_type: category === "exam" ? "presential" : el("activityType").value, activity_status: activityStatus, postponed_date: activityStatus === "postponed" && !postponedDateTbd ? el("postponedDate").value : "", postponed_date_tbd: postponedDateTbd, platform: el("platform").value.trim(), account_used: el("accountUsed").value.trim(), meeting_url: el("meetingUrl").value.trim(), link_is_public: el("publicLink").checked, more_info_url: el("moreInfoUrl").value.trim(), requirements: el("requirements").value.trim(), observations: "", recording_required: el("recordingRequired").checked };
}

function validateActivity(payload) {
  if (fromISODate(payload.date) < calendarMinDate || fromISODate(payload.date) > calendarMaxDate) return `La agenda admite fechas entre ${calendarFirstYear} y ${calendarLastYear}.`;
  if (fromISODate(payload.end_date) < calendarMinDate || fromISODate(payload.end_date) > calendarMaxDate) return `La fecha final debe estar entre ${calendarFirstYear} y ${calendarLastYear}.`;
  if (!isWithinConfiguredCalendar(fromISODate(payload.date)) || !isWithinConfiguredCalendar(fromISODate(payload.end_date))) return "La fecha está fuera del período habilitado para ese año. Podés cambiarlo desde Actualizar calendario.";
  if (fromISODate(payload.end_date) < fromISODate(payload.date)) return "La fecha de finalización no puede ser anterior a la fecha de inicio.";
  if (payload.more_info_url && !isSafeUrl(payload.more_info_url)) return "El enlace de más información debe comenzar con http:// o https://.";
  if (isImportantPeriod(payload)) {
    if (!payload.period_type) return "Seleccioná el tipo de fecha destacada.";
    if (payload.period_type === "suspension" && !["morning", "afternoon", "full_day"].includes(payload.suspension_scope)) return "Seleccioná el alcance de la suspensión.";
    return "";
  }
  if (!payload.secretary) return "Seleccioná quién organiza o completá el campo Otro organizador.";
  if (fromISODate(payload.date).getDay() === 0) return "Los domingos no forman parte de esta agenda.";
  if (!["virtual", "telephone"].includes(payload.activity_type) && !payload.classroom) return "Seleccioná un aula o completá el campo Otro lugar.";
  if (!payload.activity_category) return "Seleccioná el tipo de actividad.";
  if (payload.activity_category === "other" && !payload.activity_category_custom) return "Escribí el tipo de actividad en el campo Otro.";
  if (["class", "open_class", "exam"].includes(payload.activity_category) && (!payload.career || !payload.academic_year || !payload.subject)) return "Seleccioná la carrera, el año y la materia.";
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
  const publicResponsible = payload.responsible_is_public === true ? (payload.public_responsible || payload.responsible || "") : "";
  const result = { ...publicData, responsible_is_public: payload.responsible_is_public === true, public_responsible: publicResponsible, link_is_public: payload.link_is_public === true, meeting_url: payload.link_is_public === true ? meeting_url : "" };
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

function bulkAcademicDatePayload(item) {
  return {
    record_kind: "period",
    period_type: item.period_type,
    suspension_scope: item.period_type === "suspension" ? "full_day" : "",
    suspension_applies_to: item.period_type === "suspension" ? "classes" : "",
    date: item.date,
    end_date: item.end_date,
    start_time: "",
    end_time: "",
    name: item.name,
    secretary: ["recess", "restart", "suspension"].includes(item.period_type) ? "" : academicSecretary,
    activity_category: "",
    academic_activity_type: "",
    career: "",
    academic_year: "",
    subject: "",
    classroom: "",
    activity_type: "",
    activity_status: "scheduled",
    postponed_date: "",
    postponed_date_tbd: false,
    platform: "",
    meeting_url: "",
    link_is_public: false,
    more_info_url: "",
    requirements: item.description || "",
    observations: "",
    recording_required: false,
    source_uid: item.id,
    calendar_source: "Calendario Académico 2026–2027"
  };
}

function openBulkAcademicDates() {
  if (!state.canEdit) return;
  const list = el("bulkDatesPreview");
  list.replaceChildren();
  academicCalendarImportantDates.forEach((item) => {
    const li = document.createElement("li");
    const type = periodTypeLabel({ record_kind: "period", period_type: item.period_type, name: item.name });
    const title = document.createElement("strong");
    title.textContent = `${type} · ${item.name}`;
    const dates = document.createElement("span");
    dates.textContent = dateRangeLabel(item);
    li.append(title, dates);
    list.append(li);
  });
  el("bulkDatesCount").textContent = `${academicCalendarImportantDates.length} fechas destacadas`;
  el("bulkDatesMessage").hidden = true;
  bulkDatesDialog.showModal();
}

async function saveBulkAcademicDates(event) {
  event.preventDefault();
  if (!state.canEdit || state.academicCalendarBulkLoaded) return;
  const button = el("runBulkDates");
  const message = el("bulkDatesMessage");
  message.hidden = true;
  button.disabled = true;
  button.textContent = "Cargando…";
  try {
    if (!configured) throw new Error("La agenda no está conectada a Firebase.");

    const existing = await getDocs(collection(db, activitiesCollection));
    const configRecord = existing.docs.find((record) => isCalendarConfigRecord({ id: record.id, ...record.data() }));
    if (configRecord?.data()?.[academicCalendarBulkMarker] === true) {
      state.academicCalendarBulkLoaded = true;
      updateBulkAcademicDatesVisibility();
      bulkDatesDialog.close();
      showToast("Las fechas académicas ya fueron cargadas");
      return;
    }

    const knownSourceIds = new Set(existing.docs.map((record) => record.data().source_uid).filter(Boolean));
    const pending = academicCalendarImportantDates.filter((item) => !knownSourceIds.has(item.id));
    const batch = writeBatch(db);

    // Corrige la primera versión: elimina el período completo de cursado si llegó a cargarse antes del error.
    batch.delete(doc(db, activitiesCollection, "calacad-2026-cursado-segundo-semestre"));
    batch.delete(doc(db, privateActivitiesCollection, "calacad-2026-cursado-segundo-semestre"));

    pending.forEach((item) => {
      const payload = bulkAcademicDatePayload(item);
      batch.set(doc(db, activitiesCollection, item.id), { ...publicActivityData(payload), created_at: serverTimestamp(), updated_at: serverTimestamp() });
    });

    // El receso estival llega hasta 2027; extendemos 2026 al 31/12 y dejamos una marca persistente
    // para que esta carga inicial no vuelva a ofrecerse.
    const nextCalendar = normalizeCalendarConfig(state.calendarConfig);
    if (nextCalendar.years["2026"].end < "2026-12-31") nextCalendar.years["2026"].end = "2026-12-31";
    batch.set(doc(db, activitiesCollection, calendarConfigDocumentId), {
      record_kind: "calendar_config",
      date: `${calendarFirstYear}-01-01`,
      end_date: `${calendarLastYear}-12-31`,
      name: "Configuración del calendario",
      calendar_config: nextCalendar,
      [academicCalendarBulkMarker]: true,
      academic_calendar_loaded_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }, { merge: true });

    await batch.commit();

    state.calendarConfig = nextCalendar;
    state.academicCalendarBulkLoaded = true;
    bulkDatesDialog.close();
    updateBulkAcademicDatesVisibility();
    updateCleanupAgendaVisibility();
    state.cursor = fromISODate("2026-08-16");
    await loadPeriod();
    const skipped = academicCalendarImportantDates.length - pending.length;
    showToast(skipped ? `${pending.length} fechas nuevas cargadas · ${skipped} ya existían` : `${pending.length} fechas académicas cargadas`);
  } catch (error) {
    message.textContent = `No se pudo realizar la carga masiva. ${friendlyError(error)}`;
    message.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Cargar fechas";
  }
}

async function cleanupAgendaKeepingAcademicDates() {
  if (!state.canEdit || state.academicCalendarCleanupDone || state.hibridacionesBulkLoaded) return;
  const keepPublicIds = new Set([
    calendarConfigDocumentId,
    ...academicCalendarImportantDates.map((item) => item.id)
  ]);

  const warning = [
    "Esta acción eliminará de Firebase todas las actividades y fechas anteriores que no pertenezcan a la carga académica que acabamos de realizar.",
    "",
    `Se conservarán ${academicCalendarImportantDates.length} fechas académicas y la configuración del calendario.`,
    "",
    "Esta acción no se puede deshacer. ¿Querés continuar?"
  ].join("\n");

  if (!confirm(warning)) return;

  const button = el("cleanupAgenda");
  button.disabled = true;
  button.textContent = "Limpiando…";

  try {
    if (!configured) throw new Error("La agenda no está conectada a Firebase.");

    const [publicSnapshot, privateSnapshot] = await Promise.all([
      getDocs(collection(db, activitiesCollection)),
      getDocs(collection(db, privateActivitiesCollection))
    ]);

    const publicToDelete = publicSnapshot.docs.filter((record) => !keepPublicIds.has(record.id));
    const privateToDelete = privateSnapshot.docs;

    const deleteInChunks = async (records, getRef) => {
      for (let start = 0; start < records.length; start += 400) {
        const batch = writeBatch(db);
        records.slice(start, start + 400).forEach((record) => batch.delete(getRef(record)));
        await batch.commit();
      }
    };

    await deleteInChunks(publicToDelete, (record) => record.ref);
    await deleteInChunks(privateToDelete, (record) => record.ref);

    const markerBatch = writeBatch(db);
    markerBatch.set(doc(db, activitiesCollection, calendarConfigDocumentId), {
      [academicCalendarCleanupMarker]: true,
      academic_calendar_cleanup_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }, { merge: true });
    await markerBatch.commit();

    state.academicCalendarCleanupDone = true;
    updateCleanupAgendaVisibility();
    await loadPeriod();
    showToast(`${publicToDelete.length} registros anteriores eliminados`);
  } catch (error) {
    alert(`No se pudo limpiar la agenda. ${friendlyError(error)}`);
  } finally {
    button.disabled = false;
    button.textContent = "Eliminar datos anteriores";
  }
}


function hibridacionesSummaryRows() {
  const grouped = new Map();
  hibridaciones2026FromAugust16.forEach((item) => {
    const current = grouped.get(item.name) || { name: item.name, count: 0, first: item.date, last: item.date };
    current.count += 1;
    if (item.date < current.first) current.first = item.date;
    if (item.date > current.last) current.last = item.date;
    grouped.set(item.name, current);
  });
  return [...grouped.values()].sort((a, b) => a.first.localeCompare(b.first) || a.name.localeCompare(b.name, locale));
}

function openBulkHibridaciones() {
  if (!state.canEdit || state.hibridacionesBulkLoaded) return;
  const preview = el("hibridacionesPreview");
  preview.replaceChildren();
  hibridacionesSummaryRows().forEach((group) => {
    const li = document.createElement("li");
    const first = formatDate(fromISODate(group.first), { day: "numeric", month: "short" });
    const last = formatDate(fromISODate(group.last), { day: "numeric", month: "short" });
    const range = group.first === group.last ? first : `${first} – ${last}`;
    const title = document.createElement("strong");
    title.textContent = group.name;
    const meta = document.createElement("span");
    meta.textContent = `${group.count} ${group.count === 1 ? "evento" : "eventos"} · ${range}`;
    li.append(title, meta);
    preview.append(li);
  });
  el("hibridacionesCount").textContent = `${hibridaciones2026FromAugust16.length} actividades`;
  el("hibridacionesMessage").hidden = true;
  hibridacionesDialog.showModal();
}

async function saveBulkHibridaciones(event) {
  event.preventDefault();
  if (!state.canEdit || state.hibridacionesBulkLoaded) return;
  const message = el("hibridacionesMessage");
  const button = el("runBulkHibridaciones");
  button.disabled = true;
  button.textContent = "Cargando…";
  message.hidden = true;

  try {
    if (!configured) throw new Error("La agenda no está conectada a Firebase.");

    const existing = await getDocs(collection(db, activitiesCollection));
    const knownSourceUids = new Set(existing.docs.map((record) => record.data()?.source_uid).filter(Boolean));
    const pending = hibridaciones2026FromAugust16.filter((item) => !knownSourceUids.has(item.source_uid));

    if (pending.length) await writeNewActivities(pending);

    const markerBatch = writeBatch(db);
    markerBatch.set(doc(db, activitiesCollection, calendarConfigDocumentId), {
      record_kind: "calendar_config",
      date: `${calendarFirstYear}-01-01`,
      end_date: `${calendarLastYear}-12-31`,
      name: "Configuración del calendario",
      [hibridacionesBulkMarker]: true,
      hibridaciones_2026_loaded_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }, { merge: true });
    await markerBatch.commit();

    state.hibridacionesBulkLoaded = true;
    updateBulkHibridacionesVisibility();
    updateCleanupAgendaVisibility();
    hibridacionesDialog.close();
    await loadPeriod();

    const skipped = hibridaciones2026FromAugust16.length - pending.length;
    showToast(skipped
      ? `${pending.length} actividades nuevas cargadas · ${skipped} ya existían`
      : `${pending.length} actividades de Hibridaciones cargadas`);
  } catch (error) {
    message.textContent = `No se pudo realizar la carga. ${friendlyError(error)}`;
    message.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Cargar actividades";
  }
}


function gradeScheduleWeekdayNumber(code) {
  return ({ MO: 1, TU: 2, WE: 3, TH: 4, FR: 5 })[code] || 0;
}

function gradeScheduleDateIsSuspended(date) {
  const iso = toISODate(date);
  return state.allActivities.some((item) =>
    isImportantPeriod(item)
    && periodTypeKey(item) === "suspension"
    && item.date <= iso
    && activityEndDate(item) >= iso
  );
}

function gradeScheduleOccurrences() {
  const start = fromISODate("2026-08-16");
  const end = fromISODate("2026-11-06");
  const records = [];
  gradeSchedule2026Weekly.forEach((slot) => {
    const weekdayNumber = gradeScheduleWeekdayNumber(slot.weekday);
    for (let cursor = addDays(start, 1); cursor <= end; cursor = addDays(cursor, 1)) {
      if (cursor.getDay() !== weekdayNumber) continue;
      if (!isWithinConfiguredCalendar(cursor) || isHoliday(cursor) || gradeScheduleDateIsSuspended(cursor)) continue;
      const iso = toISODate(cursor);
      records.push({
        record_kind: "activity",
        date: iso,
        end_date: iso,
        start_time: slot.start_time,
        end_time: slot.end_time,
        name: slot.subject,
        secretary: academicSecretary,
        activity_category: "class",
        academic_activity_type: "class",
        career: lawCareer,
        academic_year: slot.academic_year,
        subject: slot.subject,
        responsible: "",
        classroom: slot.activity_type === "virtual" ? "" : slot.classroom,
        activity_type: slot.activity_type,
        activity_status: "scheduled",
        postponed_date: "",
        postponed_date_tbd: false,
        platform: "",
        account_used: "",
        meeting_url: "",
        link_is_public: false,
        more_info_url: "",
        requirements: "Horario de grado · Segundo semestre 2026",
        observations: "",
        recording_required: false,
        source_uid: `grado-2026-${slot.id}-${iso}`,
        calendar_source: "Horarios de Grado · Segundo semestre 2026"
      });
    }
  });
  return records.sort(sortActivities);
}

function gradeScheduleSeriesSummaryRows() {
  return gradeSchedule2026Weekly
    .map((slot) => ({
      ...slot,
      weekdayLabel: ({ MO: "Lunes", TU: "Martes", WE: "Miércoles", TH: "Jueves", FR: "Viernes" })[slot.weekday] || slot.weekday
    }))
    .sort((a, b) =>
      gradeScheduleWeekdayNumber(a.weekday) - gradeScheduleWeekdayNumber(b.weekday)
      || a.start_time.localeCompare(b.start_time)
      || a.subject.localeCompare(b.subject, locale)
    );
}

function openBulkGradeSchedule() {
  if (!state.canEdit || state.gradeScheduleBulkLoaded) return;
  const preview = el("gradeSchedulePreview");
  preview.replaceChildren();
  gradeScheduleSeriesSummaryRows().forEach((slot) => {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = slot.subject;
    const meta = document.createElement("span");
    const room = slot.activity_type === "virtual" ? "Virtual" : slot.classroom;
    meta.textContent = `${slot.weekdayLabel} · ${slot.start_time}–${slot.end_time} · ${room}`;
    li.append(title, meta);
    preview.append(li);
  });
  const occurrences = gradeScheduleOccurrences();
  el("gradeScheduleCount").textContent = `${gradeSchedule2026Weekly.length} horarios semanales · ${occurrences.length} clases previstas`;
  el("gradeScheduleMessage").hidden = true;
  gradeScheduleDialog.showModal();
}

function gradeScheduleMatchKey(item) {
  const subject = subjectBaseName(item?.subject || item?.name || "");
  return `${item?.date || ""}|${normalizeSearchText(subject)}`;
}

async function saveBulkGradeSchedule(event) {
  event.preventDefault();
  if (!state.canEdit || state.gradeScheduleBulkLoaded) return;
  const button = el("runBulkGradeSchedule");
  const message = el("gradeScheduleMessage");
  button.disabled = true;
  button.textContent = "Cargando…";
  message.hidden = true;

  try {
    if (!configured) throw new Error("La agenda no está conectada a Firebase.");

    const existing = await getDocs(collection(db, activitiesCollection));
    const configRecord = existing.docs.find((record) => isCalendarConfigRecord({ id: record.id, ...record.data() }));
    if (configRecord?.data()?.[gradeScheduleBulkMarker] === true) {
      state.gradeScheduleBulkLoaded = true;
      updateBulkGradeScheduleVisibility();
      gradeScheduleDialog.close();
      showToast("Los horarios de grado ya fueron cargados");
      return;
    }

    const existingItems = existing.docs
      .map((record) => ({ id: record.id, ...record.data() }))
      .filter((item) => !isCalendarConfigRecord(item));
    const knownSourceUids = new Set(existingItems.map((item) => item.source_uid).filter(Boolean));
    const knownClassKeys = new Set(
      existingItems
        .filter((item) => !isImportantPeriod(item))
        .map(gradeScheduleMatchKey)
        .filter((key) => !key.endsWith("|"))
    );

    const allOccurrences = gradeScheduleOccurrences();
    const pending = allOccurrences.filter((item) =>
      !knownSourceUids.has(item.source_uid)
      && !knownClassKeys.has(gradeScheduleMatchKey(item))
    );

    if (pending.length) await writeNewActivities(pending);

    const markerBatch = writeBatch(db);
    markerBatch.set(doc(db, activitiesCollection, calendarConfigDocumentId), {
      record_kind: "calendar_config",
      date: `${calendarFirstYear}-01-01`,
      end_date: `${calendarLastYear}-12-31`,
      name: "Configuración del calendario",
      [gradeScheduleBulkMarker]: true,
      grade_schedule_2026_loaded_at_v2: serverTimestamp(),
      updated_at: serverTimestamp()
    }, { merge: true });
    await markerBatch.commit();

    state.gradeScheduleBulkLoaded = true;
    updateBulkGradeScheduleVisibility();
    gradeScheduleDialog.close();
    await loadPeriod();

    const skipped = allOccurrences.length - pending.length;
    showToast(skipped
      ? `${pending.length} clases nuevas cargadas · ${skipped} ya existían o coincidían con Hibridaciones`
      : `${pending.length} clases de grado cargadas`);
  } catch (error) {
    message.textContent = `No se pudo realizar la carga. ${friendlyError(error)}`;
    message.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Cargar horarios";
  }
}


const legalClinicSeries2026 = [
  { id: "civil", weekday: 5, start_time: "09:30", end_time: "12:00", name: "Consultorio Jurídico Gratuito · Derecho Civil", responsible: "Abog. Blanca Mangione", location: "Espacio de Atención Consultorios Jurídicos Gratuitos", specialty: "Derecho Civil", monthlyMode: true },
  { id: "familia", weekday: 3, start_time: "11:30", end_time: "14:00", name: "Consultorio Jurídico Gratuito · Familia", responsible: "Abog. Gabriela Aromataris", location: "Espacio de Atención Consultorios Jurídicos Gratuitos", specialty: "Familia", monthlyMode: true },
  { id: "laboral", weekday: 4, start_time: "15:00", end_time: "17:20", name: "Consultorio Jurídico Gratuito · Laboral, Previsional y Administrativo", responsible: "Abog. Pablo De Bernardi", location: "Espacio de Atención Consultorios Jurídicos Gratuitos", specialty: "Laboral, Previsional y Administrativo", monthlyMode: true },
  { id: "penal", weekday: 2, start_time: "14:00", end_time: "16:20", name: "Consultorio Jurídico Gratuito · Derecho Penal", responsible: "Abog. Renzo Valente", location: "Espacio de Atención Consultorios Jurídicos Gratuitos", specialty: "Derecho Penal", monthlyMode: true },
  { id: "discapacidad", weekday: 1, start_time: "12:00", end_time: "14:30", name: "Consultorio Jurídico Gratuito · Discapacidad y Adulto Mayor", responsible: "", location: "Defensoría · Gutiérrez 51, Ciudad de Mendoza", specialty: "Discapacidad y Adulto Mayor", monthlyMode: false }
];

function legalClinicOccurrences() {
  const start = fromISODate("2026-08-16");
  const end = fromISODate("2026-12-19");
  const records = [];
  legalClinicSeries2026.forEach((series) => {
    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      if (cursor.getDay() !== series.weekday) continue;
      if (!isWithinConfiguredCalendar(cursor) || isHoliday(cursor)) continue;
      const iso = toISODate(cursor);
      let modality = "presential";
      if (series.monthlyMode) {
        const weekOfMonth = Math.floor((cursor.getDate() - 1) / 7) + 1;
        modality = weekOfMonth <= 2 ? "presential" : "telephone";
      }
      records.push({
        record_kind: "activity",
        date: iso,
        end_date: iso,
        start_time: series.start_time,
        end_time: series.end_time,
        name: series.name,
        secretary: extensionSecretary,
        activity_category: "legal_clinic",
        activity_category_custom: "",
        academic_activity_type: "",
        career: "",
        academic_year: "",
        subject: "",
        responsible: series.responsible,
        responsible_is_public: Boolean(series.responsible),
        public_responsible: series.responsible,
        classroom: modality === "presential" ? series.location : "",
        activity_type: modality,
        activity_status: "scheduled",
        postponed_date: "",
        postponed_date_tbd: false,
        platform: modality === "telephone" ? "Atención telefónica" : "",
        account_used: "",
        meeting_url: "",
        link_is_public: false,
        more_info_url: "https://turnos.derecho.uncu.edu.ar",
        requirements: modality === "telephone"
          ? "Atención telefónica. Reserve su turno previamente a través del sistema institucional."
          : "Atención presencial. Reserve su turno previamente a través del sistema institucional.",
        observations: "",
        recording_required: false,
        source_uid: `consultorio-juridico-2026-${series.id}-${iso}`,
        calendar_source: "Consultorios Jurídicos Gratuitos UNCUYO"
      });
    }
  });
  return records.sort(sortActivities);
}

function openBulkLegalClinics() {
  if (!state.canEdit || state.legalClinicsBulkLoaded) return;
  const preview = el("legalClinicsPreview");
  preview.replaceChildren();
  legalClinicSeries2026.forEach((series) => {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = series.name;
    const meta = document.createElement("span");
    const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][series.weekday];
    meta.textContent = `${dayName} · ${series.start_time}–${series.end_time}${series.responsible ? ` · ${series.responsible}` : ""}`;
    li.append(title, meta);
    preview.append(li);
  });
  const occurrences = legalClinicOccurrences();
  el("legalClinicsCount").textContent = `${legalClinicSeries2026.length} consultorios · ${occurrences.length} atenciones previstas`;
  el("legalClinicsMessage").hidden = true;
  legalClinicsDialog.showModal();
}

async function saveBulkLegalClinics(event) {
  event.preventDefault();
  if (!state.canEdit || state.legalClinicsBulkLoaded) return;
  const button = el("runBulkLegalClinics");
  const message = el("legalClinicsMessage");
  button.disabled = true;
  button.textContent = "Cargando…";
  message.hidden = true;
  try {
    if (!configured) throw new Error("La agenda no está conectada a Firebase.");
    const existing = await getDocs(collection(db, activitiesCollection));
    const configRecord = existing.docs.find((record) => isCalendarConfigRecord({ id: record.id, ...record.data() }));
    if (configRecord?.data()?.[legalClinicsBulkMarker] === true) {
      state.legalClinicsBulkLoaded = true;
      updateBulkLegalClinicsVisibility();
      legalClinicsDialog.close();
      showToast("Los Consultorios Jurídicos ya fueron cargados");
      return;
    }
    const existingBySourceUid = new Map(existing.docs.map((record) => [record.data().source_uid, record]).filter(([uid]) => Boolean(uid)));
    const allOccurrences = legalClinicOccurrences();
    const pending = allOccurrences.filter((item) => !existingBySourceUid.has(item.source_uid));
    const existingOccurrences = allOccurrences.filter((item) => existingBySourceUid.has(item.source_uid));
    if (pending.length) await writeNewActivities(pending);
    for (let start = 0; start < existingOccurrences.length; start += 100) {
      const batch = writeBatch(db);
      existingOccurrences.slice(start, start + 100).forEach((item) => {
        const current = existingBySourceUid.get(item.source_uid);
        batch.update(current.ref, { ...publicActivityUpdate(item), updated_at: serverTimestamp() });
        batch.set(doc(db, privateActivitiesCollection, current.id), privateActivityData(item), { merge: true });
      });
      await batch.commit();
    }
    const markerBatch = writeBatch(db);
    markerBatch.set(doc(db, activitiesCollection, calendarConfigDocumentId), {
      record_kind: "calendar_config",
      date: `${calendarFirstYear}-01-01`,
      end_date: `${calendarLastYear}-12-31`,
      name: "Configuración del calendario",
      [legalClinicsBulkMarker]: true,
      legal_clinics_2026_loaded_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }, { merge: true });
    await markerBatch.commit();
    state.legalClinicsBulkLoaded = true;
    updateBulkLegalClinicsVisibility();
    legalClinicsDialog.close();
    await loadPeriod();
    const skipped = allOccurrences.length - pending.length;
    showToast(existingOccurrences.length ? `${pending.length} atenciones nuevas · ${existingOccurrences.length} actualizadas` : `${pending.length} atenciones de Consultorios Jurídicos cargadas`);
  } catch (error) {
    message.textContent = `No se pudo realizar la carga. ${friendlyError(error)}`;
    message.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Cargar consultorios";
  }
}


const mediationCenterSeries2026 = [
  { id: "lunes", weekday: 1, start_time: "16:00", end_time: "20:00" },
  { id: "martes", weekday: 2, start_time: "10:00", end_time: "13:00" },
  { id: "miercoles", weekday: 3, start_time: "10:00", end_time: "13:00" },
  { id: "viernes", weekday: 5, start_time: "15:00", end_time: "20:00" }
];

function mediationCenterOccurrences() {
  const start = fromISODate("2026-08-16");
  const end = fromISODate("2026-11-27");
  const records = [];
  mediationCenterSeries2026.forEach((series) => {
    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      if (cursor.getDay() !== series.weekday) continue;
      if (!isWithinConfiguredCalendar(cursor) || isHoliday(cursor)) continue;
      const iso = toISODate(cursor);
      records.push({
        record_kind: "activity",
        date: iso,
        end_date: iso,
        start_time: series.start_time,
        end_time: series.end_time,
        name: "Centro de Mediación",
        secretary: extensionSecretary,
        activity_category: "service",
        activity_category_custom: "",
        academic_activity_type: "",
        career: "",
        academic_year: "",
        subject: "",
        responsible: "Mgter. Sara Curi",
        responsible_is_public: true,
        public_responsible: "Mgter. Sara Curi",
        classroom: "Área de Mediación",
        activity_type: "presential",
        activity_status: "scheduled",
        postponed_date: "",
        postponed_date_tbd: false,
        platform: "",
        account_used: "",
        meeting_url: "",
        link_is_public: false,
        more_info_url: "",
        requirements: "",
        observations: "",
        recording_required: false,
        source_uid: `centro-mediacion-2026-${series.id}-${iso}`,
        calendar_source: "Centro de Mediación 2026"
      });
    }
  });
  return records.sort(sortActivities);
}

function openBulkMediationCenter() {
  if (!state.canEdit || state.mediationCenterBulkLoaded) return;
  const preview = el("mediationCenterPreview");
  preview.replaceChildren();
  mediationCenterSeries2026.forEach((series) => {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = "Centro de Mediación";
    const meta = document.createElement("span");
    const dayName = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][series.weekday];
    meta.textContent = `${dayName} · ${series.start_time}–${series.end_time} · Mgter. Sara Curi`;
    li.append(title, meta);
    preview.append(li);
  });
  const occurrences = mediationCenterOccurrences();
  el("mediationCenterCount").textContent = `${occurrences.length} atenciones previstas`;
  el("mediationCenterMessage").hidden = true;
  mediationCenterDialog.showModal();
}

async function saveBulkMediationCenter(event) {
  event.preventDefault();
  if (!state.canEdit || state.mediationCenterBulkLoaded) return;
  const button = el("runBulkMediationCenter");
  const message = el("mediationCenterMessage");
  button.disabled = true;
  button.textContent = "Cargando…";
  message.hidden = true;
  try {
    if (!configured) throw new Error("La agenda no está conectada a Firebase.");
    const existing = await getDocs(collection(db, activitiesCollection));
    const configRecord = existing.docs.find((record) => isCalendarConfigRecord({ id: record.id, ...record.data() }));
    if (configRecord?.data()?.[mediationCenterBulkMarker] === true) {
      state.mediationCenterBulkLoaded = true;
      updateBulkMediationCenterVisibility();
      mediationCenterDialog.close();
      showToast("El Centro de Mediación ya fue cargado");
      return;
    }
    const knownSourceUids = new Set(existing.docs.map((record) => record.data().source_uid).filter(Boolean));
    const allOccurrences = mediationCenterOccurrences();
    const pending = allOccurrences.filter((item) => !knownSourceUids.has(item.source_uid));
    if (pending.length) await writeNewActivities(pending);
    const markerBatch = writeBatch(db);
    markerBatch.set(doc(db, activitiesCollection, calendarConfigDocumentId), {
      record_kind: "calendar_config",
      date: `${calendarFirstYear}-01-01`,
      end_date: `${calendarLastYear}-12-31`,
      name: "Configuración del calendario",
      [mediationCenterBulkMarker]: true,
      mediation_center_2026_loaded_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }, { merge: true });
    await markerBatch.commit();
    state.mediationCenterBulkLoaded = true;
    updateBulkMediationCenterVisibility();
    mediationCenterDialog.close();
    await loadPeriod();
    const skipped = allOccurrences.length - pending.length;
    showToast(skipped ? `${pending.length} atenciones nuevas cargadas · ${skipped} ya existían` : `${pending.length} atenciones del Centro de Mediación cargadas`);
  } catch (error) {
    message.textContent = `No se pudo realizar la carga. ${friendlyError(error)}`;
    message.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Cargar Centro de Mediación";
  }
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

function reportAudienceLabel(key) {
  return ({ pregrado: "Pregrado", grado: "Grado", posgrado: "Posgrado", general: "Actividades generales" })[key] || "Actividades generales";
}
function reportModalityKey(item) { return isImportantPeriod(item) ? "featured" : activityTypeKey(item); }
function reportModalityLabel(item) {
  return isImportantPeriod(item) ? "Fechas destacadas" : activityTypeLabel(item);
}
function populateReportOptions() {
  const yearSelect = el("reportYear");
  const currentYear = Math.min(Math.max(state.cursor.getFullYear(), calendarFirstYear), calendarLastYear);
  yearSelect.replaceChildren();
  for (let year = calendarFirstYear; year <= calendarLastYear; year += 1) {
    const option = document.createElement("option"); option.value = String(year); option.textContent = String(year); yearSelect.append(option);
  }
  yearSelect.value = String(currentYear);

  const secretarySelect = el("reportSecretary");
  const currentValue = secretarySelect.value || "all";
  const organizers = new Set(secretaryOptions);
  state.allActivities.forEach((item) => { const name = organizerName(item?.secretary); if (name) organizers.add(name); });
  secretarySelect.replaceChildren();
  const all = document.createElement("option"); all.value = "all"; all.textContent = "Todas"; secretarySelect.append(all);
  [...organizers].sort((a, b) => a.localeCompare(b, locale)).forEach((name) => {
    const option = document.createElement("option"); option.value = name; option.textContent = name; secretarySelect.append(option);
  });
  secretarySelect.value = [...secretarySelect.options].some((option) => option.value === currentValue) ? currentValue : "all";
}
function openReportForm() {
  if (!state.canEdit) return;
  populateReportOptions();
  const defaultType = ["day", "week", "month"].includes(state.view) ? state.view : "month";
  el("reportPeriodType").value = defaultType;
  el("reportOutputType").value = "detailed";
  el("reportGroupBy").value = "date";
  el("reportModality").value = "all";
  el("reportSecretary").value = "all";
  el("reportLevelFilter").value = "all";
  el("reportReferenceDate").value = toISODate(state.cursor);
  el("reportYear").value = String(Math.min(Math.max(state.cursor.getFullYear(), calendarFirstYear), calendarLastYear));
  const { visibleStart, visibleEnd } = periodRange();
  el("reportStartDate").value = toISODate(visibleStart);
  el("reportEndDate").value = toISODate(visibleEnd);
  el("reportMessage").hidden = true;
  el("reportMessage").textContent = "";
  updateReportFormFields();
  reportDialog.showModal();
}
function updateReportFormFields() {
  const periodType = el("reportPeriodType").value;
  const outputType = el("reportOutputType").value;
  el("reportReferenceDateField").hidden = ["year", "range"].includes(periodType);
  el("reportYearField").hidden = periodType !== "year";
  el("reportStartField").hidden = periodType !== "range";
  el("reportEndField").hidden = periodType !== "range";
  el("reportGroupField").hidden = outputType !== "detailed";
  const referenceLabels = { day: "Fecha", week: "Semana que contiene la fecha", month: "Mes que contiene la fecha" };
  const referenceField = el("reportReferenceDateField");
  const textNode = [...referenceField.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.nodeValue = `${referenceLabels[periodType] || "Fecha de referencia"}`;
}
function selectedReportRange() {
  const type = el("reportPeriodType").value;
  if (type === "year") {
    const year = Number(el("reportYear").value);
    const config = calendarConfigForYear(year);
    return {
      type,
      start: fromISODate(config?.start || `${year}-01-01`),
      end: fromISODate(config?.end || `${year}-12-31`)
    };
  }
  if (type === "range") {
    const startValue = el("reportStartDate").value;
    const endValue = el("reportEndDate").value;
    if (!validISODate(startValue) || !validISODate(endValue)) throw new Error("Seleccioná las dos fechas del rango.");
    const start = fromISODate(startValue); const end = fromISODate(endValue);
    if (start > end) throw new Error("La fecha Desde no puede ser posterior a Hasta.");
    return { type, start, end };
  }
  const value = el("reportReferenceDate").value;
  if (!validISODate(value)) throw new Error("Seleccioná una fecha de referencia.");
  const reference = fromISODate(value);
  if (type === "day") return { type, start: reference, end: reference };
  if (type === "week") { const start = startOfWeek(reference); return { type, start, end: addDays(start, 5) }; }
  const start = startOfMonth(reference); return { type: "month", start, end: new Date(start.getFullYear(), start.getMonth() + 1, 0) };
}
function reportRangeLabel(range) {
  if (range.type === "day") return formatDate(range.start, { day: "numeric", month: "long", year: "numeric" });
  if (range.type === "month") return titleCase(formatDate(range.start, { month: "long", year: "numeric" }));
  if (range.type === "year") return `Año ${range.start.getFullYear()}`;
  return `${formatDate(range.start, { day: "numeric", month: "long", year: "numeric" })} - ${formatDate(range.end, { day: "numeric", month: "long", year: "numeric" })}`;
}
function reportTypeLabel(range, outputType) {
  const period = ({ day: "diario", week: "semanal", month: "mensual", year: "anual", range: "por rango de fechas" })[range.type] || "";
  return `Informe ${outputType === "statistical" ? "estadístico" : "detallado"} ${period}`.trim();
}
function reportSelectionLabels() {
  const modality = el("reportModality");
  const secretary = el("reportSecretary");
  const level = el("reportLevelFilter");
  const labels = [];
  if (modality.value !== "all") labels.push(`Modalidad: ${modality.options[modality.selectedIndex]?.textContent || modality.value}`);
  if (secretary.value !== "all") labels.push(`Secretaría: ${secretary.value}`);
  if (level.value !== "all") labels.push(`Nivel: ${level.options[level.selectedIndex]?.textContent || level.value}`);
  return labels;
}
function reportItemMatchesSelections(item) {
  const modality = el("reportModality").value;
  const secretary = el("reportSecretary").value;
  const level = el("reportLevelFilter").value;
  if (modality !== "all" && reportModalityKey(item) !== modality) return false;
  if (secretary !== "all" && displayOrganizer(item) !== secretary) return false;
  if (level !== "all" && activityAudienceKey(item) !== level) return false;
  return true;
}
function selectedReportItems(range) {
  return expandedDisplayItems(state.allActivities)
    .filter((item) => reportItemMatchesSelections(item) && overlapsPeriod(item, range.start, range.end) && itemHasDisplayableDay(item, range.start, range.end))
    .sort(sortActivities);
}
function reportDetailedItemLines(item) {
  if (isImportantPeriod(item)) {
    const lines = [
      `${periodTypeLabel(item)}: ${item.name || "Sin detalle"}`,
      `Fecha/as: ${dateRangeLabel(item)}`,
      `Nivel: ${reportAudienceLabel(activityAudienceKey(item))}`,
      `Estado: ${importantPeriodStatus(item)}`
    ];
    const organizer = displayOrganizer(item); if (organizer) lines.push(`Organiza: ${organizer}`);
    const detail = item.period_description || item.requirements || item.observations;
    if (detail) lines.push(`Detalle: ${detail}`);
    return lines;
  }
  const lines = [
    item.name || "Actividad",
    `Fecha/as: ${dateRangeLabel(item)}`,
    `Horario: ${cleanTime(item.start_time)} a ${cleanTime(item.end_time)}`,
    `Tipo: ${activityDescriptor(item)}`,
    `Modalidad: ${activityTypeLabel(item)}`,
    `Nivel: ${reportAudienceLabel(activityAudienceKey(item))}`
  ];
  const organizer = displayOrganizer(item); if (organizer) lines.push(`Organiza: ${organizer}`);
  if (activityStatusKey(item) !== "scheduled") lines.push(`Estado: ${activityStatusLabel(item)}${isPostponed(item) ? ` - ${postponedDateLabel(item)}` : ""}`);
  if (item.career) lines.push(`Carrera: ${item.career}`);
  if (item.subject && !isIngreso(item)) lines.push(`Materia: ${subjectBaseName(item.subject)}`);
  if (itemAcademicYear(item)) lines.push(`Año: ${itemAcademicYear(item)}`);
  const reportResponsible = state.canEdit ? (item.responsible || item.public_responsible) : (item.responsible_is_public === true ? item.public_responsible : "");
  if (reportResponsible) lines.push(`Responsable: ${reportResponsible}`);
  if (item.classroom) lines.push(`Lugar: ${item.classroom}`);
  if (activityTypeKey(item) !== "presential" && item.platform) lines.push(`Plataforma: ${item.platform}`);
  if (activityTypeKey(item) !== "presential" && item.link_is_public === true && item.meeting_url) lines.push(`Enlace público: ${item.meeting_url}`);
  return lines;
}
function reportGroupLabel(item, groupBy) {
  if (groupBy === "modality") return reportModalityLabel(item);
  if (groupBy === "secretary") return displayOrganizer(item) || "Sin secretaría / área";
  if (groupBy === "level") return reportAudienceLabel(activityAudienceKey(item));
  return "";
}
function sortReportItems(items, groupBy) {
  if (groupBy === "date") return [...items].sort(sortActivities);
  return [...items].sort((a, b) => {
    const groupCompare = reportGroupLabel(a, groupBy).localeCompare(reportGroupLabel(b, groupBy), locale);
    return groupCompare || sortActivities(a, b);
  });
}
function countReportItems(items, keyFn) {
  const counts = new Map();
  items.forEach((item) => {
    const key = keyFn(item) || "Sin especificar";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], locale));
}
function hexRgb(hex) {
  const clean = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return [2, 55, 100];
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}
function pdfBase(doc, range, outputType, items) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const blue = hexRgb("#023764");
  const gold = hexRgb("#C5AD68");
  const gray = hexRgb("#66737C");
  let y = 18;
  const ensureSpace = (needed = 18) => {
    if (y + needed <= pageHeight - 16) return;
    doc.addPage(); y = 18;
  };
  const header = () => {
    doc.setFillColor(...blue); doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("UNCUYO - Facultad de Derecho", margin, 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text("Agenda institucional de actividades", margin, 19);
  };
  header(); y = 38;
  doc.setTextColor(...blue); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(reportTypeLabel(range, outputType), margin, y); y += 8;
  doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(...gray); doc.text(reportRangeLabel(range), margin, y); y += 9;
  doc.setFillColor(...gold); doc.roundedRect(margin, y - 5, 37, 9, 2, 2, "F");
  doc.setTextColor(25, 25, 25); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(`${items.length} ${items.length === 1 ? "evento" : "eventos"}`, margin + 3, y + 1); y += 12;
  const selections = reportSelectionLabels();
  if (selections.length) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...gray);
    const lines = doc.splitTextToSize(`Filtros: ${selections.join(" | ")}`, contentWidth); doc.text(lines, margin, y); y += lines.length * 4 + 5;
  }
  return { pageWidth, pageHeight, margin, contentWidth, blue, gold, gray, ensureSpace, getY: () => y, setY: (value) => { y = value; } };
}
function addPdfFooters(doc, layout) {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...layout.gray);
    doc.text(`Generado el ${formatDate(new Date(), { day: "2-digit", month: "2-digit", year: "numeric" })}`, layout.margin, layout.pageHeight - 8);
    doc.text(`Página ${page} de ${totalPages}`, layout.pageWidth - layout.margin, layout.pageHeight - 8, { align: "right" });
  }
}
function drawStatisticalBreakdown(doc, layout, title, rows, total) {
  let y = layout.getY();
  layout.ensureSpace(18); y = layout.getY();
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...layout.blue); doc.text(title, layout.margin, y); y += 6;
  if (!rows.length) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...layout.gray); doc.text("Sin datos", layout.margin, y); y += 6; layout.setY(y); return;
  }
  rows.forEach(([label, count]) => {
    layout.setY(y); layout.ensureSpace(7); y = layout.getY();
    const percentage = total ? (count / total) * 100 : 0;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(48, 55, 60);
    const labelLines = doc.splitTextToSize(label, layout.contentWidth - 42);
    doc.text(labelLines, layout.margin, y);
    doc.setFont("helvetica", "bold"); doc.text(`${count} · ${percentage.toLocaleString(locale, { maximumFractionDigits: 1 })}%`, layout.pageWidth - layout.margin, y, { align: "right" });
    y += Math.max(5, labelLines.length * 4.2);
  });
  y += 4; layout.setY(y);
}
function renderDetailedPdf(doc, layout, items) {
  const modalityCounts = countReportItems(items, reportModalityLabel);
  const summary = modalityCounts.map(([label, count]) => `${label}: ${count}`).join("  |  ");
  let y = layout.getY();
  if (summary) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...layout.blue);
    const summaryLines = doc.splitTextToSize(summary, layout.contentWidth); doc.text(summaryLines, layout.margin, y); y += summaryLines.length * 4.5 + 6;
  }
  const groupBy = el("reportGroupBy").value;
  const sortedItems = sortReportItems(items, groupBy);
  let previousGroup = null;
  sortedItems.forEach((item) => {
    if (groupBy !== "date") {
      const group = reportGroupLabel(item, groupBy);
      if (group !== previousGroup) {
        layout.setY(y); layout.ensureSpace(12); y = layout.getY();
        doc.setFillColor(235, 241, 245); doc.roundedRect(layout.margin, y - 4, layout.contentWidth, 8, 1.5, 1.5, "F");
        doc.setTextColor(...layout.blue); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.text(group, layout.margin + 4, y + 1); y += 9;
        previousGroup = group;
      }
    }
    const lines = reportDetailedItemLines(item);
    const title = lines.shift() || "Evento";
    const titleLines = doc.splitTextToSize(title, layout.contentWidth - 8);
    const detailLines = lines.flatMap((line) => doc.splitTextToSize(line, layout.contentWidth - 8));
    const height = Math.max(20, 8 + titleLines.length * 5 + detailLines.length * 4.2);
    layout.setY(y); layout.ensureSpace(height + 5); y = layout.getY();
    doc.setDrawColor(218, 224, 228); doc.setFillColor(248, 250, 251); doc.roundedRect(layout.margin, y, layout.contentWidth, height, 2, 2, "FD");
    doc.setFillColor(...(isImportantPeriod(item) ? layout.gold : layout.blue)); doc.rect(layout.margin, y, 2.5, height, "F");
    let iy = y + 7;
    doc.setTextColor(...layout.blue); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.text(titleLines, layout.margin + 6, iy); iy += titleLines.length * 5 + 1;
    doc.setTextColor(50, 55, 60); doc.setFont("helvetica", "normal"); doc.setFontSize(8.7);
    detailLines.forEach((line) => { doc.text(line, layout.margin + 6, iy); iy += 4.2; });
    y += height + 5;
  });
  layout.setY(y);
}
function renderStatisticalPdf(doc, layout, items) {
  let y = layout.getY();
  const activityCount = items.filter((item) => !isImportantPeriod(item)).length;
  const featuredCount = items.length - activityCount;
  const activeOrganizers = new Set(items.map((item) => displayOrganizer(item)).filter(Boolean)).size;
  const cards = [
    ["Actividades", activityCount],
    ["Fechas destacadas", featuredCount],
    ["Áreas organizadoras", activeOrganizers]
  ];
  cards.forEach(([label, value]) => {
    layout.setY(y); layout.ensureSpace(12); y = layout.getY();
    doc.setFillColor(248, 250, 251); doc.setDrawColor(218, 224, 228); doc.roundedRect(layout.margin, y, layout.contentWidth, 10, 2, 2, "FD");
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...layout.gray); doc.text(label, layout.margin + 4, y + 6.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...layout.blue); doc.text(String(value), layout.pageWidth - layout.margin - 4, y + 6.8, { align: "right" });
    y += 13;
  });
  y += 3; layout.setY(y);
  drawStatisticalBreakdown(doc, layout, "Distribución por modalidad", countReportItems(items, reportModalityLabel), items.length);
  drawStatisticalBreakdown(doc, layout, "Distribución por secretaría / área", countReportItems(items, (item) => displayOrganizer(item) || "Sin secretaría / área"), items.length);
  drawStatisticalBreakdown(doc, layout, "Distribución por nivel", countReportItems(items, (item) => reportAudienceLabel(activityAudienceKey(item))), items.length);
}
async function generateReportPdf(event) {
  event.preventDefault();
  if (!state.canEdit) return;
  const message = el("reportMessage"); message.hidden = true; message.textContent = "";
  const JsPdf = window.jspdf?.jsPDF;
  if (!JsPdf) { message.textContent = "No se pudo cargar el generador de PDF. Revisá la conexión a Internet y actualizá la página."; message.hidden = false; return; }
  try {
    const range = selectedReportRange();
    const items = selectedReportItems(range);
    if (!items.length) throw new Error("No hay eventos para el período y los filtros seleccionados.");
    const outputType = el("reportOutputType").value;
    const doc = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4" });
    const layout = pdfBase(doc, range, outputType, items);
    if (outputType === "statistical") renderStatisticalPdf(doc, layout, items);
    else renderDetailedPdf(doc, layout, items);
    addPdfFooters(doc, layout);
    const slugType = outputType === "statistical" ? "estadistico" : "detallado";
    const slugPeriod = ({ day: "diario", week: "semanal", month: "mensual", year: "anual", range: "rango" })[range.type] || "agenda";
    doc.save(`informe-${slugType}-${slugPeriod}-${toISODate(range.start)}.pdf`);
    reportDialog.close();
  } catch (error) {
    message.textContent = error?.message || `No se pudo generar el PDF. ${friendlyError(error)}`;
    message.hidden = false;
  }
}


function friendlyError(error) {
  const code = error?.code || "";
  if (code === "auth/unauthorized-domain") return "Falta autorizar el dominio de GitHub Pages en Firebase.";
  if (code === "auth/popup-blocked") return "El navegador bloqueó la ventana de Google. Permití ventanas emergentes e intentá nuevamente.";
  if (code === "auth/network-request-failed") return "No se pudo contactar a Google/Firebase. Revisá la conexión a Internet.";
  if (code === "permission-denied" || code === "firestore/permission-denied") return "La cuenta no tiene permiso para realizar esta acción.";
  if (code === "unavailable" || code === "firestore/unavailable") return "No hay conexión con Firebase. Revisá Internet e intentá nuevamente.";
  return error?.message || "Intentá nuevamente.";
}

init().catch((error) => {
  status.textContent = `No se pudo iniciar la agenda. ${friendlyError(error)}`;
});
