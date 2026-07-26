# Combustible Cerca

SPA responsive para comparar gasolineras españolas por precio, distancia y una
recomendación ponderada. Consume los datos públicos del Ministerio para la
Transición Ecológica mediante una ruta de servidor de Next.js.

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
3. Vercel detectará Next.js. No hace falta configurar variables de entorno.
4. Pulsa **Deploy**.

También puedes desplegarlo desde una terminal:

```bash
npm install -g vercel
vercel
vercel --prod
```

Vercel servirá automáticamente la aplicación por HTTPS, requisito del navegador
para solicitar geolocalización fuera de `localhost`.

## Cálculo

- Se descartan estaciones sin precio para el combustible seleccionado.
- Las distancias se calculan con Haversine y el usuario puede configurar un
  radio de búsqueda entre 1 y 50 km.
- El descuento de marca se resta antes de ordenar o puntuar.
- Smart Score normaliza precio y distancia entre 0 y 1, y pondera el coste:
  `70% precio + 30% distancia`. Una puntuación más alta es mejor.
