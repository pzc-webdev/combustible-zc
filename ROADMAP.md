# Hoja de ruta de demenos

Documento de planificación basado en el código revisado el 17 de septiembre de 2026. Las tareas pendientes no representan funcionalidades ya disponibles. El orden propuesto prioriza resolver la pregunta original: **¿cuánto ahorro después de pagar el combustible del desvío?**

## Avance del 20 de septiembre de 2026

Actualización del 10 de octubre: la búsqueda manual utiliza exclusivamente
Photon/OpenStreetMap. Los resultados incluyen coordenadas y no requieren otra
petición para resolver la selección. Se han retirado el proveedor anterior y su
ruta de resolución. Detalles en la [documentación de geocodificación](docs/geocoding.md).

Fases 0 y 1 implementadas en el código local. La búsqueda manual permite elegir
coincidencias y mantiene la geolocalización como alternativa. No necesita claves
nuevas.

Las preferencias locales tienen formato versionado, recuperan los descuentos y
el radio antiguos, y ahora conservan también combustible y ponderación. Se han
añadido pruebas automatizadas de cálculo, APIs y flujos de navegador. Los puntos
siguen ocultos en las tarjetas, según la decisión de producto previa.

Se han actualizado dependencias compatibles en el lockfile, incluyendo Next.js
16.3.5 y Sharp 0.35.4, tras detectar avisos en la auditoría. `npm audit` termina
sin vulnerabilidades reportadas. La región sigue definida en `vercel.json`.

Validación de esta entrega: 20 pruebas de lógica/API y 16 pruebas de navegador
(móvil y escritorio), lint y build correctos. Se han consultado ubicaciones
reales y la API de precios devolvió 957 estaciones dentro del filtro de servidor
de 50,2 km para el punto de prueba de Madrid; después la interfaz aplica el radio
elegido. Falta la validación del despliegue de producción.

Entrega pendiente de despliegue y validación con usuarios reales. El siguiente
hito de implementación es la fase 2: coste de ida y vuelta y ahorro neto. La
distancia que muestra esta entrega sigue siendo en línea recta.

## Punto de partida (17 de septiembre, antes de esta entrega)

- Búsqueda con geolocalización del navegador y radio configurable de 1 a 50 km.
- Precios oficiales consultados desde el servidor, con caché de 15 minutos y fecha de actualización de la fuente visible.
- Distancias en línea recta mediante Haversine; todavía no hay cálculo de distancia por carretera.
- Listas por precio, cercanía y puntuación ponderada configurable. La puntuación depende del conjunto de resultados y no equivale a ahorro monetario.
- Descuentos fijos en céntimos por litro, con coincidencia parcial de marca y elección del mayor descuento coincidente.
- Descuentos y radio guardados en `localStorage`; combustible y ponderación todavía no se conservan.
- Sin búsqueda manual, rutas origen-destino, consumo del vehículo ni cuentas de usuario.

## Orden de entrega

| Fase | Resultado para el usuario | Dependencias | Tamaño relativo |
| --- | --- | --- | --- |
| 0. Consolidación | Resultados y preferencias fiables | Versión actual | Pequeño |
| 1. Ubicación manual | Buscar sin conceder geolocalización | Fase 0 | Medio |
| 2. Ahorro neto cerca de mí | Saber si compensa ir a otra estación | Fases 0 y 1 | Grande |
| 3. Repostaje en ruta | Elegir una parada según el desvío y el ahorro | Fase 2 | Grande |
| 4. Descuentos avanzados | Comparar el coste de un repostaje con sus condiciones | Modelo de coste de fase 2 | Medio/grande |
| 5. Cuenta opcional | Recuperar preferencias entre dispositivos | Persistencia y reglas estabilizadas | Medio |

Los tamaños sirven para dividir trabajo, no son compromisos de calendario. La fase 4 puede adelantarse a la 3 si el uso real demuestra que las condiciones de los descuentos son la principal fuente de resultados incorrectos.

## Fase 0 — Consolidar la base

Objetivo: preparar cambios pequeños y verificables sin acometer una reescritura completa.

- [x] Aclarar en la interfaz y la documentación que la distancia actual es en línea recta y que la recomendación ponderada expresa una preferencia relativa, sin mostrar puntos.
- [x] Separar progresivamente normalización de estaciones, descuentos, distancias y puntuación en funciones independientes.
- [x] Rechazar coordenadas ausentes o vacías en `/api/stations`, evitando convertirlas en cero.
- [x] Validar la estructura de los descuentos recuperados y aplicar las mismas restricciones al añadirlos, editarlos y utilizarlos.
- [x] Tolerar almacenamiento local corrupto o no disponible sin impedir la búsqueda.
- [x] Guardar también combustible y ponderación, con versión del formato y migración de las preferencias existentes.
- [x] Incorporar pruebas de comportamiento para precios ausentes, descuentos coincidentes, empates, pesos extremos y parámetros inválidos.

Terminada cuando: una recarga conserva las preferencias válidas; los datos locales incorrectos no rompen la aplicación; las peticiones sin coordenadas devuelven un error; las búsquedas actuales mantienen su comportamiento verificado.

## Fase 1 — Buscar por ubicación manual

Objetivo: permitir buscar por municipio, código postal o dirección, conservando «Usar mi ubicación» como alternativa.

- [x] Evaluar un proveedor de geocodificación con una muestra de direcciones españolas; documentar cobertura, condiciones de uso, atribución, límites, coste y requisitos de almacenamiento antes de elegirlo.
- [x] Crear una integración de servidor y un formato común de resultado: nombre, coordenadas y precisión de la ubicación.
- [x] Ofrecer resultados desambiguados con municipio y provincia, cuando el proveedor los facilita. No elegir automáticamente entre lugares con el mismo nombre.
- [x] Resolver la ubicación seleccionada a coordenadas y reutilizar la búsqueda radial existente.
- [x] Cancelar consultas obsoletas y limitar peticiones mientras se escribe: búsqueda solo al enviar el formulario.
- [x] Mostrar una alternativa manual cuando se deniegue el permiso del navegador.

Terminada cuando: se puede completar una búsqueda por las tres formas de entrada sin permiso de geolocalización, elegir entre resultados ambiguos y corregir una dirección no encontrada. Un código postal se presenta como ubicación aproximada.

## Fase 2 — Calcular el ahorro neto

Objetivo: responder la pregunta original en euros para una salida dedicada a repostar y volver al punto de partida.

- [ ] Pedir litros previstos y consumo medio en L/100 km. Empezar por litros; un presupuesto fijo necesita una comparación diferente.
- [ ] Evaluar un proveedor de rutas y matrices por cobertura, accesos a estaciones, límites, latencia y coste. Mantenerlo detrás de una interfaz propia.
- [ ] Calcular ida y vuelta por carretera para las estaciones comparadas, incluyendo posibles diferencias de sentido y acceso.
- [ ] Usar el radio geográfico como filtro inicial y calcular rutas para una selección acotada. Si se limita la selección, mostrar el alcance y evitar prometer un óptimo global.
- [ ] Tomar por defecto como referencia la estación accesible más cercana por carretera entre las evaluadas, indicando siempre cuál es y permitiendo cambiarla.
- [ ] Añadir ordenación por menor coste total estimado y un desglose de repostaje, combustible del trayecto y ahorro frente a la referencia.
- [ ] Conservar la ponderación como opción de preferencia, diferenciada de la comparación económica.
- [ ] Si falla el proveedor, mantener la búsqueda básica con distancias identificadas como aproximadas y sin presentar ahorro neto calculado con rutas reales.

Modelo inicial, para los mismos litros en todas las alternativas:

```text
L = litros previstos
c = consumo medio en L/100 km
p = precio de valoración del combustible consumido, común a las alternativas
R(s) = importe de repostar L litros en la estación s, tras descuentos inmediatos
d(s) = kilómetros por carretera de ida y vuelta a la estación s

coste_trayecto(s) = d(s) × c / 100 × p
coste_total(s) = R(s) + coste_trayecto(s)
ahorro_neto(s) = coste_total(referencia) − coste_total(s)
```

Proponer como `p` el precio efectivo de la estación de referencia, explicarlo y permitir ajustarlo. Así se usa el mismo criterio para valorar el combustible consumido en todas las opciones. No se descuenta de nuevo ese consumo de los litros previstos.

Ejemplo de aceptación: para 40 L, una rebaja de 0,05 €/L ahorra 2 €. Si exige 10 km adicionales respecto a la referencia, con consumo de 6 L/100 km y valoración de 1,60 €/L, el trayecto adicional cuesta 0,96 € y el ahorro neto es 1,04 €.

Terminada cuando: el ejemplo anterior y un caso de ahorro negativo se reproducen en pruebas; el usuario puede identificar la referencia y comprender por qué una estación más barata puede salir más cara. Mostrar duración por separado; no monetizar tiempo ni afirmar que el cálculo incluye peajes en esta primera entrega.

## Fase 3 — Buscar durante un viaje

Objetivo: comparar paradas entre un origen y un destino según el desvío real.

- [ ] Añadir modo «En ruta» con origen, destino y límites de desvío adicional en kilómetros y/o minutos.
- [ ] Obtener una ruta base y buscar candidatas a lo largo de su recorrido. La API actual recorta estaciones a unos 50 km del origen y debe ampliarse para este modo.
- [ ] Usar un corredor geográfico solo para preseleccionar; validar el desvío por carretera, accesos y sentidos de circulación.
- [ ] Comparar la ruta origen → estación → destino con la ruta base, usando opciones de ruta coherentes.
- [ ] Reutilizar el cálculo de coste con los kilómetros adicionales y comparar el ahorro entre alternativas de repostaje factibles.
- [ ] Mostrar kilómetros y minutos adicionales, precio final, coste del desvío y ahorro estimado respecto a una parada de referencia identificada.
- [ ] Ofrecer navegación que incluya la estación como parada.
- [ ] Limitar y medir las consultas de rutas; gestionar estaciones inaccesibles, ausencia de paradas válidas y errores parciales.

```text
desvío_km(s) = distancia(origen → s → destino) − distancia(ruta_base)
desvío_min(s) = duración(origen → s → destino) − duración(ruta_base)
```

La ruta base sirve para medir el desvío; la referencia económica debe ser otra opción de repostaje para los mismos litros. No comparar comprar combustible con no comprarlo. Si aparecen diferencias negativas inesperadas, revisar coherencia de rutas antes de interpretarlas como ahorro.

Terminada cuando: una estación al otro lado de una autovía se evalúa por su acceso real; se respetan los límites configurados; una ruta larga encuentra candidatas lejos del origen; cambiar el destino recalcula las alternativas.

## Fase 4 — Descuentos con condiciones

Objetivo: calcular el importe real de cada repostaje y explicar las reglas aplicadas.

- [ ] Modelar descuentos en céntimos/L, porcentaje y euros por operación.
- [ ] Añadir importe mínimo, base de cálculo del umbral, condición estricta o inclusiva, límites y compatibilidad entre reglas.
- [ ] Definir explícitamente el orden de aplicación cuando se combinan descuentos. No sumar reglas incompatibles.
- [ ] Normalizar marcas y gestionar alias para sustituir coincidencias parciales ambiguas.
- [ ] Evaluar combinaciones válidas y elegir el menor importe pagadero para los litros indicados.
- [ ] Separar descuento inmediato de saldo o recompensa futura, que no reduce el pago actual.
- [ ] Mostrar reglas aplicadas y motivo por el que una promoción no cumple las condiciones.
- [ ] Migrar los descuentos actuales sin perder datos y conservar precisión suficiente en €/L, redondeando el importe monetario según las reglas definidas.

Terminada cuando: hay pruebas para 19,99 €, 20 € y 20,01 €; «más de 20 €» se distingue de «al menos 20 €»; se verifican porcentajes, topes, incompatibilidades, combinaciones y ausencia de importes negativos. Cambiar los litros debe poder cambiar la promoción ganadora.

## Fase 5 — Persistencia con cuenta opcional

Objetivo: sincronizar la configuración sin exigir registro para comparar estaciones.

- [ ] Elegir autenticación y almacenamiento después de concretar el modelo de preferencias y descuentos.
- [ ] Mantener el uso anónimo completo y guardar localmente sus preferencias.
- [ ] Sincronizar combustible, ponderación, radio, consumo, litros y descuentos para usuarios registrados.
- [ ] Ofrecer importación de preferencias locales al iniciar sesión y resolver conflictos sin sobrescrituras silenciosas.
- [ ] Aislar los datos de cada cuenta y comprobar que un usuario no puede leer ni modificar los de otro.
- [ ] Permitir cerrar sesión y eliminar la cuenta y sus datos; no conservar direcciones ni historial de viajes por defecto.

Terminada cuando: las preferencias se recuperan en otro dispositivo, cerrar sesión no expone datos de la cuenta anterior y eliminar la cuenta retira sus datos persistidos. El modo anónimo continúa funcionando.

## Validación de cada entrega

- Ejecutar lint, build y las pruebas de comportamiento relevantes para la fase.
- Revisar el flujo móvil y con teclado, incluidos errores y ausencia de resultados.
- Mantener visible la fecha de los precios y distinguir distancia aproximada, ruta calculada y ahorro estimado.
- Medir latencia y fallos de búsquedas, llamadas al proveedor y coste por búsqueda antes de ampliar el uso; evitar registrar direcciones o coordenadas precisas innecesariamente.
- Verificar con un pequeño grupo de usuarios que entiende la recomendación. El ahorro mostrado es una estimación, no ahorro observado tras repostar.
- Publicar entregas pequeñas y actualizar este documento con lo completado y lo aprendido.

## Primera iteración — implementada

1. Corregir la descripción de la distancia actual y endurecer validación de coordenadas y descuentos.
2. Hacer robusta la persistencia local y conservar combustible y ponderación.
3. Añadir las pruebas del cálculo existente antes de extraer sus módulos.
4. Preparar y evaluar una muestra de búsquedas por municipio, código postal y calle para seleccionar la integración de geocodificación.
5. Entregar la búsqueda manual completa como primera mejora visible.

El siguiente hito será el ahorro neto con ida y vuelta por carretera. La sincronización de cuentas se aborda después de validar ese valor principal.

## Próxima iteración — ahorro neto

1. Definir y probar el modelo de coste con los ejemplos de la fase 2.
2. Evaluar un proveedor de rutas por carretera con muestras que incluyan autovías,
   calles de sentido único y accesos separados a estaciones.
3. Añadir litros previstos y consumo medio a las preferencias.
4. Integrar ida y vuelta para un conjunto explícito de candidatas y permitir elegir
   la estación de referencia.
5. Mostrar el desglose en euros y validar casos donde una estación más barata
   genera ahorro negativo.

## Ajuste recomendado para el anuncio

En el post, sustituir «distancia de conducción» por «distancia aproximada en línea recta». Describir la versión actual como una comparación ponderada de precio y distancia y presentar el cálculo del coste del desvío como el siguiente hito. Esto alinea el anuncio con lo que la aplicación calcula hoy.
