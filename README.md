# Agenda Facultad de Derecho UNCUYO — paquete autoalojado + Firebase

Este paquete está preparado para publicarse como **sitio estático en un servidor propio de la Facultad** (Apache, Nginx o equivalente), manteniendo el **mismo proyecto Firebase/Firestore** que ya contiene las actividades cargadas.

## Importante: no migrar la base

La información cargada no está dentro de este ZIP: está en Firestore. Este proyecto conserva la conexión con:

- Proyecto Firebase: `agenda-hibridaciones-derecho`
- Colección pública: `actividades`
- Colección privada: `actividades_privadas`
- Cuenta administradora actual: `facultad@derecho.uncu.edu.ar`

Mientras `config.js` conserve ese `projectId`, el sitio nuevo verá los mismos datos que el sitio de GitHub.

## Publicación rápida

1. Copiar **todo el contenido de este paquete** a la carpeta pública del servidor web.
2. Servir `index.html` como documento inicial.
3. Usar **HTTPS** en producción.
4. En Firebase Console ir a:
   `Authentication → Settings/Configuración → Authorized domains/Dominios autorizados`
5. Agregar **solo el host** del nuevo sitio. Ejemplo:
   `agenda.derecho.uncu.edu.ar`
   No agregar `https://` ni rutas.
6. No cambiar `config.js` salvo que se quiera apuntar deliberadamente a otro proyecto Firebase.
7. Abrir el sitio y comprobar:
   - vista pública;
   - lectura de actividades existentes;
   - inicio de sesión por Google;
   - edición con `facultad@derecho.uncu.edu.ar`;
   - PDF e informes.

## Archivos principales

- `index.html` — interfaz
- `styles.css` — estilos
- `app.js` — lógica, Firebase y agenda
- `config.js` — configuración del proyecto Firebase
- `assets/` — logos e imágenes
- `firebase/firestore.rules` — copia de referencia de las reglas
- `.htaccess` — configuración recomendada para Apache
- `deploy/nginx-site.conf.example` — ejemplo para Nginx

## Firebase SDK

La aplicación sigue cargando el SDK web oficial de Firebase desde `www.gstatic.com`. No requiere Node, npm, PHP ni un backend propio para funcionar. El servidor institucional solo entrega los archivos estáticos; Firestore y Authentication continúan en Firebase.

## Seguridad

La configuración web de Firebase que aparece en `config.js` identifica el proyecto, pero **no reemplaza las reglas de Firestore**. La seguridad real continúa en las reglas ya publicadas en Firebase y en Authentication.

No se deben almacenar en el servidor contraseñas de cuentas institucionales ni credenciales privadas de Google/Firebase.

## Apache

Si el servidor usa Apache, el paquete incluye `.htaccess`. Requiere que el servidor permita `AllowOverride` para que tenga efecto. La agenda también puede funcionar sin ese archivo si el administrador configura equivalentes directamente en el VirtualHost.

## Nginx

Usar `deploy/nginx-site.conf.example` como referencia y adaptar dominio y ruta de publicación. Luego configurar TLS/HTTPS según la infraestructura institucional.

## Cambio de dominio

Si posteriormente cambia el dominio, normalmente solo hace falta:

1. publicar estos mismos archivos bajo el nuevo host;
2. agregar ese host en los dominios autorizados de Firebase Authentication.

No hay que volver a importar las actividades.


## Tema claro / oscuro

La cabecera incluye un selector para alternar entre modo claro y oscuro. La preferencia se guarda localmente en el navegador y no modifica Firebase ni los permisos de la agenda.


## v73 — contraste del modo oscuro en vista Mes

- Mejora el contraste de los números de día en escritorio.
- Hace legibles las modalidades Presencial, Virtual, Híbrida y Telefónica sobre tarjetas oscuras.
- Refuerza horario, títulos, badges de grupos y fechas destacadas sin perder el apagado de días pasados.
- No modifica Firebase ni los datos almacenados.
