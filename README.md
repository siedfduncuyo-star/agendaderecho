# Agenda de Actividades · v30

Versión preparada para publicar en GitHub Pages.

## Cambios principales de v30

- Los filtros vuelven a ser **checks combinables** y quedan siempre visibles:
  - Presenciales
  - Híbridas
  - Virtuales
  - Fechas destacadas
- El contador de cada vista utiliza la denominación **evento / eventos** e incluye actividades y fechas destacadas visibles según los filtros.
- El fondo del contador y la vista seleccionada (**Día / Semana / Mes**) utilizan el color institucional `#C5AD68`.
- El día actual utiliza un rojo más visible (`#A51C30`) en el indicador **Hoy** y en la vista mensual.
- Se incorpora el nuevo logo **UNCUYO · Facultad de Derecho** provisto para esta versión.
- **Administrar agenda** se reemplaza por el ícono de administración. A su izquierda se muestra la cantidad de **eventos totales** de toda la agenda.
- En modo administrador aparecen dos acciones principales:
  - **+ Cargar actividad**
  - **Actualizar calendario**
- **Actualizar calendario** permite administrar los años 2026, 2027, 2028, 2029 y 2030 sin modificar el código:
  - definir inicio y fin del calendario de cada año;
  - cargar, modificar o eliminar feriados/días sin actividad;
  - identificar cada feriado con su nombre.
- Los feriados quedan apagados y no muestran actividades.
- Los días sin eventos continúan visualmente atenuados.
- Los filtros se pueden combinar libremente; si se desmarcan todos, no se muestran eventos.
- El botón de las tarjetas ahora dice simplemente **Copiar**. Mantiene el formato con negritas compatible con WhatsApp.
- Se conserva la privacidad de enlaces: los enlaces privados no se muestran ni se copian en la vista pública.
- Se mantiene la compatibilidad con registros anteriores de **Transmisión**, que se interpretan como **Híbrida**, y con **Optativas / otras**, que se muestra como **Optativa**.

## Administración del calendario

La configuración del calendario se guarda junto con la agenda en Firebase, por lo que se mantiene al cambiar de dispositivo. En modo de prueba se guarda en el almacenamiento local del navegador.

Para editar un año:

1. Ingresá al modo administrador desde el ícono de engranaje.
2. Elegí **Actualizar calendario**.
3. Seleccioná el año.
4. Ajustá las fechas de inicio y fin si fuera necesario.
5. Escribí un feriado por línea con el formato `DD/MM | Nombre`.
6. Guardá el calendario.

Ejemplo:

```text
12/10 | Feriado
08/12 | Inmaculada Concepción
```

## Publicación

Subí todo el contenido de esta carpeta a la raíz del repositorio de GitHub Pages, conservando las carpetas `assets` y `firebase`.

Si reemplazás una versión anterior, hacé una recarga forzada del navegador (`Ctrl + F5`) después de publicar.
