# demenos

SPA responsive para comparar gasolineras españolas por precio, distancia y una
recomendación ponderada. Consume los datos públicos del Ministerio para la
Transición Ecológica mediante una ruta de servidor de Next.js.

Permite buscar con la ubicación del navegador o por municipio, código postal y
dirección usando Photon/OpenStreetMap. El usuario elige una coincidencia antes de
buscar estaciones. Las zonas y calles sin número se indican como aproximadas.

El modo «En ruta» permite elegir origen, destino y un desvío máximo. Compara
paradas por precio y kilómetros adicionales por carretera, muestra los minutos
extra y permite abrir la navegación con la estación como parada.

Combustible, radio, desvío máximo, ponderación y descuentos válidos se conservan en el navegador.
Las preferencias antiguas se migran automáticamente; si el almacenamiento está
bloqueado, se puede seguir usando la aplicación durante la sesión.

La [hoja de ruta](ROADMAP.md) recoge las próximas fases, sus dependencias y los
criterios para validar cada entrega.

## Desarrollo local

Requisitos: Node.js 20.9 o superior y npm.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La geolocalización funciona
en `localhost` y en conexiones HTTPS.

Para comprobar la versión de producción:

```bash
npm run build
npm start
```

## Despliegue en Vercel

1. Sube el proyecto a un repositorio de GitHub, GitLab o Bitbucket.
2. En [vercel.com/new](https://vercel.com/new), importa el repositorio.
3. Vercel detectará Next.js. La búsqueda funciona sin variables de entorno;
   para activar Clarity, configura la variable indicada en la sección de analíticas.
4. Pulsa **Deploy**.

También puedes desplegarlo desde una terminal:

```bash
npm install -g vercel
vercel
vercel --prod
```

Vercel servirá automáticamente la aplicación por HTTPS, requisito del navegador
para solicitar geolocalización fuera de `localhost`.

## Analíticas

Vercel Web Analytics está integrado en el layout global. Activa **Analytics →
Enable** en el panel del proyecto de Vercel y despliega los cambios.

Microsoft Clarity utiliza exclusivamente `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
En Vercel, abre **Settings → Environment Variables**, añade esa variable con el ID
de tu proyecto de Clarity y selecciona **Production**. Guarda y despliega los
cambios. La variable se incorpora durante el build; si falta o está vacía,
Clarity permanece desactivado.

Clarity se inicializa solo en producción y cuando existe un ID configurado.
Para comprobarlo localmente, configura el ID en `.env.local` y ejecuta
`npm run build` y `npm start`.
`npm run dev` no envía datos a Clarity.

Referencias: [Vercel Web Analytics](https://vercel.com/docs/analytics/quickstart)
y [integración oficial de Clarity](https://clarity.microsoft.com/blog/?p=6829).

## Cálculo

- Se descartan estaciones sin precio para el combustible seleccionado.
- En «Cerca de mí», las distancias se calculan con Haversine y el usuario puede
  configurar un radio de búsqueda entre 1 y 50 km.
- En «En ruta», el límite admite entre 0 y 20 kilómetros adicionales respecto al
  trayecto sin parada. La ponderación y la lista de cercanía utilizan ese desvío.
- El descuento de marca se resta antes de ordenar o puntuar.
- La recomendación normaliza precio y distancia entre 0 y 1 y utiliza una
  ponderación configurable, inicialmente `70% precio + 30% distancia`. Los puntos
  se usan internamente para ordenar, sin mostrarse en las tarjetas. La comparación
  es relativa a las estaciones encontradas y no calcula el coste del trayecto.
- Los descuentos admiten de 0,1 a 100 céntimos/L con un decimal como máximo. Las
  filas incompletas o fuera de límites no se aplican ni se guardan.

## Búsqueda manual

`GET /api/locations?q=...` consulta Photon y devuelve hasta ocho coincidencias de
España con sus coordenadas. Al seleccionar una se buscan directamente las
estaciones, sin otra petición de geocodificación. No requiere clave de API.
Se consulta solo al enviar el formulario y las consultas obsoletas se cancelan.
Los fallos permiten reintentar o usar la ubicación del navegador.

Las peticiones tienen un timeout de seis segundos y una caché de un minuto en el
servidor. `PHOTON_API_URL` permite configurar una instancia alternativa; por
defecto se utiliza el servidor público de Komoot para un uso moderado.

Consulta la [documentación de geocodificación](docs/geocoding.md) para conocer la
atribución, las condiciones de uso y los límites operativos.

## Búsqueda en ruta

1. Selecciona «En ruta» y ajusta el desvío máximo que aceptas.
2. Busca y selecciona una coincidencia para el origen y otra para el destino.
3. Pulsa «Buscar estaciones en ruta». Las tarjetas muestran el precio final,
   los kilómetros y minutos adicionales. «Ir con esta parada» abre Google Maps.

La búsqueda considera todo el recorrido, también las estaciones a más de 50 km
del origen. Evalúa por carretera hasta doce candidatas, combinando las de menor
precio con estaciones de distintos tramos. La interfaz muestra el alcance de
esta selección; no promete encontrar el óptimo entre todas las estaciones.

`POST /api/journey` utiliza OSRM con perfil de coche. No necesita clave. Puedes
configurar `OSRM_BASE_URL` en el servidor para utilizar una instancia propia o
un proveedor compatible. El servicio público predeterminado está destinado a
uso moderado. Consulta la [documentación de rutas](docs/journey.md) para los
límites, la configuración y el comportamiento ante errores.

Origen y destino no se guardan en las preferencias. Los descuentos ya existentes
se aplican antes de seleccionar y ordenar las estaciones.

## Verificación

```bash
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas de navegador arrancan la versión compilada en el puerto 3100 y cubren
escritorio y móvil con respuestas controladas, sin depender de los servicios
externos. Los artefactos se guardan en `test-results/`, excluido de Git.
