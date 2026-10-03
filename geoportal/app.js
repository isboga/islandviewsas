const SATELLITE_STYLE = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Tiles © Esri"
    }
  },
  layers: [{ id:"esri", type:"raster", source:"esri" }]
};

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors"
    }
  },
  layers: [{ id:"osm", type:"raster", source:"osm" }]
};

const center = [-81.7006, 12.5847];

const buildings = {
  type:"FeatureCollection",
  features:[
    {
      type:"Feature",
      properties:{name:"Edificación demo A"},
      geometry:{type:"Polygon",coordinates:[[[-81.7050,12.5851],[-81.7045,12.5851],[-81.7045,12.5847],[-81.7050,12.5847],[-81.7050,12.5851]]]}
    },
    {
      type:"Feature",
      properties:{name:"Edificación demo B"},
      geometry:{type:"Polygon",coordinates:[[[-81.6997,12.5819],[-81.6991,12.5819],[-81.6991,12.5814],[-81.6997,12.5814],[-81.6997,12.5819]]]}
    }
  ]
};

const riskZones = {
  type:"FeatureCollection",
  features:[
    {
      type:"Feature",
      properties:{name:"Zona de interés demo"},
      geometry:{type:"Polygon",coordinates:[[[-81.709,12.589],[-81.702,12.590],[-81.699,12.586],[-81.705,12.583],[-81.709,12.589]]]}
    }
  ]
};

const projects = {
  type:"FeatureCollection",
  features:[
    {type:"Feature",properties:{name:"Magic Garden",type:"Monitoreo RPAS"},geometry:{type:"Point",coordinates:[-81.721,12.564]}},
    {type:"Feature",properties:{name:"Lynval / Cove",type:"Fotogrametría"},geometry:{type:"Point",coordinates:[-81.724,12.536]}},
    {type:"Feature",properties:{name:"San Andrés",type:"Geoportal territorial"},geometry:{type:"Point",coordinates:[-81.701,12.584]}}
  ]
};

let usingSatellite = true;

const map = new maplibregl.Map({
  container:"map",
  style:SATELLITE_STYLE,
  center,
  zoom:13.2,
  pitch:28,
  bearing:-8
});

map.addControl(new maplibregl.NavigationControl({visualizePitch:true}), "bottom-left");
map.addControl(new maplibregl.ScaleControl({maxWidth:120, unit:"metric"}), "bottom-left");

function addOperationalLayers(){
  if (!map.getSource("buildings")) {
    map.addSource("buildings",{type:"geojson",data:buildings});
    map.addLayer({id:"buildings-fill",type:"fill",source:"buildings",paint:{"fill-color":"#66d5ff","fill-opacity":0.42}});
    map.addLayer({id:"buildings-line",type:"line",source:"buildings",paint:{"line-color":"#c5f1ff","line-width":1.4}});
  }
  if (!map.getSource("risk")) {
    map.addSource("risk",{type:"geojson",data:riskZones});
    map.addLayer({id:"risk-fill",type:"fill",source:"risk",paint:{"fill-color":"#ffbc5b","fill-opacity":0.23}});
    map.addLayer({id:"risk-line",type:"line",source:"risk",paint:{"line-color":"#ffcf85","line-width":2,"line-dasharray":[2,2]}});
  }
  if (!map.getSource("projects")) {
    map.addSource("projects",{type:"geojson",data:projects});
    map.addLayer({id:"projects-circle",type:"circle",source:"projects",paint:{"circle-radius":7,"circle-color":"#2bc7b4","circle-stroke-width":2,"circle-stroke-color":"#eafffb"}});
  }

  map.on("click","projects-circle",(e)=>{
    const p=e.features[0].properties;
    new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<strong>${p.name}</strong><br><span style="opacity:.75">${p.type}</span>`).addTo(map);
  });

  map.on("mouseenter","projects-circle",()=>map.getCanvas().style.cursor="pointer");
  map.on("mouseleave","projects-circle",()=>map.getCanvas().style.cursor="");
}

map.on("load", addOperationalLayers);

map.on("mousemove",(e)=>{
  document.getElementById("coords").textContent = `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`;
});

function setVisibility(ids, visible){
  ids.forEach(id=>{
    if(map.getLayer(id)) map.setLayoutProperty(id,"visibility",visible?"visible":"none");
  });
}

document.getElementById("toggle-buildings").addEventListener("change",(e)=>setVisibility(["buildings-fill","buildings-line"],e.target.checked));
document.getElementById("toggle-risk").addEventListener("change",(e)=>setVisibility(["risk-fill","risk-line"],e.target.checked));
document.getElementById("toggle-points").addEventListener("change",(e)=>setVisibility(["projects-circle"],e.target.checked));

document.getElementById("btn-home").addEventListener("click",()=>map.flyTo({center,zoom:13.2,pitch:28,bearing:-8,duration:1000}));

document.getElementById("btn-style").addEventListener("click",()=>{
  usingSatellite=!usingSatellite;
  map.setStyle(usingSatellite?SATELLITE_STYLE:OSM_STYLE);
  map.once("style.load",addOperationalLayers);
});

/*
  CONEXIÓN DRONEDB / GEOSERVER
  -----------------------------
  Ejemplo WMS GeoServer:
  map.addSource("ortho", {
    type: "raster",
    tiles: [
      "https://TU_SERVIDOR/geoserver/wms?service=WMS&version=1.1.1&request=GetMap&layers=workspace:ortho&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true"
    ],
    tileSize: 256
  });

  Para DroneDB, usa su endpoint público de tiles/WMS/XYZ si el proyecto lo expone.
  La URL se puede guardar en config.js para evitar tocar app.js.
*/