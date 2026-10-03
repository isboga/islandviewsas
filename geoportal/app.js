const DDB={hub:"https://hub.dronedb.app/r/islan-view-sas/sai",base:"https://hub.dronedb.app/orgs/islan-view-sas/ds/sai"};
const SAT={version:8,sources:{esri:{type:"raster",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],tileSize:256,attribution:"© Esri"}},layers:[{id:"esri",type:"raster",source:"esri"}]};
const OSM={version:8,sources:{osm:{type:"raster",tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],tileSize:256,attribution:"© OpenStreetMap contributors"}},layers:[{id:"osm",type:"raster",source:"osm"}]};
const center=[-81.7006,12.5847];let satellite=true,ddbNames=[];
const buildings={type:"FeatureCollection",features:[{type:"Feature",properties:{name:"Edificación demo"},geometry:{type:"Polygon",coordinates:[[[-81.705,12.5851],[-81.7045,12.5851],[-81.7045,12.5847],[-81.705,12.5847],[-81.705,12.5851]]]}}]};
const risk={type:"FeatureCollection",features:[{type:"Feature",properties:{name:"Zona demo"},geometry:{type:"Polygon",coordinates:[[[-81.709,12.589],[-81.702,12.590],[-81.699,12.586],[-81.705,12.583],[-81.709,12.589]]]}}]};
const projects={type:"FeatureCollection",features:[{type:"Feature",properties:{name:"Magic Garden",type:"Monitoreo RPAS"},geometry:{type:"Point",coordinates:[-81.721,12.564]}},{type:"Feature",properties:{name:"Lynval / Cove",type:"Fotogrametría"},geometry:{type:"Point",coordinates:[-81.724,12.536]}}]};
const map=new maplibregl.Map({container:"map",style:SAT,center,zoom:13.2,pitch:25,bearing:-8});map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"bottom-left");map.addControl(new maplibregl.ScaleControl({unit:"metric"}),"bottom-left");
function core(){if(!map.getSource("b")){map.addSource("b",{type:"geojson",data:buildings});map.addLayer({id:"bf",type:"fill",source:"b",paint:{"fill-color":"#18a9c6","fill-opacity":.4}});map.addLayer({id:"bl",type:"line",source:"b",paint:{"line-color":"#baf3ff","line-width":1.5}})}if(!map.getSource("r")){map.addSource("r",{type:"geojson",data:risk});map.addLayer({id:"rf",type:"fill",source:"r",paint:{"fill-color":"#f0b44d","fill-opacity":.2}});map.addLayer({id:"rl",type:"line",source:"r",paint:{"line-color":"#ffd38a","line-width":2,"line-dasharray":[2,2]}})}if(!map.getSource("p")){map.addSource("p",{type:"geojson",data:projects});map.addLayer({id:"pc",type:"circle",source:"p",paint:{"circle-radius":7,"circle-color":"#a7d82e","circle-stroke-color":"#fff","circle-stroke-width":2}})}ddbNames.forEach(addDdbLayer)}
map.on("load",()=>{core();discoverDroneDB()});map.on("mousemove",e=>document.getElementById("coords").textContent=e.lngLat.lat.toFixed(5)+", "+e.lngLat.lng.toFixed(5));
function vis(ids,on){ids.forEach(id=>map.getLayer(id)&&map.setLayoutProperty(id,"visibility",on?"visible":"none"))}
document.querySelector("#toggle-buildings").onchange=e=>vis(["bf","bl"],e.target.checked);document.querySelector("#toggle-risk").onchange=e=>vis(["rf","rl"],e.target.checked);document.querySelector("#toggle-points").onchange=e=>vis(["pc"],e.target.checked);
document.querySelector("#btn-home").onclick=()=>map.flyTo({center,zoom:13.2,pitch:25,bearing:-8});document.querySelector("#btn-3d").onclick=()=>map.easeTo({pitch:60,bearing:20,duration:800});document.querySelector("#btn-clear").onclick=()=>{ddbNames.forEach(n=>vis(["ddb-"+safe(n)],false));document.querySelectorAll(".ddb-check").forEach(x=>x.checked=false)};
document.querySelector("#btn-style").onclick=()=>{satellite=!satellite;map.setStyle(satellite?SAT:OSM);map.once("style.load",core)};
const modal=document.querySelector("#ddb-modal");document.querySelector("#btn-ddb").onclick=()=>modal.classList.remove("hidden");document.querySelector("#btn-close").onclick=()=>modal.classList.add("hidden");modal.onclick=e=>{if(e.target===modal)modal.classList.add("hidden")};
function safe(s){return s.replace(/[^a-z0-9]/gi,"-").toLowerCase()}
function addDdbLayer(name){const id="ddb-"+safe(name);if(map.getSource(id))return;const u=DDB.base+"/wms?service=WMS&version=1.1.1&request=GetMap&layers="+encodeURIComponent(name)+"&styles=&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true";map.addSource(id,{type:"raster",tiles:[u],tileSize:256});map.addLayer({id,type:"raster",source:id,layout:{visibility:"none"},paint:{"raster-opacity":.92}})}
async function discoverDroneDB(){const box=document.querySelector("#ddb-layers"),dot=document.querySelector("#ddb-status");try{const r=await fetch(DDB.base+"/wms?service=WMS&request=GetCapabilities&version=1.3.0");if(!r.ok)throw Error(r.status);const xml=new DOMParser().parseFromString(await r.text(),"text/xml");const names=[...xml.querySelectorAll("Layer > Name")].map(n=>n.textContent.trim()).filter(Boolean);ddbNames=[...new Set(names)];if(!ddbNames.length)throw Error("Sin capas");box.innerHTML="";ddbNames.forEach(name=>{addDdbLayer(name);const row=document.createElement("label");row.className="layer-row";row.innerHTML='<input class="ddb-check" type="checkbox"><span>'+name+'</span>';row.querySelector("input").onchange=e=>vis(["ddb-"+safe(name)],e.target.checked);box.appendChild(row)});dot.className="dot ok"}catch(e){dot.className="dot fail";box.innerHTML='<div class="loading">No pude enumerar las capas por CORS o permisos. Puedes abrir el catálogo DroneDB aquí mismo; el visor queda preparado para WMS/WMTS.</div>'}}
map.on("click","pc",e=>{const p=e.features[0].properties;new maplibregl.Popup().setLngLat(e.lngLat).setHTML("<strong>"+p.name+"</strong><br><span>"+p.type+"</span>").addTo(map)});

/* === Island View GIS drawing / measurement / export tools === */
const sketch={mode:null,coords:[],features:[],markers:[],active:null};
function ensureSketch(){
 if(!map.getSource("iv-sketch")) map.addSource("iv-sketch",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
 if(!map.getLayer("iv-sketch-fill")) map.addLayer({id:"iv-sketch-fill",type:"fill",source:"iv-sketch",filter:["==",["geometry-type"],"Polygon"],paint:{"fill-color":"#a7d82e","fill-opacity":.22}});
 if(!map.getLayer("iv-sketch-line")) map.addLayer({id:"iv-sketch-line",type:"line",source:"iv-sketch",filter:["match",["geometry-type"],["LineString","Polygon"],true,false],paint:{"line-color":"#d8ff77","line-width":3}});
 if(!map.getLayer("iv-sketch-point")) map.addLayer({id:"iv-sketch-point",type:"circle",source:"iv-sketch",filter:["==",["geometry-type"],"Point"],paint:{"circle-radius":["case",["==",["get","active"],true],8,6],"circle-color":["case",["==",["get","active"],true],"#ffffff","#a7d82e"],"circle-stroke-color":["case",["==",["get","active"],true],"#a7d82e","#ffffff"],"circle-stroke-width":3}});
 if(!map.getLayer("iv-sketch-vertex-label")) map.addLayer({id:"iv-sketch-vertex-label",type:"symbol",source:"iv-sketch",filter:["==",["get","kind"],"vertex"],layout:{"text-field":["to-string",["get","vertex"]],"text-size":11,"text-offset":[0,-1.35],"text-allow-overlap":true},paint:{"text-color":"#ffffff","text-halo-color":"#06151b","text-halo-width":2}});
}
function redraw(){
 ensureSketch();
 const live=liveFeature();
 const vertices=sketch.coords.map((coord,i)=>turf.point(coord,{kind:"vertex",vertex:i+1,active:i===sketch.coords.length-1}));
 map.getSource("iv-sketch").setData({type:"FeatureCollection",features:[...sketch.features,...(live?[live]:[]),...vertices]});
 renderVertexLabels();
 if(window.ivRenderResults) window.ivRenderResults(sketch.features,sketch.active);
}
function renderVertexLabels(){
 const count=sketch.coords.length;
 if(!count)return;
 const last=sketch.coords[count-1];
 const el=document.querySelector("#measure-detail");
 if(el&&sketch.mode) el.textContent="Vértices: "+count+" · Último: "+last[1].toFixed(7)+", "+last[0].toFixed(7)+" · Toca para continuar";
}
function liveFeature(){
 if(!sketch.mode||!sketch.coords.length)return null;
 if(sketch.mode==="line")return turf.lineString(sketch.coords,{kind:"distance"});
 if(sketch.mode==="polygon"&&sketch.coords.length>2)return turf.polygon([[...sketch.coords,sketch.coords[0]]],{kind:"area"});
 if((sketch.mode==="point"||sketch.mode==="note")&&sketch.coords.length)return turf.point(sketch.coords[0]);
 return sketch.coords.length>1?turf.lineString(sketch.coords):turf.point(sketch.coords[0]);
}
function activateTool(mode){
 sketch.mode=mode;sketch.coords=[];document.querySelectorAll(".ortho-tools [data-tool]").forEach(b=>b.classList.toggle("active",b.dataset.tool===mode));map.getCanvas().classList.toggle("tool-crosshair",!!mode);
 document.querySelector("#measure-card").classList.remove("hidden");document.querySelector("#measure-value").textContent=mode==="polygon"?"Área":"—";document.querySelector("#measure-detail").textContent=mode==="note"?"Toca el mapa para ubicar la anotación":mode==="point"?"Toca el mapa para capturar coordenadas":"Toca para agregar vértices · Finalizar al terminar";redraw();
}
document.querySelectorAll(".ortho-tools [data-tool]").forEach(b=>b.onclick=()=>activateTool(b.dataset.tool));
map.on("click",e=>{
 if(!sketch.mode)return;
 const xy=[e.lngLat.lng,e.lngLat.lat];
 if(sketch.mode==="point"){const f=turf.point(xy,{name:"Geoposición",lat:e.lngLat.lat,lng:e.lngLat.lng});sketch.features.push(f);sketch.active=f;addCoordMarker(xy);updateMeasure(f);finishTool();return}
 if(sketch.mode==="note"){const note=prompt("Texto de la anotación:","Observación");if(note!==null){const f=turf.point(xy,{name:"Anotación",note,lat:e.lngLat.lat,lng:e.lngLat.lng});sketch.features.push(f);sketch.active=f;addNoteMarker(xy,note);updateMeasure(f);finishTool()}return}
 sketch.coords.push(xy);redraw();updateMeasure(liveFeature());renderVertexLabels();
});
function finishTool(){
 let f=liveFeature();
 if(sketch.mode==="line"&&sketch.coords.length>=2){f=turf.lineString(sketch.coords,{name:"Medición lineal"});sketch.features.push(f);sketch.active=f}
 if(sketch.mode==="polygon"&&sketch.coords.length>=3){f=turf.polygon([[...sketch.coords,sketch.coords[0]]],{name:"Área seleccionada"});sketch.features.push(f);sketch.active=f}
 if(f)updateMeasure(f);sketch.coords=[];sketch.mode=null;document.querySelectorAll(".ortho-tools button").forEach(b=>b.classList.remove("active"));map.getCanvas().classList.remove("tool-crosshair");redraw();
}
document.querySelector("#btn-finish").onclick=finishTool;
document.querySelector("#btn-undo").onclick=()=>{if(sketch.coords.length){sketch.coords.pop();redraw();updateMeasure(liveFeature())}};
document.querySelector("#btn-delete").onclick=()=>{sketch.coords=[];sketch.features=[];sketch.active=null;sketch.markers.forEach(m=>m.remove());sketch.markers=[];redraw();document.querySelector("#measure-card").classList.add("hidden")};
function updateMeasure(f){
 if(!f)return;const g=f.geometry.type;let value="",detail="";
 if(g==="LineString"){const km=turf.length(f,{units:"kilometers"});value=km<1?(km*1000).toFixed(2)+" m":km.toFixed(3)+" km";detail="Longitud geodésica"}
 else if(g==="Polygon"){const a=turf.area(f);value=a<10000?a.toFixed(2)+" m²":(a/10000).toFixed(4)+" ha";detail="Área · "+(a/1e6).toFixed(5)+" km²"}
 else {const [lng,lat]=f.geometry.coordinates;value=lat.toFixed(7)+", "+lng.toFixed(7);detail=f.properties.note||"WGS84 · EPSG:4326"}
 document.querySelector("#measure-value").textContent=value;document.querySelector("#measure-detail").textContent=detail;document.querySelector("#measure-card").classList.remove("hidden");
}
function addCoordMarker(xy){const el=document.createElement("div");el.className="measure-label";el.textContent=xy[1].toFixed(6)+", "+xy[0].toFixed(6);sketch.markers.push(new maplibregl.Marker({element:el,anchor:"bottom"}).setLngLat(xy).addTo(map))}
function addNoteMarker(xy,note){const el=document.createElement("div");el.className="annotation-label";el.textContent=note;sketch.markers.push(new maplibregl.Marker({element:el,anchor:"bottom"}).setLngLat(xy).addTo(map))}
function selectionFC(){return {type:"FeatureCollection",features:sketch.active?[sketch.active]:sketch.features}}
function dl(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function kml(fc){const placemarks=fc.features.map((f,i)=>{const p=f.properties||{},n=(p.name||("Selección "+(i+1))).replace(/[<>&]/g,"");let geom="";if(f.geometry.type==="Point"){const c=f.geometry.coordinates;geom="<Point><coordinates>"+c[0]+","+c[1]+",0</coordinates></Point>"}if(f.geometry.type==="LineString")geom="<LineString><tessellate>1</tessellate><coordinates>"+f.geometry.coordinates.map(c=>c[0]+","+c[1]+",0").join(" ")+"</coordinates></LineString>";if(f.geometry.type==="Polygon")geom="<Polygon><outerBoundaryIs><LinearRing><coordinates>"+f.geometry.coordinates[0].map(c=>c[0]+","+c[1]+",0").join(" ")+"</coordinates></LinearRing></outerBoundaryIs></Polygon>";return "<Placemark><name>"+n+"</name><description>"+(p.note||"Island View Geoportal")+"</description>"+geom+"</Placemark>"}).join("");return '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Island View - Selección</name>'+placemarks+"</Document></kml>"}
document.querySelector("#btn-export").onclick=()=>document.querySelector("#export-menu").classList.toggle("hidden");
document.querySelectorAll("[data-export]").forEach(b=>b.onclick=async()=>{const fc=selectionFC();if(!fc.features.length)return alert("Primero crea o selecciona una geometría.");const t=b.dataset.export;
 if(t==="geojson")dl(new Blob([JSON.stringify(fc,null,2)],{type:"application/geo+json"}),"island-view-seleccion.geojson");
 if(t==="kml")dl(new Blob([kml(fc)],{type:"application/vnd.google-earth.kml+xml"}),"island-view-seleccion.kml");
 if(t==="kmz"){const z=new JSZip();z.file("doc.kml",kml(fc));dl(await z.generateAsync({type:"blob"}),"island-view-seleccion.kmz")}
 if(t==="shp"){try{const zip=shpwrite.zip(fc);dl(new Blob([zip],{type:"application/zip"}),"island-view-seleccion-shapefile.zip")}catch(e){alert("El exportador Shapefile no pudo procesar esta geometría. Prueba GeoJSON/KML o separa geometrías por tipo.")}}
 document.querySelector("#export-menu").classList.add("hidden");
});
map.on("style.load",()=>{setTimeout(()=>{ensureSketch();redraw()},0)});

/* === Extended DroneDB / Potree workflow === */
let identifyMode=false;
document.querySelector("#btn-identify").onclick=()=>{identifyMode=!identifyMode;document.querySelector("#btn-identify").classList.toggle("active",identifyMode);map.getCanvas().classList.toggle("tool-crosshair",identifyMode)};
document.querySelector("#btn-opacity").onclick=()=>document.querySelector("#opacity-card").classList.toggle("hidden");
document.querySelector("#opacity-range").oninput=e=>{const v=Number(e.target.value)/100;document.querySelector("#opacity-value").textContent=e.target.value+"%";ddbNames.forEach(n=>{const id="ddb-"+safe(n);if(map.getLayer(id))map.setPaintProperty(id,"raster-opacity",v)})};
map.on("click",async e=>{
 if(!identifyMode)return;
 const visible=ddbNames.filter(n=>{const id="ddb-"+safe(n);return map.getLayer(id)&&map.getLayoutProperty(id,"visibility")!=="none"});
 const html='<div class="feature-popup"><b>Ubicación</b><br>'+e.lngLat.lat.toFixed(7)+', '+e.lngLat.lng.toFixed(7)+'<br><b>Capas DroneDB visibles</b><br>'+(visible.length?visible.join("<br>"):"Ninguna")+'</div>';
 new maplibregl.Popup().setLngLat(e.lngLat).setHTML(html).addTo(map);
});
const potreeModal=document.querySelector("#potree-modal"),potreeFrame=document.querySelector("#potree-frame");
document.querySelector("#btn-potree").onclick=()=>{potreeFrame.src=DDB.hub+"?embed=1";potreeModal.classList.remove("hidden")};
document.querySelector("#btn-potree-close").onclick=()=>{potreeModal.classList.add("hidden");potreeFrame.src=""};
potreeModal.onclick=e=>{if(e.target===potreeModal){potreeModal.classList.add("hidden");potreeFrame.src=""}};
function fitFeature(f){try{const b=turf.bbox(f);map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:90,duration:700})}catch(e){}}
map.on("dblclick",e=>{if(sketch.mode==="line"||sketch.mode==="polygon"){e.preventDefault();finishTool();if(sketch.active)fitFeature(sketch.active)}});

window.IVGeo={map,sketch,redraw,activateTool,finishTool,updateMeasure,fitFeature,dl,kml};
