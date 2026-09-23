# Agenda de Actividades · v36

Versión conectada a Firebase/Firestore para publicación en GitHub Pages.

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
