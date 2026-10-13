# Island View SAS — Arquitectura e identidad del Geoportal 2.0
**Estado:** propuesta técnica y guía de implementación, no funcionalidades desplegadas.  
**Fecha:** 2026-10-13  
**Repositorio:** `isboga/islandviewsas` — carpeta `geoportal/`.

## 1. Decisión arquitectónica

**No sustituir el visor público por RustGIS.** Mantener la interfaz Island View como producto anfitrión, usar un único catálogo de proyectos/productos y seleccionar un motor especializado según la operación:

- **MapLibre GL JS**: exploración cartográfica 2D, ortomosaicos XYZ/WMS, dibujo/medición sencilla y capas vectoriales.
- **DroneDB**: catálogo y distribución de datasets, ortomosaicos y visor nativo cuando convenga.
- **Giro3D**: escenas y visualización geoespacial integrada 2D/3D.
- **Potree/COPC**: nubes de puntos LiDAR/fotogramétricas y mediciones propias del visor.
- **model-viewer / AR**: GLB/glTF y AR en dispositivos compatibles.
- **RustGIS Web (WASM)**: estación de trabajo avanzada GIS: edición vectorial, atributos, simbología y geoprocesamiento. Es una **aplicación independiente**, no un componente MapLibre que se pueda insertar y controlar sin trabajo adicional.
- **Supabase**: identidad, membresías, metadatos y anotaciones con RLS; almacenamiento privado autorizado mediante políticas y URLs de acceso temporales o proxy autorizado.
- **GitHub Pages**: frontend estático; no debe alojar datos privados ni GeoTIFF/LAS grandes.

## 2. Navegación del producto (visible al cliente)

1. **Inicio**: mapa de proyectos y resumen de entregables.
2. **Proyectos**: catálogo con filtros (cliente, servicio, sector, fecha, acceso, formato).
3. **Explorador**: archivos | mapa | información; árbol de carpetas, ficha y acciones.
4. **Visores**: abrir producto con el motor apropiado; herramientas coherentes.
5. **GIS Studio**: espacio avanzado de edición/análisis con RustGIS.
6. **Monitoreo**: tableros, evolución temporal, inspecciones, incidencias.
7. **Mi espacio**: proyectos asignados, permisos, entregables, descargas y cuenta.
8. **Administración** (solo roles autorizados): proyectos, usuarios, productos, permisos, bitácora.

**No** mostrar 8 enlaces en la barra principal en móvil: menú lateral colapsable y barra contextual.

## 3. Jerarquía y navegación

```text
ISLAND VIEW | GEOSPATIAL PLATFORM
├── Inicio / mapa general
├── Proyectos
│   └── Proyecto [ficha / resumen / permisos]
│       ├── Archivos (Dataset Explorer)
│       ├── Mapa (2D / capas)
│       ├── Modelos (3D / AR)
│       ├── Nube de puntos (LiDAR)
│       ├── GIS Studio (editar / analizar)
│       └── Informes / monitoreo / entregables
├── GIS Studio (mis proyectos autorizados)
├── Monitoreo
├── Mi espacio
└── Administración [rol]
```

Regla: **el proyecto es el contexto persistente**. Al cambiar de pestaña no se pierde el proyecto ni su selección. Usar rutas/URL y estado compartido, no copiar la lista de proyectos en cada visor.

## 4. Matriz de motores

| Tipo/acción | Motor predeterminado | Alternativa |
| --- | --- | --- |
| Ortomosaico XYZ/WMS | MapLibre en Product Viewer | RustGIS Studio para análisis |
| GeoTIFF/COG grande | teselas/COG optimizado en visor 2D | RustGIS Web si formato y CORS permiten cargarlo |
| SHP/GeoJSON/KML/GPKG | MapLibre para lectura | RustGIS Studio para edición/análisis (formatos web a validar) |
| LAS/LAZ/COPC | Potree/COPC especializado | herramientas de análisis GIS/LiDAR compatibles |
| GLB/glTF/3D Tiles | Giro3D / model-viewer | AR compatible |
| Dashboards y cambios temporales | módulo Monitoreo | mapas 2D sincronizados |
| Buffer, Clip, Dissolve, tabla atributos | GIS Studio (RustGIS) | implementación progresiva propia |

No afirmar que RustGIS Web soporta exactamente los mismos formatos que RustGIS Desktop: según su instalación, en web se documentan GeoJSON, CSV, GeoTIFF, ASCII grids y .rgis; SHP requiere desktop.

## 5. Tres etapas de integración RustGIS

### A. Prueba sin alterar visores existentes
- Agregar entrada **GIS Studio (Beta)**, visible para administradores o equipo interno.
- Abrir RustGIS Web en nueva pestaña mediante enlace externo, nunca cargar datos privados en una URL pública.
- Probar con un GeoJSON de muestra público y opcionalmente `?blank&data=<URL>`; verificar CORS, tamaño, CRS y experiencia en iPad.
- Confirmar casos: 20+ vértices, edición de polígonos, medición de área, exportación, tabla de atributos.
- No afirmar que una sesión RustGIS externa comparte login, datos ni anotaciones con Supabase.

### B. Versión personalizada de RustGIS
- Crear **repositorio o rama de integración** separado del portal productivo.
- Compilar `apps/rustgis-web` con Trunk y Rust/wasm32, hospedar en una ruta o subdominio dedicado.
- Incorporar identidad Island View y avisos de terceros; Apache-2.0 exige conservar avisos aplicables.
- Diseñar protocolo explícito de intercambio (GeoJSON y proyectos .rgis), con verificación de origen y autorización; no asumir `postMessage` existente.
- Medir memoria, tiempo de arranque, compatibilidad WebGPU/WebGL2, CORS y funcionamiento táctil.

### C. Integración profunda
- Establecer contrato de contexto `projectId`, `productId`, `datasetVersion`, `crs`, `extent`, `userRole`.
- Adaptador de exportación/importación de geometrías y atributos; validación topológica y control de versiones.
- Guardado autorizado por API/Edge Function; RLS y auditoría. El frontend nunca concede acceso por PIN o por ocultar enlaces.
- Integrar progresivamente comandos de RustGIS/WASM **solo si la API lo permite**; no copiar el editor de manera frágil.

**Puerta de decisión:** pasar de A a B solo si hay un flujo demostrable, licencias claras, compatibilidad de navegador y un caso de uso real para Island View.

## 6. Identidad visual única

**Marca:** Island View SAS. Nombre de producto: **Island View Geospatial Platform**. No alternar entre logos genéricos «IV», textos grandes inconexos y estilos de DroneDB.

**Tokens iniciales propuestos** (ajustar al logo real, contraste WCAG):
- Azul corporativo `#117DB4`: acciones primarias, enlaces y selección.
- Azul profundo `#153B53`: barras, encabezados oscuros y contraste.
- Turquesa `#18A9C6`: datos activos y selección geoespacial.
- Fondo claro `#F5F8FA`, superficie `#FFFFFF`, borde `#D8E3EA`.
- Texto principal `#1C3442`, secundario `#607782`.
- Amarillo medición `#FFC21C`: vértices y geometrías activas (no reemplazar azul corporativo).
- Semántica: verde para éxito, ámbar para advertencia, rojo para error.

**Estructura visual en todos los visores:**
- Encabezado único de 64–72 px: logo, migas `Proyectos / SAI / COMAD.tif`, estado de acceso, usuario y acciones.
- Navegación lateral plegable (240–280 px) en explorador/estudio; oculta por defecto en modo visor completo.
- Barra de herramientas contextual vertical (icono + tooltip + etiqueta accesible).
- Panel derecho de propiedades/atributos (320–360 px), plegable.
- Pie discreto: escala, SRC, coordenadas, estado de carga, fuente de datos.
- Mismos iconos (Lucide), tipografía Inter/system, espaciado 8 px, botones táctiles de mínimo 44 px.
- Misma acción en el mismo lugar: volver, zoom, capas, medir, editar, exportar, pantalla completa.
- Modo claro para catálogo y paneles; lienzo de mapa sin recubrimientos opacos innecesarios. Modo oscuro opcional en herramientas.

## 7. Contrato único de visor y datos

Cada producto debería resolverse desde un registro único, no por reglas dispersas de extensión:
```json
{
  "id": "product-001",
  "projectId": "sai-dronedb",
  "title": "Ortomosaico COMAD",
  "category": "orthomosaic",
  "format": "geotiff",
  "crs": "EPSG:4326",
  "bounds": null,
  "source": {"kind": "dronedb", "path": "COMAD.tif"},
  "viewer": "map2d",
  "permissions": {"view": true, "download": false, "edit": false},
  "derived": [],
  "captureDate": null
}
```
Este es un **contrato objetivo ilustrativo**, no la estructura actual garantizada de Supabase. Campos sensibles deben provenir del backend autorizado.

**API interna objetivo**: `openProduct(productId)`, `setProject(projectId)`, `setLayerVisibility(layerId, visible)`, `getSelection()`, `exportSelection(format)`, `saveAnnotation(data)`. Cada motor usa un adaptador; no mezclar directamente lógica de MapLibre/Potree/Giro3D en el catálogo.

## 8. Reorganización de código propuesta (migración progresiva)

```text
geoportal/
├── index.html                  # Entrada principal, existente
├── dataset-explorer.html       # Explorador, existente
├── product-viewer.html         # Visor por producto, existente
├── unified-viewer.html         # Giro3D, existente
├── pointcloud-viewer.html      # Potree, existente
├── studio/                     # NUEVO: RustGIS, fase beta
│   ├── index.html
│   └── integration.md
├── shared/                     # NUEVO: código reutilizable
│   ├── theme.css               # tokens + tipografía + controles
│   ├── shell.js                # cabecera, breadcrumbs, navegación
│   ├── product-registry.js     # catálogo y selector de motor
│   ├── viewer-contract.js      # interfaz común de motores
│   └── access.js               # UI de permisos, NO seguridad real
├── adapters/                   # NUEVO
│   ├── maplibre-adapter.js
│   ├── giro3d-adapter.js
│   ├── potree-adapter.js
│   └── rustgis-adapter.js
├── features/                   # NUEVO
│   ├── measurements/
│   ├── annotations/
│   ├── layers/
│   └── exports/
├── supabase/                   # EXISTENTE
└── docs/
    └── GEOPORTAL_2_0_ARCHITECTURE.md
```
Los nombres bajo NUEVO representan la **estructura objetivo**, no archivos ya creados. Mantener compatibilidad con enlaces antiguos y rutas de GitHub Pages durante la migración.

## 9. Orden de implementación y criterios de aceptación

**Fase 0 — Congelar inventario y pruebas**
- Mapear rutas actuales, dependencias y servicios de datos; no borrar páginas.
- Casos mínimos de medición: 3, 4, 10 y 25 vértices; doble clic/terminar; táctil; unidades m²/ha/km²; etiqueta interior.
- Medir tiempos de carga con datasets pequeños y grandes.

**Fase 1 — Identidad y navegación (prioridad máxima)**
- Un solo header, logo, breadcrumbs, iconografía, tipografía y esquema de color.
- Navegación proyecto → archivos → producto → volver preservando contexto.
- Accesibilidad y responsive iPad/móvil.

**Fase 2 — Visores coherentes**
- Registrar adaptadores; herramientas consistentes y panel de propiedades único.
- Mapa 2D, nubes, 3D/AR mantienen motores especializados.
- Manejo explícito de errores CORS/archivo no disponible.

**Fase 3 — GIS Studio beta**
- Abrir RustGIS con datos públicos de prueba; evaluar 5 operaciones y compatibilidad iPad.
- Acordar criterios para compilar versión Island View.

**Fase 4 — Datos, colaboración y monitoreo**
- Guardar anotaciones con permisos, historial, exportaciones y auditoría.
- Integrar dashboards e informes según proyectos.

**Fase 5 — GIS Studio integrado**
- Solo después de prueba técnica de API/WASM, build, seguridad y rendimiento.

## 10. Reglas de seguridad, calidad y licencias

- No exponer archivos privados en GitHub Pages, URLs compartidas o parámetros `?data=`.
- Nunca asumir que un `iframe` externo tiene acceso a la sesión Supabase.
- No añadir credenciales ni tokens de servicio al repositorio.
- No confundir RustGIS con DroneDB ni usar sus marcas como identidad principal.
- Registrar versiones/licencias de RustGIS (Apache-2.0), MapLibre, Giro3D, Potree y dependencias.
- Validar geometrías, CRS y resultados antes de reportar mediciones oficiales o catastrales.
- Las capacidades en README upstream no equivalen a funciones integradas ni verificadas en Island View.

## 11. Fuentes
- RustGIS: https://github.com/opengeos/RustGIS
- RustGIS instalación web: https://github.com/opengeos/RustGIS/blob/main/docs/installation.md
- RustGIS arquitectura: https://rustgis.app/architecture/
- GeoLibre (referencia de enfoque web): https://github.com/opengeos/GeoLibre
