# Agenda de Actividades · v34

Versión conectada a Firebase/Firestore para publicación en GitHub Pages.

## Conexión real con Firebase

- Se elimina el uso de `?demo=1` como mecanismo de administración.
- El ícono de administración abre el inicio de sesión de Google mediante Firebase Authentication.
- La cuenta administradora configurada es `facultad@derecho.uncu.edu.ar`.
- Las altas, ediciones, eliminaciones, importaciones y cambios de calendario se guardan realmente en Cloud Firestore.
- La colección pública es `actividades`.
- Los datos internos se guardan en `actividades_privadas`.
- Los enlaces privados y los campos internos no se escriben en la colección pública.
- La seguridad efectiva depende de las reglas publicadas en Firestore; la interfaz del navegador no concede permisos por sí sola.

## Recuerdo de la última visualización

En cada navegador se recuerda localmente:

- Vista Día / Semana / Mes.
- Fecha o período que se estaba consultando.
- Checks de modalidad.
- Checks de Pregrado / Grado / Posgrado / Actividades generales.
- Texto del buscador.

Estas preferencias se guardan únicamente en `localStorage`. No se guardan allí contraseñas, tokens, permisos, enlaces privados ni información de `actividades_privadas`.

## Publicación en GitHub Pages

Subir todo el contenido de esta carpeta a la raíz del repositorio, conservando `assets` y `firebase`.

El dominio de GitHub Pages debe estar autorizado en Firebase Authentication. Para esta publicación se utiliza:

`siedfduncuyo-star.github.io`

Después de reemplazar una versión anterior, hacer una recarga forzada del navegador (`Ctrl + F5`).

## Prueba recomendada

1. Abrir la agenda pública sin iniciar sesión y comprobar que carga normalmente.
2. Tocar el ícono de administración.
3. Elegir `facultad@derecho.uncu.edu.ar`.
4. Cargar una actividad de prueba.
5. Verificar en Firestore que se creó un documento en `actividades` y otro, con el mismo ID, en `actividades_privadas`.
6. Probar una actividad con enlace privado y confirmar que `meeting_url` queda vacío en `actividades` y completo en `actividades_privadas`.
