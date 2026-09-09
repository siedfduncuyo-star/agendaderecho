# Agenda de Hibridaciones — Facultad de Derecho

Agenda institucional responsive para consultar y coordinar actividades híbridas desde un único enlace.

## Qué incluye

- Vista semanal compacta: día, horario, actividad y aula.
- Detalle desplegable con Secretaría, responsable, plataforma, cuenta, aula, grabación y requerimientos/observaciones.
- Botones para abrir o copiar el enlace de la reunión.
- Vista mensual en calendario; en celular se transforma en una lista cómoda de leer.
- Carga manual, edición, duplicación y eliminación.
- Importación de archivos `.ics` exportados desde Google Calendar.
- Consulta pública y modificación restringida a correos autorizados.
- Tipografía Montserrat, color institucional `#014a7d` y logo oficial.

## Arquitectura

- **Interfaz:** HTML, CSS y JavaScript sin compilación.
- **Alojamiento:** GitHub Pages.
- **Datos y acceso:** Supabase gratuito.
- **Importación:** el navegador lee el archivo `.ics` y guarda sus eventos en Supabase. No se entrega acceso a la cuenta de Google.

## Estructura

```text
agenda-hibrida-derecho/
├── assets/
│   └── logo-fd-blanco.png
├── supabase/
│   └── setup.sql
├── index.html
├── styles.css
├── app.js
├── config.js
├── .nojekyll
└── README.md
```

## Probar la aplicación

Abrí `index.html`. Mientras `config.js` esté vacío funcionará en modo de prueba, con tres actividades de ejemplo y datos guardados únicamente en ese navegador.

## Configuración inicial con Supabase

1. Crear una cuenta y un proyecto gratuito en [Supabase](https://supabase.com/).
2. Abrir **SQL Editor → New query**.
3. Abrir `supabase/setup.sql` y reemplazar los dos correos de ejemplo por los correos reales del equipo autorizado.
4. Copiar todo el contenido del archivo, pegarlo en el editor y presionar **Run**.
5. Abrir **Project Settings → API** y copiar **Project URL** y la clave **anon public** o **publishable**.
6. Pegarlas en `config.js`:

   ```js
   window.AGENDA_CONFIG = {
     supabaseUrl: "https://TU-PROYECTO.supabase.co",
     supabaseAnonKey: "TU-CLAVE-PUBLICA"
   };
   ```

Nunca colocar aquí una clave `service_role` o `secret`.

### Si ya estaba instalada la versión anterior

Volver a ejecutar el archivo actualizado `supabase/setup.sql`. Agrega los campos **Secretaría** e **identificador de importación** sin borrar las actividades existentes. Como el archivo también contiene datos de ejemplo, se pueden borrar manualmente desde **Table Editor → activities** si se duplican.

### Autorizar o quitar integrantes

En Supabase abrir **Table Editor → editor_allowlist**:

- Para autorizar: **Insert row**, escribir el correo en minúsculas y guardar.
- Para quitar el permiso: eliminar la fila correspondiente.

## Publicar en GitHub Pages

1. Crear un repositorio público en GitHub, por ejemplo `agenda-hibrida-derecho`.
2. Elegir **Add file → Upload files** y subir todo el contenido de esta carpeta, incluida `assets` y `supabase`.
3. Abrir **Settings → Pages**.
4. En **Build and deployment**, seleccionar **Deploy from a branch**.
5. Elegir la rama `main` y la carpeta `/ (root)`, y presionar **Save**.
6. GitHub mostrará una dirección similar a `https://USUARIO.github.io/agenda-hibrida-derecho/`.

En Supabase abrir **Authentication → URL Configuration** y colocar esa dirección completa tanto en **Site URL** como en **Redirect URLs**.

## Carga manual

1. Abrir la agenda y presionar **Acceso del equipo**.
2. Ingresar un correo autorizado y abrir el enlace recibido.
3. Presionar **+ Cargar actividad**.
4. Completar el formulario y presionar **Guardar actividad**.

## Importar desde Google Calendar

### Descargar el calendario

1. Abrir Google Calendar desde una computadora.
2. Entrar en **Configuración → Importar y exportar**.
3. En **Exportar**, presionar **Exportar**.
4. Google descargará un archivo `.zip`. Descomprimirlo y localizar el archivo `.ics` del calendario deseado.

### Importarlo en la agenda

1. Iniciar sesión en la agenda con un correo autorizado.
2. Presionar **Importar calendario**.
3. Seleccionar el archivo `.ics`.
4. Completar los datos comunes: Secretaría, responsable, plataforma, cuenta, requerimientos y grabación.
5. Presionar **Importar actividades**.

La aplicación toma del calendario:

- título del evento → nombre de la actividad;
- fecha y horario → fecha, inicio y finalización;
- ubicación → aula/lugar;
- enlace o descripción → enlace de reunión y observaciones.

Si el enlace corresponde a Zoom, Google Meet, Teams o YouTube, la plataforma se reconoce automáticamente cuando ese campo se deja vacío. Las repeticiones diarias y semanales se expanden hasta la fecha de finalización indicada por Google o, si no existe, hasta doce meses. El identificador del calendario evita volver a cargar el mismo evento en importaciones posteriores.

## Uso cotidiano

- Para ampliar una actividad, tocar su fila.
- Para abrir la reunión, elegir **Abrir enlace**.
- Para enviarlo por WhatsApp u otro medio, elegir **Copiar enlace**.
- Para cambiar de período, usar las flechas y **Hoy**.
- Para alternar entre agenda semanal y mensual, usar **Semana / Mes**.
- Las acciones **Editar**, **Duplicar** y **Eliminar** aparecen sólo al ingresar como editor.
