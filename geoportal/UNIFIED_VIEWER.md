# Island View Unified Geospatial Viewer

Visor 2D/3D experimental para productos derivados de proyectos de Island View S.A.S.

## Arquitectura

El visor usa Giro3D como motor geoespacial 2D/3D y mantiene Supabase como catálogo/autorización. Los archivos pesados permanecen en servicios optimizados para web (DroneDB, WMS/XYZ, COG, COPC o 3D Tiles).

Se abre con:

`unified-viewer.html?project=<slug>`

El catálogo consulta primero `portal_projects` y `portal_products` bajo RLS y luego añade productos públicos declarados en `products.json`.

## Fuentes admitidas

`portal_products.source` puede usar:

- WMS: `{"kind":"wms","url":"...","layer":"...","projection":"EPSG:3857"}`
- XYZ: `{"kind":"xyz","url":"https://.../{z}/{x}/{y}.png"}`
- COG / GeoTIFF: `{"kind":"cog","url":"https://.../ortho.tif"}`
- COPC: `{"kind":"copc","url":"https://.../cloud.copc.laz"}`
- Potree: `{"kind":"potree","url":"https://.../metadata.json"}`
- 3D Tiles: `{"kind":"3dtiles","url":"https://.../tileset.json"}`
- GLB/glTF: `{"kind":"glb","url":"https://.../model.glb","position":[-81.7,12.58,0],"scale":1}`

## Principios

- Las mediciones viven en una capa propia y se fuerzan por encima de las capas raster.
- Los productos privados nunca se descubren desde JSON público; Supabase RLS decide qué filas recibe el navegador.
- COG, COPC y 3D Tiles son preferibles a archivos monolíticos grandes porque permiten streaming y niveles de detalle.
- Esta implementación no copia la interfaz ni el código de DroneDB Hub. Usa Giro3D mediante su licencia MIT y patrones de API públicos.
