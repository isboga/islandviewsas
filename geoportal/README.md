# Island View SAS · Geoportal de clientes

Geoportal web estático para explorar muestras públicas de proyectos geoespaciales de Island View SAS. Conserva la arquitectura original del proyecto: HTML + CSS + JavaScript sin framework, MapLibre GL JS para el mapa y GitHub Pages como destino de publicación previsto.

## Arquitectura existente y ampliada

- `index.html`: interfaz principal y dependencias CDN.
- `styles.css`: identidad visual y responsive.
- `app.js`: MapLibre, capas base, DroneDB, dibujo, medición y exportación.
- `portal.js`: catálogo, filtros, búsqueda local, carga de archivos, resultados, edición, paneles, historias y galería 3D/AR.
- `projects.json`: metadatos **públicos** de proyectos. Añadir/editar proyectos aquí evita modificar componentes.
- `layers.json`: registro configurable de raster XYZ/WMS/WMTS.
- `../sitarbuckss.glb`: modelo demostrativo ya presente en el repositorio.

No hay gestor de paquetes, build, backend ni autenticación en este repositorio.

## Datos públicos y privados

Este repositorio es público y GitHub Pages es un alojamiento estático. **No existe seguridad real basada en ocultar enlaces, localStorage o PIN en JavaScript.** Cualquier archivo enviado al navegador puede copiarse.

Por ello:

1. `projects.json` debe contener únicamente datos autorizados para publicación.
2. No guardar tokens, contraseñas, API keys, PIN, fotografías restringidas ni endpoints privados en el repositorio.
3. Los proyectos privados deben quedar fuera del despliegue público hasta integrar un backend de autenticación/autorización que aplique permisos a los datos, no solo a la interfaz.
4. `privateProjects` se mantiene vacío intencionalmente.

## Configurar proyectos

Añadir una entrada a `projects.json` con:

- `id`, `name`, `description`
- `service`, `client`, `location`, `coordinates`
- `captureDate`
- `methods`, `equipment`, `products`
- `crs`
- `access: "public"`
- `category`: `fotogrametria`, `lidar`, `inspecciones`, `monitoreo`, `modelos-3d` o `cartografia`
- `model` opcional para GLB/glTF público

El catálogo filtra por servicio, cliente, ubicación, fecha, producto y categoría.

## Visor GIS

El visor usa MapLibre GL JS y conserva las herramientas existentes:

- capas base satélite/OSM;
- escala, navegación, coordenadas;
- DroneDB/WMS cuando el endpoint responde y CORS lo permite;
- punto, línea, polígono, medición de distancia/área;
- vértices visibles y numerados durante el dibujo;
- anotaciones;
- edición básica de la selección;
- borrar y lista de resultados;
- exportación GeoJSON, KML, KMZ y Shapefile ZIP;
- importación local GeoJSON/KML/GPX/CSV;
- pantalla completa;
- búsqueda local por proyecto o coordenadas.

La búsqueda no usa geocodificación externa ni requiere una API key.

## Capas raster y ortomosaicos

Configurar fuentes públicas en `layers.json`.

- XYZ: plantilla de URL `{z}/{x}/{y}`.
- WMS: `baseUrl` + `layer`, o endpoint GetCapabilities para descubrimiento.
- WMTS: `tileUrlTemplate` ya resuelto por el proveedor.

No subir ortomosaicos GeoTIFF grandes como si GitHub Pages fuera un servidor GIS. GitHub bloquea objetos Git individuales por encima de 100 MiB y GitHub Pages tiene límites de sitio/ancho de banda. Para ortomosaicos grandes usar teselas web optimizadas o un endpoint externo público compatible (DroneDB/GeoServer/servidor COG/tiles) con CORS y permisos adecuados.

## Mapas base y atribución

El proyecto conserva las fuentes que ya utilizaba:

- OpenStreetMap Standard: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`. La atribución debe permanecer visible. No implementar descarga masiva, prefetch ni uso offline desde estos servidores. Política: https://operations.osmfoundation.org/policies/tiles/
- Esri World Imagery: fuente existente en el proyecto. Mantener atribución visible y revisar sus términos antes de aumentar tráfico o cambiar el uso.

Las fuentes se pueden sustituir en `app.js`/configuración si cambian los requisitos del proveedor.

## 3D y AR

La galería reutiliza `<model-viewer>`, tecnología que ya estaba en el repositorio raíz.

- GLB/glTF: vista 3D bajo demanda.
- AR: el botón solo aparece si `model-viewer` reporta compatibilidad.
- iOS puede requerir USDZ para Quick Look según el flujo.
- No cargar modelos pesados automáticamente.
- MTL por sí solo no es un modelo: requiere OBJ y sus texturas.
- Potree se mantiene como enlace/visor externo existente. Este proyecto no afirma soporte nativo de nube de puntos Potree hasta configurar un dataset/visor real.

## Paneles e historias

`portal.js` incluye paneles e historias propias de Island View. Los KPI y series incluidos están marcados explícitamente como **EJEMPLO** hasta conectar datos reales. No se usa la marca “ArcGIS StoryMaps”.

## Publicación

El módulo está en `/geoportal/`. El repositorio no contiene un workflow de GitHub Actions para Pages; la configuración documentada anteriormente es despliegue desde la rama `main` y carpeta raíz.

URL esperada si Pages está correctamente habilitado:

`https://isboga.github.io/islandviewsas/geoportal/`

La existencia del código en `main` no demuestra por sí sola que GitHub Pages haya terminado de publicar. Verificar la URL desplegada después de cada cambio.

## Límites de GitHub Pages

GitHub documenta un tamaño máximo de sitio publicado de 1 GB, límite recomendado de 1 GB para el repositorio fuente de Pages, límite flexible de 100 GB/mes de ancho de banda y tiempo máximo de despliegue de 10 minutos. Referencia: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

GitHub también bloquea archivos Git individuales de más de 100 MiB. Los productos geoespaciales grandes deben vivir fuera del frontend estático.

## Verificación

No existe `package.json`, linter, test suite ni build configurado. Las verificaciones aplicables son:

- sintaxis JavaScript de `app.js` y `portal.js`;
- JSON válido en `projects.json` y `layers.json`;
- comprobación manual del despliegue de GitHub Pages;
- pruebas en Safari/iPad, móvil y escritorio para dibujo, importación, exportación y 3D.

