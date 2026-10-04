# Island View Geoportal — DroneDB functional parity

Reference implementation: DroneDB/Hub. Island View reproduces the workflow and capabilities with its own UI/code and compatible open-source viewers.

## Primary experience
- **Archivos**: dataset tree + grid/table products + thumbnails + search.
- **Mapa**: satellite basemap + all georeferenced products + GIS analysis.
- **Información**: dataset/product metadata, formats, counts, source and capabilities.

## Product routing
| Data | Detection | Viewer | Target capabilities |
|---|---|---|---|
| GeoTIFF / COG / orthomosaic | DroneDB GeoRaster (4) | Map / Giro3D | opacity, order, inspect value, distance, area, profile, contours |
| DEM / DSM / DTM | GeoRaster + elevation semantics | Map / Giro3D | elevation profile, contours, area statistics, volume |
| LAS / LAZ / COPC | PointCloud (5) | Potree | point, distance, area, height, profile, volume, EDL |
| OBJ / GLB / model | Model (11) | Giro3D / 3D Tiles | orbit, point, distance, area, annotations |
| OGC 3D Tiles / .3tz | Tiles3D (16) | Giro3D | streaming, orbit, point, distance, area |
| SHP / GeoJSON / KML / KMZ / GPKG | Vector (14) | Map / Giro3D | MVT/GeoJSON display, identify, labels, measurement |
| Geotagged photos | GeoImage (3) | Map + lightbox | location, coordinates, metadata |
| Geotagged video | GeoVideo (10) | Map + media viewer | location, coordinates, playback |
| Panorama | Panorama/GeoPanorama (12/13) | panorama viewer | immersive navigation |
| Gaussian splat | GaussianSplat (15) | splat viewer | 3D navigation |

## GIS tool parity
### Map
- point annotation / coordinate readout
- distance
- area
- edit / delete / clear
- layer visibility + opacity
- raster spot value
- raster profile
- contours
- stockpile volume
- measurement persistence/export (planned Supabase adapter)
- split/temporal comparison (planned)
- raster area statistics (planned)
- plant health / multispectral controls when bands support it (planned)

### Point cloud / Potree
- point/coordinate
- distance
- area
- height
- profile
- volume
- EDL
- point budget
- measurement persistence/export (planned)
- classification/color modes (planned)

### Unified 3D
- raster/vector/point cloud/3D Tiles in one scene
- 2D/3D navigation
- point/distance/area
- annotations
- layer visibility
- display controls
- measurement persistence/export (planned)

## Backend-dependent Registry tools
These call DroneDB Registry services and therefore require a compatible backend for datasets not hosted in DroneDB:
- raster point value
- raster area statistics
- raster profile
- contour generation
- stockpile detection / volume
- derived COG/COPC/MVT/3D Tiles builds

For Island View-owned/private storage, implement compatible services via the Island View backend instead of proxying large binaries through Supabase Edge Functions.

## Licensing
Do not copy DroneDB Hub Vue source wholesale. Use the repository as a functional/API reference and retain Island View's independent implementation. Review upstream licenses before incorporating source.
