# Agenda de Actividades · v61 rendimiento

Versión de producción optimizada para GitHub Pages + Firebase.

## Optimizaciones principales

- La agenda consulta solo el período visible en Firestore.
- Caché breve en memoria para volver a períodos ya consultados sin repetir lecturas.
- Las fechas destacadas se cachean por 5 minutos.
- La configuración del calendario se consulta una sola vez por sesión de página.
- Los datos privados del administrador se cargan solo al abrir una actividad o al generar un informe detallado.
- Firebase Authentication se carga después de que la agenda pública ya fue dibujada.
- jsPDF se descarga solamente al solicitar un informe PDF.
- Los detalles de las tarjetas se construyen al abrir “Más información”, no para todas las tarjetas de antemano.
- La búsqueda utiliza debounce y un índice textual en memoria.
- Día/Semana/Mes usan un índice por fecha generado una sola vez por render.
- La vista Mes construye solo la versión de escritorio o la versión móvil, no ambas a la vez.
- La actualización automática cada minuto se limita a la vista Día, donde se usa “Empieza en / En curso / transcurridos”.
- Se usa `content-visibility` para no renderizar jornadas fuera de pantalla hasta que sean necesarias.
- Se retiraron del bundle de producción las cargas masivas históricas de una sola vez. Los datos ya migrados permanecen en Firebase.
- Se eliminó del sitio público cualquier payload histórico de migración que pudiera contener información administrativa interna.

## Administración que se conserva

- Carga manual, edición, duplicación y eliminación de actividades.
- Fechas destacadas y suspensiones.
- Actualización del calendario y feriados.
- Importación de calendario ICS.
- Informes PDF detallados y estadísticos.
- Inicio/cierre de sesión con Firebase Authentication.



## v62 - Informes y limpieza de migraciones
- Se eliminan de forma defensiva los antiguos controles de cargas masivas (incluido "Cargar horarios de tecnicatura").
- El PDF incorpora el logo institucional en el encabezado.
- Ambos informes suman días hábiles considerados, actividades programadas, efectuadas, suspendidas y reprogramadas.
- Se informan rangos horarios de turno mañana/tarde, uso de aulas/espacios, uso de plataformas y cantidad de actividades por horario.
- El informe detallado mantiene aula/lugar y plataforma dentro de cada evento.
