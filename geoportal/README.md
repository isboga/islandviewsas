# Island View Geoportal

Primera versión funcional del geoportal web de Island View SAS.

## Arquitectura inicial

- Frontend: MapLibre GL JS
- Hosting recomendado: GitHub Pages
- Mapas base: Esri World Imagery + OpenStreetMap
- Datos demo: GeoJSON
- Backend futuro:
  - DroneDB para productos RPAS
  - GeoServer para WMS/WFS/WMTS
  - PostgreSQL + PostGIS para datos vectoriales
  - CesiumJS para escenas 3D

## Publicación con GitHub Pages

Este módulo vive en `/geoportal/`.

Si GitHub Pages ya está activado en el repositorio `isboga/islandviewsas`, la URL será normalmente:

`https://isboga.github.io/islandviewsas/geoportal/`

Si todavía no está activo:

1. GitHub > repositorio > Settings > Pages
2. Source: Deploy from a branch
3. Branch: main
4. Folder: /(root)
5. Guardar

## Próximo paso: datos reales

Reemplazar los GeoJSON demo por:
- huellas de edificaciones
- límites prediales
- vías
- ortomosaicos
- DSM / DTM
- zonas de amenaza
- puntos de inspección
- proyectos y monitoreos

Para ortomosaicos grandes, no subir TIFF directamente a GitHub Pages. Servirlos desde DroneDB, GeoServer, COG + tile server o almacenamiento compatible con HTTP Range.

## Estructura recomendada futura

```
geoportal/
  index.html
  styles.css
  app.js
  config.js
  data/
  assets/
```

## Dominio recomendado

`geo.islandviewsas.com`
