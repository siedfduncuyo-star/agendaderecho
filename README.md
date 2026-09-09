# Agenda de Hibridaciones — Facultad de Derecho

Agenda semanal responsive para consultar y coordinar actividades híbridas desde un único enlace. La web se aloja gratuitamente en GitHub Pages y utiliza Supabase para compartir datos y proteger las modificaciones.

## Arquitectura elegida

- **Interfaz:** HTML, CSS y JavaScript sin frameworks ni proceso de compilación.
- **Alojamiento:** GitHub Pages.
- **Datos:** tabla PostgreSQL gratuita de Supabase.
- **Acceso:** consulta pública; altas, cambios, duplicaciones y eliminaciones sólo para correos incluidos en la lista de editores.
- **Autenticación:** enlace mágico enviado por correo; no hay contraseñas que administrar.

Un archivo JSON o `localStorage` no permitirían compartir cambios entre celulares. Guardar datos en GitHub obligaría a editar archivos o administrar permisos y tokens. Google Sheets suele requerir una capa adicional para escribir con seguridad. Firebase también sirve, pero sus reglas y su estructura resultan menos directas para esta agenda. Supabase ofrece en un mismo servicio la tabla, la autenticación y las reglas de acceso.

## Estructura del proyecto

```text
agenda-hibrida-derecho/
├── index.html            Página y formularios
├── styles.css            Diseño responsive
├── app.js                Agenda, filtros, acceso y operaciones
├── config.js             Conexión pública con Supabase
├── .nojekyll             Publicación directa en GitHub Pages
├── supabase/
│   └── setup.sql         Tablas, seguridad y datos de ejemplo
└── README.md             Estas instrucciones
```

## 1. Probarla inmediatamente

Abrí `index.html` con doble clic. Como `config.js` todavía no tiene credenciales, la aplicación inicia en **modo de prueba**:

- muestra tres actividades en la semana actual;
- permite crear, editar, duplicar y eliminar;
- guarda los cambios sólo en ese navegador.

Este modo sirve para probar la interfaz. Para que varias personas compartan los mismos datos, completá la configuración siguiente.

## 2. Crear y preparar Supabase

1. Entrá en [supabase.com](https://supabase.com/) y creá una cuenta.
2. Elegí **New project**, asignale un nombre y una contraseña de base de datos.
3. En el proyecto, abrí **SQL Editor** y luego **New query**.
4. Abrí `supabase/setup.sql` de esta carpeta.
5. Antes de ejecutarlo, reemplazá estos dos correos de ejemplo por los correos reales de quienes podrán modificar la agenda:

   ```sql
   ('coordinacion@facultad.edu.ar'),
   ('hibridaciones@facultad.edu.ar')
   ```

6. Copiá todo el SQL, pegalo en el editor y presioná **Run**. Esto crea las tablas, las reglas de seguridad y tres actividades de ejemplo.
7. En Supabase, entrá en **Project Settings → API**. Copiá:
   - **Project URL**
   - **anon public key** o **publishable key**
8. Abrí `config.js` y pegá ambos valores:

   ```js
   window.AGENDA_CONFIG = {
     supabaseUrl: "https://TU-PROYECTO.supabase.co",
     supabaseAnonKey: "TU-CLAVE-PUBLICA"
   };
   ```

La clave `anon`/`publishable` está diseñada para usarse en una página pública. La seguridad real la aplican las políticas RLS incluidas en `setup.sql`. No uses ni publiques la clave `service_role` o `secret`.

## 3. Configurar los enlaces de acceso

Después de publicar la web, Supabase debe reconocer su dirección:

1. En Supabase, abrí **Authentication → URL Configuration**.
2. En **Site URL**, colocá la URL definitiva de GitHub Pages, por ejemplo:

   `https://usuario.github.io/agenda-hibrida-derecho/`

3. En **Redirect URLs**, agregá la misma URL, incluyendo la barra final.
4. Guardá los cambios.

Cuando un editor escriba su correo en “Acceso del equipo”, recibirá un enlace mágico. Aunque otra persona cree una sesión, las reglas de la base sólo permiten modificar a los correos incluidos en `editor_allowlist`.

### Agregar o quitar editores

No se modifica el código de la web. En Supabase, abrí **Table Editor → editor_allowlist**:

- **Agregar:** `Insert row`, escribir el correo en minúsculas y guardar.
- **Quitar:** seleccionar la fila del correo y eliminarla.

El cambio de permiso es inmediato.

## 4. Subir el proyecto a GitHub

1. Iniciá sesión en [github.com](https://github.com/).
2. Presioná **New repository**.
3. Usá, por ejemplo, el nombre `agenda-hibrida-derecho`.
4. Para mantenerlo totalmente gratuito con GitHub Pages, elegí **Public**. La agenda ya es pública por diseño y la clave de `config.js` es la clave pública de Supabase.
5. Presioná **Create repository**.
6. Dentro del repositorio, elegí **Add file → Upload files**.
7. Subí todos los archivos y la carpeta `supabase` manteniendo esta estructura.
8. Escribí un mensaje como `Primera versión de la agenda` y presioná **Commit changes**.

Alternativa con Git instalado:

```bash
git init
git add .
git commit -m "Primera versión de la agenda"
git branch -M main
git remote add origin https://github.com/USUARIO/agenda-hibrida-derecho.git
git push -u origin main
```

## 5. Publicar con GitHub Pages

1. En el repositorio, abrí **Settings → Pages**.
2. En **Build and deployment**, elegí **Deploy from a branch**.
3. En **Branch**, seleccioná `main` y la carpeta `/ (root)`.
4. Presioná **Save**.
5. Esperá uno o dos minutos. GitHub mostrará la dirección pública, normalmente:

   `https://USUARIO.github.io/agenda-hibrida-derecho/`

6. Copiá esa misma dirección en la configuración de autenticación de Supabase explicada en el punto 3.
7. Abrí la dirección desde un celular y compartila por WhatsApp.

## Uso cotidiano: cargar una actividad

1. Abrir el enlace de la agenda.
2. Presionar **Acceso del equipo**.
3. Escribir un correo autorizado y abrir el enlace recibido por correo.
4. Presionar **+ Nueva actividad**.
5. Completar fecha, horario, nombre, responsable, aula y los demás datos.
6. Marcar **Requiere grabación** cuando corresponda.
7. Presionar **Guardar actividad**.

La actividad aparecerá en el día y horario correctos. No hay que editar archivos ni volver a publicar la página.

## Editar, duplicar y eliminar

Al iniciar sesión como editor, cada tarjeta muestra tres acciones:

- **Editar:** cambia cualquier dato del registro.
- **Duplicar:** abre una copia con la fecha desplazada siete días; permite revisarla antes de guardar.
- **Eliminar:** pide confirmación y borra la actividad.

## Campos incluidos

Fecha; día de la semana calculado automáticamente; inicio; finalización; nombre; responsable; aula; tipo; requerimientos técnicos; enlace; plataforma; cuenta utilizada; requiere grabación; observaciones.

## Mantenimiento

- Las actividades se gestionan enteramente desde el formulario.
- Los permisos se gestionan desde `editor_allowlist` en Supabase.
- Los filtros se actualizan automáticamente según las actividades de la semana visible.
- Para cambiar colores o textos institucionales puede editarse `styles.css` o `index.html`, pero no hace falta hacerlo para el uso normal.
