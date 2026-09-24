# Agenda de Actividades · v52 rendimiento

Esta versión optimiza la carga de Firestore: solo consulta el período visible, carga datos privados únicamente para los eventos visibles y usa un conteo agregado para el total. Los informes cargan el rango solicitado solo al generarse.

# Agenda de Actividades · v51

Versión conectada a Firebase/Firestore para publicación en GitHub Pages.

## v51 · Agrupación visual y actualización del Ingreso 2027

- Las clases de Grado que coinciden en una misma fecha se muestran agrupadas en una sola tarjeta, con el rango horario total y las aulas involucradas. Al desplegarla se ve el detalle de todas las clases.
- La Modalidad Extensiva del Ingreso 2027 se agrupa de la misma manera cuando hay varias comisiones/turnos el mismo día.
- La visualización mensual también usa las tarjetas agrupadas para reducir la carga visual.
- Se incorpora una actualización única del Ingreso 2027: seis comisiones definitivas de los viernes, Modalidad Intensiva · Módulo I y las evaluaciones/recuperatorios de febrero y marzo de 2027.
- La Comisión 3 queda en Aula C; se eliminan los registros provisorios “Otras comisiones”.


## Conexión real con Firebase

- El ícono de administración abre el inicio de sesión de Google mediante Firebase Authentication.
- La cuenta administradora configurada es `facultad@derecho.uncu.edu.ar`.
- Las altas, ediciones, eliminaciones y cambios de calendario se guardan en Cloud Firestore.
- La colección pública es `actividades`.
- Los datos internos se guardan en `actividades_privadas`.
- Los enlaces privados y los campos internos no se escriben en la colección pública.
- La seguridad efectiva depende de las reglas publicadas en Firestore; la interfaz del navegador no concede permisos por sí sola.

## Persistencia de la sesión

Firebase Authentication utiliza `browserLocalPersistence`. Mientras la persona no pulse **Cerrar sesión**, la sesión de administración queda recordada en ese navegador incluso después de recargar o cerrar y volver a abrir la página.

No se guardan contraseñas ni permisos manualmente en `localStorage`; la sesión la administra Firebase Authentication.

## Recuerdo de la visualización

En cada navegador se recuerda localmente:

- Vista Día / Semana / Mes.
- Fecha o período consultado.
- Checks de modalidad.
- Checks de Pregrado / Grado / Posgrado / Actividades generales.
- Texto del buscador.

Estas preferencias se guardan en `localStorage` y no contienen datos privados de las actividades.

## Generador de informes PDF

Desde el modo administrador, **Informe PDF** abre un generador que permite elegir:

- Período: diario, semanal, mensual, anual o rango de fechas.
- Nivel de salida: **Detallado** o **Estadístico**.
- Filtro por modalidad.
- Filtro por Secretaría / área.
- Filtro por nivel: Pregrado, Grado, Posgrado o Actividades generales.

El informe detallado puede organizarse por fecha, modalidad, Secretaría / área o nivel.

El informe estadístico incluye totales y distribuciones porcentuales por modalidad, Secretaría / área y nivel.

## Interfaz móvil

Los filtros de modalidad y nivel se mantienen en dos filas compactas. Si el ancho de la pantalla no alcanza, cada fila puede desplazarse horizontalmente sin generar líneas adicionales.

## Publicación en GitHub Pages

Subir todo el contenido de esta carpeta a la raíz del repositorio, conservando `assets` y `firebase`.

El dominio de GitHub Pages debe estar autorizado en Firebase Authentication:

`siedfduncuyo-star.github.io`

Después de reemplazar una versión anterior, hacer una recarga forzada (`Ctrl + F5`).


## v37
- Secretaría Académica: nueva categoría **Examen Global de Conocimientos**.
- Nuevos tipos de fecha destacada: **Cursado** y **Cierre académico**.
- Carga masiva idempotente del Calendario Académico desde el 16/08/2026, con 19 registros (incluye el segundo semestre vigente desde el 03/08/2026).
- La carga no duplica registros ya existentes y extiende el calendario 2026 al 31/12 para mostrar completo el receso estival.


## v38
- Corrige el ID reservado de Firestore para la configuración del calendario (`agenda_calendar_config`).
- La carga inicial de fechas académicas es de una sola vez y el botón desaparece tras completarse.
- Si la v37 alcanzó a cargar el período completo del segundo semestre antes del error, v38 lo elimina automáticamente.
- No se muestra todo el cursado del segundo semestre: se incorpora únicamente `Fin del cursado · Segundo semestre 2026` el 6/11/2026.


## v39 · Limpieza inicial única

- Agrega una acción de administración `Eliminar datos anteriores` que aparece únicamente después de la carga del calendario académico inicial.
- Conserva exclusivamente las 19 fechas académicas cargadas en la tanda 2026–2027 y `agenda_calendar_config`.
- Elimina el resto de los documentos de `actividades` y todos los documentos de `actividades_privadas`.
- Requiere confirmación explícita porque la operación no se puede deshacer.
- Al finalizar guarda `academic_calendar_cleanup_done` en la configuración y el botón desaparece definitivamente.


## v40 · Copia de la vista pública

- Se agregó un botón de copia junto al contador de eventos de la vista.
- Copia los eventos visibles de Día, Semana o Mes respetando los filtros de modalidad, nivel y el buscador.
- La copia masiva usa exclusivamente información pública: nunca incluye responsable, requerimientos, observaciones internas ni enlaces privados.
- Las fechas destacadas se incluyen cuando ese filtro está activo.
- Los enlaces se incorporan únicamente cuando son públicos.


## v41
- Las fechas destacadas pueden guardarse sin organizador; las actividades con horario siguen requiriendo un área organizadora.
- Receso se muestra como una marca de calendario en su fecha de inicio, sin tarjeta ni organizador.
- El día posterior al fin del receso se muestra automáticamente como “Reinicio de actividades”, también como marca de calendario.
- Se agregó “Reinicio de actividades” como tipo de fecha destacada para futuras cargas manuales.
- Los estados futuros de fechas destacadas muestran “En N días” en lugar de “Próximamente” y se recalculan automáticamente.


## v42 · Carga de Hibridaciones desde 16/08/2026
- Incorpora una carga masiva única de 58 actividades extraídas del calendario Hibridaciones 2026.
- Expande recurrencias semanales en encuentros individuales.
- Mantiene enlaces, cuentas y notas técnicas en la colección privada; los enlaces importados no se publican.
- Clasifica automáticamente solo cuando la fuente lo permite con claridad (Académica/Posgrado); el resto queda sin organizador.
- La acción aparece después de completar la limpieza de datos anteriores, desaparece luego de cargarse y omite registros ya existentes por `source_uid`.


## v43 — Tipos de actividad comunes
- Todas las áreas organizadoras incorporan **Charla informativa** y **Otro**.
- Al elegir **Otro**, aparece un campo obligatorio para escribir el tipo de actividad.
- El texto personalizado se conserva y se muestra en tarjetas, detalle, búsqueda, copias e informes.


## v44 - Carga masiva de horarios de Grado

- Incorpora una carga única de los horarios del PDF `Horarios.pdf`.
- Período: desde el 16/08/2026 hasta el fin del cursado del 06/11/2026.
- 70 franjas semanales de Abogacía (lunes, martes, miércoles y jueves, según el PDF corregido).
- Se excluyen automáticamente feriados y períodos de suspensión del dictado de clases.
- Las filas genéricas `Optativa` no se duplican: se cargan las optativas específicas listadas en el documento.
- Si una clase ya existe por la importación de Hibridaciones (por ejemplo Derecho del Transporte o Derecho Público Provincial y Municipal), esa ocurrencia se omite.
- La carga queda marcada en Firebase y el botón desaparece después de completarse.
- El PDF recibido no contiene columnas de jueves o viernes; esta versión no infiere esos horarios.

## v46 · Suspensión por turno
- Las fechas destacadas de tipo **Suspensión de actividades** permiten elegir **Turno mañana**, **Turno tarde** o **Día completo**.
- El motivo se carga en el campo **Motivo / detalle** y no requiere organizador.
- Las actividades alcanzadas por una suspensión manual se muestran como suspendidas sin modificar cada registro individual.
- El turno mañana comprende actividades que comienzan antes de las 14:00; el turno tarde, las que comienzan desde las 14:00.
- Las suspensiones históricas del Calendario Académico que refieren al dictado de clases continúan afectando solo clases.

## v48 · Consultorios Jurídicos Gratuitos
- Incorpora una carga masiva única de los Consultorios Jurídicos Gratuitos desde el 16/08/2026 hasta el 19/12/2026.
- Secretaría organizadora: **Secretaría de Extensión, Vinculación y Territorio**.
- Nuevo tipo de actividad: **Consultorio jurídico**.
- Áreas: Derecho Civil, Familia, Laboral/Previsional/Administrativo, Derecho Penal y Discapacidad/Adulto Mayor.
- En las áreas principales, las dos primeras semanas de cada mes se muestran como **Presencial** y las restantes como **Telefónica**.
- Se incorpora **Telefónica** como modalidad y como filtro público/reportable.
- La atención de Discapacidad y Adulto Mayor se mantiene presencial en la Defensoría.
- El docente a cargo puede marcarse como responsable público mediante `Mostrar responsable en la vista pública`; los demás responsables siguen siendo privados por defecto.
- La carga usa `source_uid` estable y un marcador en `agenda_calendar_config`, por lo que no duplica registros y el botón desaparece al completarse.


## v48

- En la vista pública, el campo visible pasa a llamarse simplemente **Responsable**.
- Los Consultorios Jurídicos presenciales usan como lugar **Espacio de Atención Consultorios Jurídicos Gratuitos**.
- Se agrega una carga única del **Centro de Mediación**, Secretaría de Extensión, Vinculación y Territorio.
- Responsable público: **Mgter. Sara Curi**.
- Horarios: lunes 16:00–20:00; martes 10:00–13:00; miércoles 10:00–13:00; viernes 15:00–20:00.
- Repite desde el 16 de agosto hasta el viernes 27 de noviembre de 2026, omitiendo feriados configurados.
- Lugar: **Área de Mediación**.

## v49 · Ingreso y Posgrado

- Se elimina el check público **Telefónicas**. Las atenciones telefónicas continúan visibles, pero ya no tienen un filtro independiente.
- Los **Consultorios Jurídicos Gratuitos** y el **Centro de Mediación** quedan excluidos de las suspensiones generales de actividades.
- Nueva carga única `Cargar ingreso y posgrados`, con 121 eventos desde el 16/08/2026:
  - Modalidad Extensiva del Ingreso 2027.
  - Maestría en Derecho de las Familias y sus seminarios 2026.
  - Diplomatura de Posgrado en Derechos de las Personas con Discapacidad.
  - Diplomatura de Posgrado en Mediación y Gestión Participativa de Conflictos.
- Las clases presenciales de la Maestría en Derecho de las Familias se ubican en **Aula Magna**.
- Para Ingreso Extensivo se cargan miércoles virtuales y viernes presenciales, dejando provisoriamente separadas las comisiones híbridas conocidas: Comisión 1 TM (Aula B) y Comisión 3 TT (Aula B). El resto queda agrupado como `Otras comisiones` hasta completar aulas y enlaces.
- Cuando una fuente informa fecha y duración pero no el horario concreto, la agenda muestra **Horario a confirmar** en lugar de inventar una hora.


## v53 — corrección de caché
- Fuerza `config.js?v=53-20260924` y `app.js?v=53-20260924` para evitar que GitHub Pages/navegador reutilicen la v51.
- Mantiene la carga por período visible y el resto de optimizaciones de la v52.
- No modifica ni borra datos de Firebase.

## v54
- Las suspensiones se muestran antes que cualquier otra fecha destacada o actividad.
- Después se muestran los demás períodos/fechas importantes.
- Las actividades quedan debajo, ordenadas por horario.
- Una suspensión no afecta actividades Virtuales ni Telefónicas.

## v55
- Divide las clases de Grado en dos grupos diarios: **Turno mañana** y **Turno tarde**.
- En Primer y Segundo año respeta las marcas TM/TT; en el resto usa el horario de inicio (antes de 14:00 = mañana; desde 14:00 = tarde).
- Dentro de cada grupo, en vista Día, cada clase muestra cuánto falta para comenzar o cuánto tiempo lleva transcurrido.
- Las clases ya finalizadas se atenúan progresivamente igual que las actividades individuales.
- Si todas las clases de un grupo ya terminaron, también se atenúa la tarjeta agrupada.


## v56 · Turno académico de Grado

- La agrupación **Clases de Grado · Turno mañana / Turno tarde** prioriza el turno académico real de la comisión/cátedra sobre la hora de la clase.
- En 1.º y 2.º año se reconoce TM/TT por el dato explícito y por el identificador estable de la carga masiva.
- Una clase del TM que se extienda después de las 14:00 (por ejemplo, Derecho Penal Parte General II) continúa dentro de **Turno mañana**.
- Solo cuando una actividad de Grado no tiene turno académico asignado se usa la hora de inicio: antes de las 14:00 = mañana; desde las 14:00 = tarde.
- No requiere recargar ni modificar los documentos ya existentes en Firebase.
