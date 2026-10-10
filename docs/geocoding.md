# Geocodificación manual

La búsqueda manual utiliza exclusivamente Photon, basado en OpenStreetMap, desde
el servidor. No requiere una clave de API. El usuario busca por municipio, código
postal o dirección y elige una coincidencia antes de consultar las gasolineras.

## Integración

- `GET /api/locations?q=...` admite consultas de 3 a 160 caracteres.
- Se solicitan hasta ocho coincidencias restringidas a España (`countrycode=ES`).
- Cada resultado incluye nombre, municipio, provincia, coordenadas y precisión.
- La selección utiliza las coordenadas incluidas; no hace otra consulta de
  geocodificación.
- Direcciones con número se clasifican como `address`; calles sin número como
  `street`; municipios, zonas y códigos postales como `area`. Las calles y zonas
  se muestran como ubicaciones aproximadas.
- Se descartan puntos de interés ajenos a estos tipos, coordenadas inválidas y
  duplicados. Los lugares ambiguos se presentan al usuario para que elija.

La integración está en `lib/server/photon.ts`; la normalización de resultados en
`lib/geocoding.ts`. `PHOTON_API_URL` permite usar otra instancia compatible.
Por defecto se consulta `https://photon.komoot.io/api/`.

## Límites operativos

Las consultas se envían únicamente al confirmar el formulario. Se cancelan al
editar la entrada, abandonar el componente o iniciar otra búsqueda.

Cada petición tiene un timeout de seis segundos. La caché en memoria dura un
minuto y conserva hasta 200 consultas por instancia del servidor. El límite local
es de cuatro peticiones simultáneas; no es un límite global entre instancias.
El servidor responde con `Cache-Control: no-store` para evitar cachés HTTP.

Los límites locales y el estado 429 del proveedor se traducen en un error
recuperable con `Retry-After: 5`. Otros fallos devuelven 502 y la interfaz permite
reintentar o utilizar la ubicación del navegador.

El servidor público de Komoot admite un uso moderado, sin garantía de disponibilidad.
Para más tráfico se debe evaluar una instancia propia o un servicio con capacidad
acordada. La cobertura y precisión dependen de los datos de OpenStreetMap.

## Atribución y privacidad

La interfaz enlaza Photon y «© OpenStreetMap contributors». Los datos de
OpenStreetMap se distribuyen bajo ODbL; la licencia del software Photon es Apache 2.0.

Las búsquedas y las coordenadas no se guardan en las preferencias ni en una base
de datos. Las consultas permanecen temporalmente en la caché del servidor y se
envían al proveedor para su resolución. El formulario está enmascarado para
Clarity. Las URLs de petición pueden aparecer en los registros de la plataforma.

## Verificación

Las consultas reales `41020` y `Sevilla` devolvieron resultados españoles con
coordenadas. El código postal se mostró como zona aproximada; el resultado de
municipio permitió buscar estaciones sin activar la geolocalización.

Las pruebas automatizadas cubren normalización, precisión, lugares ambiguos,
coordenadas inválidas, validación de entrada, consulta directa al proveedor,
caché, cancelación y errores. Las pruebas de navegador comprueban selección con
teclado, recuperación de errores y búsqueda de estaciones en móvil y escritorio.

Referencias: [Photon y condiciones del servidor de demostración](https://github.com/komoot/photon#demo-server),
[API de Photon](https://github.com/komoot/photon/blob/master/docs/api-v1.md)
y [atribución y licencia de OpenStreetMap](https://www.openstreetmap.org/copyright).
