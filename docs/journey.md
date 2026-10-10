# Búsqueda en ruta

El modo «En ruta» compara precio y desvío entre dos lugares elegidos mediante
la búsqueda manual. El límite comprende los kilómetros extra de salir del
trayecto, pasar por la estación y continuar hasta el destino. No incluye un
cálculo monetario del combustible consumido en ese desvío.

## API y selección

`POST /api/journey` recibe `origin` y `destination` con `latitude` y `longitude`,
`maximumDetourKm` (entero entre 0 y 20), `selection` y `discounts`. Valida los
parámetros antes de consultar servicios externos. Los lugares deben estar
separados al menos 100 m y como máximo 1.500 km en línea recta.

1. Obtiene la geometría completa de la ruta base con OSRM, perfil de coche.
2. Consulta el mismo conjunto nacional de precios que `/api/stations`, con
   caché de 15 minutos y fecha de actualización visible. No aplica el límite
   radial de 50 km a este modo.
3. Preselecciona estaciones con precio dentro de un corredor alrededor de toda
   la ruta. El corredor sirve solo de filtro, nunca de distancia por carretera.
4. Evalúa hasta doce candidatas: las seis de menor precio tras descuentos y
   estaciones de seis tramos del viaje, completando huecos sin duplicados.
5. Solicita una matriz dirigida de distancias y duraciones. Para cada candidata
   resta la ruta base de la suma origen → estación y estación → destino.

Devuelve `stations`, `baseRoute`, `candidateCount`, `evaluatedCount` y
`sourceUpdatedAt`. Cada estación aceptada incluye
`detour: { distanceKm, durationMinutes }`. La ponderación utiliza `distanceKm`
del desvío. La interfaz muestra cuántas candidatas se evaluaron; el resultado
no representa el óptimo global de todas las estaciones nacionales.

Se descartan conexiones sin ruta, ajustes de coordenadas de estación mayores
de 150 m y diferencias negativas de distancia mayores de 50 m o de tiempo
mayores de un minuto. Diferencias negativas dentro de esas tolerancias se
ajustan a cero. Se rechazan matrices incompletas, estimaciones aéreas y cambios
incoherentes de la ruta base. Los endpoints no pueden ajustarse a la red a más
de un kilómetro. El filtro final exige cumplir el límite de kilómetros elegido.

Las duraciones son estimaciones de conducción, sin incluir repostaje. OSRM
calcula rutas rápidas, no necesariamente las más cortas, y depende de los
accesos y sentidos cartografiados. El enlace de Google Maps incluye origen,
estación y destino; sus rutas pueden diferir de las estimadas aquí.

## Proveedor y configuración

Por defecto se utiliza `https://routing.openstreetmap.de/routed-car/`, servicio
público de FOSSGIS basado en OSRM y OpenStreetMap. No requiere clave. Se envían
coordenadas, sin nombres de lugares, descuentos ni preferencias económicas.
El proveedor puede registrar las coordenadas recibidas según sus condiciones.
Origen y destino no se guardan en las preferencias del navegador. Los campos
y resúmenes de lugares llevan el atributo de enmascarado de Clarity.

Variable opcional de servidor, en `.env.local` o en Vercel:

```text
OSRM_BASE_URL=https://tu-servidor-osrm/
```

La base debe servir `route/v1/driving/…` y `table/v1/driving/…`, con matrices de
distancias y duraciones para al menos catorce coordenadas. Para cambiarla en
Vercel, configura la variable para los entornos correspondientes y redespliega.
No utiliza prefijo `NEXT_PUBLIC_`.

La integración mantiene una búsqueda simultánea por instancia de servidor,
separa llamadas al proveedor al menos un segundo, limita cada llamada a doce
segundos y guarda hasta cuarenta respuestas de rutas/matrices durante cinco
minutos en memoria. Una búsqueda sin caché utiliza dos consultas de rutas.
Los cambios de ponderación no consultan el proveedor. Los demás ajustes
retiran los resultados; se consulta de nuevo al pulsar el botón de búsqueda.

Estos límites son por instancia: varias funciones de Vercel pueden sumar más
peticiones. El servidor público no ofrece garantías de disponibilidad ni está
pensado para uso intenso. Antes de ampliar tráfico, utilizar una instancia propia
o un servicio compatible y coordinar límites entre instancias.

Respuestas: `400` para solicitudes inválidas, `429` para búsquedas simultáneas
o saturación del proveedor y `502` cuando falla el cálculo o la fuente de
precios. Se permite reintentar o cambiar a «Cerca de mí». No se sustituyen
desvíos por distancias en línea recta. Cambiar de modo o editar los lugares
cancela la búsqueda anterior y evita mostrar resultados obsoletos.

La interfaz incluye atribución a OSRM y OpenStreetMap y enlace para corregir el
mapa. Referencias: [documentación HTTP de OSRM](https://project-osrm.org/docs/v26.5.0/http/)
y [condiciones del servicio FOSSGIS](https://routing.openstreetmap.de/about.html).

## Verificación

Las pruebas cubren rutas largas, selección por tramos y precio, descuentos,
matrices dirigidas, accesos sin ruta, errores y límites de desvío. Los flujos
de navegador comprueban móvil y escritorio, edición de lugares, cancelación,
persistencia del límite, navegación con parada y ausencia de controles de ahorro
neto. Una consulta real Sevilla–Córdoba confirmó estaciones a más de 50 km del
origen que cumplían el límite de cinco kilómetros adicionales.
