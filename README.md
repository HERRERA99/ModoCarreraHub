# Modo Carrera Hub

App en español para gestionar plantillas de FIFA / EA Sports FC con una pizarra de fútbol. Sin backend, cuentas, APIs, librerías externas ni descarga de fuentes. Todos los jugadores se introducen a mano.

## Ejecutar

Necesitas Node.js 20 o posterior. Desde esta carpeta:

```sh
npm start
```

Abre **http://localhost:5173**. No necesitas ejecutar `npm install`. El servidor solo entrega archivos estáticos; no recibe ni guarda datos. Para detenerlo, pulsa `Ctrl+C`. Puedes cambiar el puerto con la variable de entorno `PORT`.

## Uso

1. Crea una partida con nombre y, si quieres, club. También puedes probar una plantilla de ejemplo con jugadores ficticios.
2. Añade jugadores. Selecciona sus posiciones y ordénalas con ↑ y ↓. La primera es la preferida. Pulsa una tarjeta para editar o eliminar al jugador.
3. La pestaña inicial «Opciones por posición» muestra una lista compacta por puesto, incluidos central izquierdo y derecho (y el central del medio en defensas de tres). Incluye a todos los jugadores compatibles. Los puestos del mismo tipo comparten opciones; un jugador puede figurar en varias listas. Pulsa cualquier fila para editarlo.
4. En «Titulares» solo aparecen los jugadores del once. La selección automática sigue las colas de asignación: primero la preferencia de posición, luego la valoración y el nombre. Pulsa un puesto para cambiar su titular por cualquier jugador compatible. Si ya está en otro puesto, se intercambian cuando ambos son compatibles, o se mueve y el puesto anterior se recalcula. Nunca se duplica. Puedes dejar un puesto vacío o restablecer el once automático. Las elecciones manuales se guardan por partida y formación, se conservan al recargar y viajan en el JSON. Editar o eliminar un jugador limpia sus elecciones incompatibles. El resumen de cobertura refleja el once y cuenta a cada jugador una sola vez.
5. Exporta todas las partidas o solo la actual en JSON. Importar añade copias con identificadores nuevos y conserva las partidas existentes. La copia se valida antes de importar y se pide confirmación.

La preferencia tiene prioridad absoluta: un MC de primera preferencia con 70 precede a otro de segunda preferencia con 80. Dentro del mismo nivel se ordena por valoración descendente y luego por nombre en español. Edad y potencial no intervienen. La app no mueve jugadores para equilibrar huecos automáticamente; el usuario puede elegirlos manualmente.

Hay **24 formaciones y variantes**: 4-4-2 clásica/doble pivote, 4-4-1-1, 4-1-2-1-2 cerrada/abierta, 4-3-3 con pivote/plana/ofensiva/defensiva, 4-2-3-1 abierta/tres mediapuntas, 4-2-2-2, 4-3-1-2, 4-3-2-1, 4-1-4-1, 4-2-4, 3-5-2, 3-4-3, 3-4-1-2, 3-4-2-1, 5-3-2, 5-2-1-2, 5-2-3 y 5-4-1. Cada una tiene once puestos individuales. En móvil puedes desplazar el campo horizontalmente para leer las filas de cuatro puestos.

## Datos locales y copias

Los datos se guardan automáticamente en `localStorage`, en la clave `modo-carrera-hub:v1`. Cada partida tiene sus propios jugadores y formación. Puedes cerrar y volver a abrir la app con el mismo navegador y dirección.

Usa siempre la misma dirección y puerto: `localhost` y `127.0.0.1`, otro puerto o un navegador distinto tienen almacenamientos separados. Borrar los datos del navegador elimina las partidas locales; en modo privado pueden desaparecer al cerrar. Exporta copias JSON para conservarlas o moverlas a otro dispositivo. Tamaño máximo de importación: 5 MB.

Si falla la lectura local, la app permite descargar los datos originales antes de restablecerlos y evita sobrescribirlos. Si falla el guardado, muestra el error y mantiene el estado anterior. Las pestañas abiertas sincronizan los cambios del almacenamiento.

## Comprobaciones

```sh
npm test
```

Las pruebas de Node verifican la prioridad, desempates, independencia y persistencia de partidas, las 24 formaciones, puestos individuales, listas de opciones, once automático, elecciones manuales, intercambios sin duplicados, limpieza tras edición/eliminación e importación/exportación de titulares.

## Archivos

- `index.html`, `styles.css`, `app.js`: interfaz adaptable y gestión de partidas/jugadores.
- `model.js`: asignación, ordenación, cobertura, validación y persistencia.
- `server.mjs`: servidor estático local, sin dependencias.
- `test/model.test.js`: pruebas del dominio y del almacenamiento.
