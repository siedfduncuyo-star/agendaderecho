# Agenda de Actividades — Facultad de Derecho

## Versión 28

- Tipografías: Poppins para títulos y controles; Noto Sans para textos.
- Se eliminó el rótulo «Consulta pública» del encabezado.
- Mientras se definen los permisos definitivos, «Administrar agenda» abre un modo de prueba local. Las actividades de prueba no se guardan en Firebase.

Aplicación web institucional para consultar y administrar las actividades presenciales, híbridas, virtuales y transmisiones de la Facultad de Derecho.

## Arquitectura elegida

- **Página:** HTML, CSS y JavaScript, sin compilación.
- **Publicación:** GitHub Pages gratuito.
- **Datos:** Cloud Firestore de Firebase, plan Spark gratuito.
- **Acceso de administración:** Google, limitado a `facultad@derecho.uncu.edu.ar`.
- **Consulta:** pública, sin iniciar sesión.
- **Importación inicial:** archivo `.ics` exportado desde Google Calendar.

El proyecto ya contiene la configuración del proyecto Firebase `agenda-hibridaciones-derecho`. La clave web incluida en `config.js` es una identificación pública del proyecto; la modificación de los datos está protegida por las reglas de Firestore.

## Funciones incluidas

- Vistas por día, semana y mes; en celular se transforman en listas verticales legibles. En la vista mensual, la fila con los días de la semana permanece visible al desplazarse.
- Día actual destacado visualmente en las vistas diaria, semanal y mensual; el indicador **Hoy** y el círculo del día actual usan el acento bordó institucional. En Semana y Mes, los días ya transcurridos se muestran atenuados.
- Agenda de lunes a sábado, sin domingos.
- Cierre de agenda el 28 de diciembre de 2026.
- Feriados marcados: 12 de octubre, 23 de noviembre, 7 y 8 de diciembre.
- Tarjetas compactas con horario, actividad, área organizadora identificada por color y aula; el logo de plataforma se muestra solo cuando la modalidad lo requiere. El resto se despliega.
- El nombre del área organizadora aparece con su color institucional al desplegar una actividad.
- Modalidad seleccionable entre Presencial, Híbrida, Virtual y Transmisión. Las cuatro modalidades muestran un rótulo pequeño en azul `#023764`, ubicado sobre Aula/Lugar y la plataforma; las virtuales no solicitan ni muestran Aula/Lugar.
- En la vista diaria se muestra **Empieza en…** antes del inicio y, durante la actividad, **▶ En curso** junto con el tiempo transcurrido. Las actividades finalizadas se atenúan automáticamente.
- Tarjetas identificadas mediante una franja con el color correspondiente al área organizadora.
- Campo público y opcional **Enlace para más información** en todas las actividades.
- Carga diferenciada de **Información del calendario**, con tipos como **Inscripciones**, **Recesos** y **Suspensión de actividades**, más un detalle (por ejemplo, “Mesas de septiembre”). Se integra en las vistas pública y de edición de Día, Semana y Mes durante todo el tramo correspondiente.
- Estados automáticos para los períodos: Próximamente, Período abierto, Últimos días y Finalizada.
- Logo de YouTube para las transmisiones realizadas mediante esa plataforma.
- Logos compactos de Google Meet, Microsoft Teams y Zoom.
- Cada enlace de actividad puede marcarse como público o privado. Si es privado, **no aparece ningún bloque ni aviso de enlace en la vista pública**; la cuenta editora sí puede verlo, abrirlo y copiarlo.
- Carga manual, edición, duplicación y eliminación.
- Edición individual o conjunta de las actividades que tengan el mismo nombre y el mismo día de la semana.
- Listas desplegables institucionales para área organizadora y aula, con opción de indicar otro lugar.
- El formulario de edición solo se cierra mediante los botones Cerrar o Cancelar, para evitar cierres accidentales.
- Para Secretaría Académica: selección de Clase de grado, Examen final u Otra actividad académica. Las clases y exámenes habilitan selecciones dependientes de carrera, año y materia.
- Los exámenes finales quedan fijados automáticamente como presenciales.
- En Abogacía, las materias de los primeros trayectos que se dictan en ambos turnos aparecen diferenciadas como `TM` (turno mañana) y `TT` (turno tarde).
- Rango de fechas para actividades que duran varios días; se muestran cada día del período, excepto los domingos.
- Actividades únicas, semanales o cada 15 días.
- Importación inicial desde Google Calendar mediante `.ics`.
- Los datos **Responsable/contacto**, **Requerimientos/observaciones**, **Cuenta**, **Grabación** y los enlaces privados se guardan en una colección protegida y solo son visibles para la cuenta editora.
- Tipografía Montserrat, color `#014a7d` y logo institucional.

## Estructura

```text
agenda-hibrida-derecho/
├── assets/
│   ├── logo-fd-blanco.png
│   ├── platform-google-meet.png
│   ├── platform-microsoft-teams.png
│   ├── platform-zoom.png
│   └── platform-youtube.png
├── firebase/
│   └── firestore.rules
├── .nojekyll
├── index.html
├── styles.css
├── app.js
├── config.js
└── README.md
```

## Publicar en GitHub Pages

1. Ingresar en GitHub y crear un repositorio público llamado `agenda-hibrida-derecho`.
2. Dentro del repositorio, elegir **Add file → Upload files**.
3. Subir **el contenido de esta carpeta**, no el archivo ZIP: `index.html`, `app.js`, `styles.css`, `config.js`, `.nojekyll` y las carpetas `assets` y `firebase`.
4. Presionar **Commit changes**.
5. Abrir **Settings → Pages**.
6. En **Build and deployment**, seleccionar **Deploy from a branch**.
7. Elegir la rama `main`, la carpeta `/ (root)` y presionar **Save**.
8. Esperar unos minutos. GitHub mostrará una dirección similar a `https://USUARIO.github.io/agenda-hibrida-derecho/`.

## Autorizar GitHub Pages en Firebase

Este paso habilita el botón **Administrar agenda** en el sitio publicado.

1. Copiar únicamente el dominio de la dirección de GitHub, por ejemplo `USUARIO.github.io` (sin `https://` y sin `/agenda-hibrida-derecho/`).
2. En Firebase abrir **Authentication → Configuración → Dominios autorizados**.
3. Presionar **Agregar dominio**.
4. Pegar `USUARIO.github.io` y guardar.

## Cargar una actividad

1. Abrir el enlace público de la agenda.
2. Presionar **Administrar agenda**.
3. Ingresar con la cuenta `facultad@derecho.uncu.edu.ar`.
4. Presionar **+ Cargar actividad**.
5. En **Tipo de carga**, elegir **Actividad con fecha y horario**.
6. Completar fecha de inicio, fecha de finalización, horario, actividad, modalidad, área organizadora, responsable, aula, plataforma, cuenta, enlace, grabación y observaciones. Si dura un solo día, colocar la misma fecha en ambos campos.
7. Marcar **El enlace es público** solamente cuando cualquier persona que consulta la agenda pueda abrirlo. Si queda desmarcado, el enlace se guarda de forma privada.
8. Si se elige **Secretaría Académica**, seleccionar el tipo académico. Para clases de grado y exámenes finales, completar también carrera, año y materia. Si el lugar no figura, elegir **Otro (especificar)**.
9. En **Repetición**, elegir **No se repite**, **Todas las semanas** o **Cada 15 días**. Para una repetición, indicar hasta qué fecha debe generarse.
10. Presionar **Guardar actividad**.

No se edita ningún archivo para el uso cotidiano.

## Cargar una fecha o período importante

1. Ingresar como responsable y presionar **+ Cargar actividad**.
2. En **Tipo de carga**, elegir **Período o fecha importante**.
3. Completar la fecha de inicio y finalización, el título, el área organizadora, la descripción y, si existe, el enlace público de más información.
4. Presionar **Guardar fecha importante**.

Los períodos se integran directamente en el calendario. En Día y Semana aparecen como tarjetas dentro de cada jornada; en Mes se muestran de forma compacta en cada día comprendido por el período.

## Editar, duplicar o eliminar

1. Ingresar como responsable.
2. Desplegar la tarjeta de una actividad.
3. Elegir **Editar**, **Duplicar** o **Eliminar**.

Al duplicar, la copia se prepara automáticamente para la semana siguiente. Se puede modificar la fecha antes de guardarla.

Al editar, se puede marcar **Aplicar estos cambios a las actividades con el mismo nombre y día**. Esta opción actualiza el nombre, horario, tipo, área organizadora, responsable, aula, plataforma, cuenta, enlace, grabación y observaciones únicamente en las coincidencias que comienzan el mismo día de la semana, pero conserva las fechas propias de cada actividad.


## Suspender o postergar una actividad

Al cargar o editar una actividad se puede elegir su **Estado**:

- **Programada**: se muestra normalmente.
- **Suspendida**: permanece visible en su fecha original y aparece destacada como suspendida.
- **Postergada**: permanece visible en su fecha original e informa la nueva fecha. Si todavía no está definida, se puede marcar **Fecha a confirmar**.

La fecha original no se reemplaza, para conservar el registro de cuándo estaba prevista la actividad.

## Importación inicial desde Google Calendar

La importación inicial ya fue realizada. En la versión publicada, el botón de importación queda oculto para evitar cargas duplicadas.

### Exportar el calendario

1. Abrir Google Calendar desde una computadora.
2. Entrar en **Configuración → Importar y exportar**.
3. En **Exportar**, presionar **Exportar**.
4. Descomprimir el archivo `.zip` descargado y localizar el archivo `.ics` del calendario correspondiente.

### Importar en la agenda

1. Ingresar en la agenda con la cuenta responsable.
2. Presionar **Importar calendario**.
3. Seleccionar el archivo `.ics`.
4. Completar los datos comunes que no estaban en Calendar: área organizadora, responsable, plataforma, cuenta, grabación y observaciones.
5. Presionar **Importar actividades**.

La aplicación toma automáticamente el título, la fecha, el horario, la ubicación y los enlaces reconocibles. Evita volver a importar el mismo evento si se usa nuevamente el mismo archivo.

## Probar los ejemplos

Agregar `?demo=1` al final de la dirección publicada, por ejemplo:

```text
https://USUARIO.github.io/agenda-hibrida-derecho/?demo=1
```

Esta modalidad muestra tres actividades de ejemplo y permite probar carga, repetición, edición, duplicación y eliminación en ese navegador, sin modificar la base real.

## Seguridad

La copia exacta de las reglas está en `firebase/firestore.rules`. La colección `actividades` conserva únicamente la información pública. `actividades_privadas` solo admite lectura y escritura cuando Firebase verifica el correo `facultad@derecho.uncu.edu.ar`. Las reglas impiden que Responsable, Requerimientos, Cuenta o Grabación se guarden accidentalmente en un documento público.
