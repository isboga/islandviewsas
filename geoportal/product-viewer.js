(()=>{"use strict";
const q=new URLSearchParams(location.search),projectKey=q.get("project")||"sai-dronedb",path=q.get("path")||"",hash=q.get("hash")||"",rawType=Number(q.get("type")||0),$=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TYPES={DIRECTORY:1,GENERIC:2,GEOIMAGE:3,GEORASTER:4,POINTCLOUD:5,IMAGE:6,DRONEDB:7,MARKDOWN:8,VIDEO:9,GEOVIDEO:10,MODEL:11,PANORAMA:12,GEOPANORAMA:13,VECTOR:14,GAUSSIAN_SPLAT:15,TILES3D:16},NAMES={2:"Archivo",3:"Fotografía georreferenciada",4:"GeoTIFF / GeoRaster",5:"Nube de puntos",6:"Fotografía",8:"Documento",9:"Video",10:"Video georreferenciado",11:"Modelo 3D",12:"Panorama",13:"Panorama georreferenciado",14:"Vector GIS",15:"Gaussian Splat",16:"3D Tiles"};
let project=null,base="",entry={path,hash,type:rawType},siblings=[],map=null,drawMode=null,lastMeasureMode=null,coords=[],measureLabelMarker=null,drawSourceReady=false,sb=null,portalProjectId=null,potreeReadyTimer=null,areaUnit=localStorage.getItem("iv-area-unit")||"ha",backUrl="./dataset-explorer.html?project="+encodeURIComponent(projectKey);
function ext(p){return(String(p||"").split(".").pop()||"").toLowerCase()}
function inferType(e){const x=ext(e.path);if(["las","laz","copc"].includes(x)||/\.copc\.laz$/i.test(String(e.path||"")))return TYPES.POINTCLOUD;if(["tif","tiff"].includes(x))return TYPES.GEORASTER;if(e.type)return e.type;if(["obj","glb","gltf","fbx","ply"].includes(x))return TYPES.MODEL;if(["geojson","json","kml","kmz","gpkg","shp"].includes(x))return TYPES.VECTOR;if(["jpg","jpeg","png","webp"].includes(x))return TYPES.IMAGE;if(["mp4","mov","webm"].includes(x))return TYPES.VIDEO;return TYPES.GENERIC}
function icon(e){const t=inferType(e);return t===4?"▧":t===5?"◌":[11,15,16].includes(t)?"◇":t===14?"⌑":[3,6,12,13].includes(t)?"◉":[9,10].includes(t)?"▶":"▤"}
function name(e){return e.name||String(e.path||"").split("/").pop()||"Producto"}
function parentPath(p){const a=String(p||"").split("/");a.pop();return a.join("/")}
function inlineUrl(p){return base+"/download/"+String(p||"").split("/").map(encodeURIComponent).join("/")+"?inline=1"}
function thumbUrl(p){return base+"/thumb?path="+encodeURIComponent(p)+"&size=640"}
function productUrl(e){return"./product-viewer.html?project="+encodeURIComponent(projectKey)+"&path="+encodeURIComponent(e.path||"")+"&hash="+encodeURIComponent(e.hash||"")+"&type="+encodeURIComponent(inferType(e))}
function status(t){$("#pv-status").textContent=t}
function fail(e){console.error(e);$("#pv-loading").classList.add("hidden");$("#pv-error").textContent=e.message||String(e);$("#pv-error").classList.remove("hidden");status("Error al abrir producto")}
async function list(p=""){const f=new FormData();if(p)f.append("path",p);const r=await fetch(base+"/list",{method:"POST",body:f,credentials:"omit"});if(!r.ok)throw Error("DroneDB respondió "+r.status);return r.json()}
async function getJSON(p){const r=await fetch(base+p,{credentials:"omit"});if(!r.ok)throw Error("DroneDB respondió "+r.status);return r.json()}
async function loadProject(){const r=await fetch("./projects.json",{cache:"no-cache"}),j=await r.json();project=(j.projects||[]).find(x=>x.id===projectKey);if(!project?.dronedb)throw Error("Proyecto DroneDB no disponible");const d=project.dronedb;base=String(d.registry||"https://hub.dronedb.app").replace(/\/$/,"")+"/orgs/"+encodeURIComponent(d.org)+"/ds/"+encodeURIComponent(d.dataset);backUrl="./dataset-explorer.html?project="+encodeURIComponent(projectKey);$("#pv-back").href=backUrl;$("#pv-breadcrumb").textContent=(d.dataset||projectKey).toUpperCase()+" / PRODUCTO"}
async function resolveEntry(){const rows=await list(parentPath(path));siblings=(rows||[]).filter(e=>e.type!==TYPES.DIRECTORY&&e.type!==TYPES.DRONEDB);const exact=siblings.find(e=>e.path===path);if(exact)entry={...exact};else entry={path,hash,type:rawType};entry.type=inferType(entry);entry.hash=entry.hash||hash;renderFiles();renderHeader()}
function renderFiles(){const term=$("#pv-search").value.trim().toLowerCase(),rows=siblings.filter(e=>!term||name(e).toLowerCase().includes(term));$("#pv-file-list").innerHTML=rows.map(e=>'<div class="pv-file '+(e.path===entry.path?"active":"")+'" data-path="'+esc(e.path)+'"><i>'+icon(e)+'</i><span><strong>'+esc(name(e))+'</strong><small>'+esc(NAMES[inferType(e)]||ext(e.path)||"producto")+'</small></span></div>').join("")||'<div class="pv-loading-row">No hay otros productos en esta carpeta.</div>';$("#pv-file-list").querySelectorAll("[data-path]").forEach(x=>x.onclick=()=>{const e=siblings.find(y=>y.path===x.dataset.path);if(e)location.href=productUrl(e)})}
function renderHeader(){document.querySelector(".pv-shell").classList.toggle("kind-pointcloud",entry.type===TYPES.POINTCLOUD);document.title="Island View · "+name(entry);$("#pv-name").textContent=name(entry);$("#pv-kind").textContent=(NAMES[entry.type]||"Producto")+" · "+(ext(entry.path).toUpperCase()||"DroneDB");const dl=inlineUrl(entry.path);$("#pv-download").href=dl;$("#pv-download").download="";$("#pv-open-source").href=dl;$("#pv-preview").innerHTML=[3,4,6,12,13].includes(entry.type)?'<img src="'+esc(thumbUrl(entry.path))+'" alt="">':'<div style="font-size:48px;color:#6d8791">'+icon(entry)+'</div>';const rows=[["Nombre",name(entry)],["Tipo",NAMES[entry.type]||entry.type],["Formato",ext(entry.path).toUpperCase()||"—"],["Ruta",entry.path],["Hash",entry.hash||"—"],...(entry.type===TYPES.POINTCLOUD?[["Estado COPC",entry.buildStatus||"verificación al abrir"]]:[]),["Motor",engineName(entry)]];$("#pv-props").innerHTML=rows.map(([a,b])=>'<div class="pv-prop"><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>').join("")}
function engineName(e){if(e.type===5)return"Potree · COPC";if([11,16].includes(e.type))return"Giro3D / 3D Tiles";if([3,4,14].includes(e.type))return"MapLibre GIS";if([6,12,13].includes(e.type))return"Image Viewer";if([9,10].includes(e.type))return"Video Viewer";return"DroneDB file preview"}
function showEngine(id){["#pv-map","#pv-frame","#pv-media"].forEach(s=>$(s).classList.add("hidden"));$(id).classList.remove("hidden");$("#pv-loading").classList.add("hidden")}
function productId(e){return"ddb-"+String(e.hash||e.path).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80)}
function b64Path(v){return btoa(unescape(encodeURIComponent(String(v||""))))}
function nativePotreeUrl(){const d=project?.dronedb;if(!d)return"";return String(d.registry||"https://hub.dronedb.app").replace(/\/$/,"")+"/r/"+d.org+"/"+d.dataset+"/view/"+b64Path(entry.path)+"/pointcloud?embed=1"}
function openFrame(url,label){$("#pv-frame").src=url;$("#pv-engine-label").textContent=label;$("#pv-frame").onload=()=>{showEngine("#pv-frame");status(label+" listo")}}
function initMap(){if(map)return;map=new maplibregl.Map({container:"pv-map",style:{version:8,glyphs:"https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",sources:{sat:{type:"raster",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],tileSize:256,attribution:"Esri World Imagery"}},layers:[{id:"sat",type:"raster",source:"sat"}]},center:project?.coordinates||[-81.7006,12.5847],zoom:13,maxZoom:22});map.addControl(new maplibregl.ScaleControl({unit:"metric"}),"bottom-left");map.on("mousemove",e=>{ $("#pv-coords").textContent=e.lngLat.lat.toFixed(6)+", "+e.lngLat.lng.toFixed(6); if(["distance","area"].includes(drawMode)&&coords.length)drawFC([e.lngLat.lng,e.lngLat.lat]); });map.on("load",()=>{ensureDraw();loadMapProduct().catch(fail)});map.on("click",handleMapClick);map.on("dblclick",e=>{
 if(!["distance","area","stats"].includes(drawMode))return;
 e.preventDefault();
 // On touch/iPad, ignore synthetic/accidental dblclick unless it lands on the last accepted vertex.
 const last=coords[coords.length-1];if(!last)return;
 const lp=map.project(last),dp=Math.hypot(lp.x-e.point.x,lp.y-e.point.y);
 if(dp<=18)finishDraw();else status("Sigue añadiendo vértices · doble clic sobre el último punto para finalizar");
});$("#pv-map-tools").classList.remove("hidden");$("#pv-engine-label").textContent="GIS"}
function ensureDraw(){if(drawSourceReady)return;
map.addSource("pv-annotations",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
map.addLayer({id:"pv-ann-fill",type:"fill",source:"pv-annotations",filter:["==",["geometry-type"],"Polygon"],paint:{"fill-color":"#ffb020","fill-opacity":.22}});
map.addLayer({id:"pv-ann-line",type:"line",source:"pv-annotations",filter:["==",["geometry-type"],"LineString"],paint:{"line-color":"#ffb020","line-width":4,"line-opacity":.95}});
map.addLayer({id:"pv-ann-points",type:"circle",source:"pv-annotations",filter:["==",["geometry-type"],"Point"],paint:{"circle-radius":7,"circle-color":"#ffb020","circle-stroke-color":"#fff","circle-stroke-width":2.5}});
map.addSource("pv-draw",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
map.addSource("pv-vertices",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
map.addLayer({id:"pv-draw-fill",type:"fill",source:"pv-draw",filter:["==",["geometry-type"],"Polygon"],paint:{"fill-color":"#f6b71e","fill-opacity":.12}});
map.addLayer({id:"pv-draw-outline",type:"line",source:"pv-draw",filter:["==",["geometry-type"],"Polygon"],paint:{"line-color":"#ffc21c","line-width":4,"line-opacity":1}});
map.addLayer({id:"pv-draw-line",type:"line",source:"pv-draw",filter:["==",["geometry-type"],"LineString"],paint:{"line-color":"#ffc21c","line-width":3.5,"line-opacity":1}});
map.addLayer({id:"pv-draw-points",type:"circle",source:"pv-vertices",paint:{"circle-radius":7,"circle-color":"#ffc21c","circle-stroke-color":"#ffffff","circle-stroke-width":2.5}});
map.addLayer({id:"pv-vertex-numbers",type:"symbol",source:"pv-vertices",layout:{"text-field":["to-string",["get","n"]],"text-size":10,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],"text-allow-overlap":true,"text-ignore-placement":true},paint:{"text-color":"#10252c","text-halo-color":"#b8ee48","text-halo-width":.5}});map.addLayer({id:"pv-draw-labels",type:"symbol",source:"pv-draw",filter:["has","label"],layout:{"text-field":["get","label"],"text-size":13,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],"text-offset":[0,-1.15],"text-anchor":"bottom","text-allow-overlap":true},paint:{"text-color":"#ffffff","text-halo-color":"#10272e","text-halo-width":2.5,"text-halo-blur":.5}});
drawSourceReady=true;loadSavedAnnotations().catch(console.warn)}
function bringOverlaysToFront(){if(!map||!drawSourceReady)return;["pv-ann-fill","pv-ann-line","pv-ann-points","pv-draw-fill","pv-draw-outline","pv-draw-line","pv-draw-points","pv-vertex-numbers","pv-draw-labels"].forEach(id=>{if(map.getLayer(id))map.moveLayer(id)})}
async function loadSavedAnnotations(){try{const cfg=window.IV_AUTH_CONFIG;if(!cfg?.enabled||!window.supabase)return;sb=sb||window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);const pr=await sb.from("portal_projects").select("id").eq("slug",projectKey).maybeSingle();if(pr.error||!pr.data?.id)return;portalProjectId=pr.data.id;const q=await sb.from("project_annotations").select("id,annotation_type,title,geometry,measurement,style,visibility").eq("project_id",portalProjectId).order("created_at",{ascending:true});if(q.error)throw q.error;const features=(q.data||[]).filter(a=>a.geometry?.type).map(a=>({type:"Feature",id:a.id,geometry:a.geometry,properties:{id:a.id,title:a.title||"",annotation_type:a.annotation_type,visibility:a.visibility,...(a.measurement||{})}}));map.getSource("pv-annotations")?.setData({type:"FeatureCollection",features});bringOverlaysToFront()}catch(e){console.warn("Anotaciones",e)}}
function fmtDistance(km){return km<1?(km*1000).toFixed(km<.01?2:1)+" m":km.toFixed(3)+" km"}
function fmtArea(m2){if(areaUnit==="km2")return (m2/1e6).toFixed(6)+" km²";if(areaUnit==="ha")return (m2/10000).toFixed(4)+" ha";return m2.toFixed(2)+" m²"}
function syncAreaUnitUI(){document.querySelectorAll("[data-area-unit]").forEach(b=>b.classList.toggle("active",b.dataset.areaUnit===areaUnit));$("#pv-area-units").classList.toggle("hidden",(drawMode||lastMeasureMode)!=="area")}
function sameCoord(a,b){return !!a&&!!b&&Math.abs(a[0]-b[0])<1e-9&&Math.abs(a[1]-b[1])<1e-9}
function cleanDoubleClickPoint(){while(coords.length>1&&sameCoord(coords[coords.length-1],coords[coords.length-2]))coords.pop()}
function clearMeasureMarkers(){
 if(measureLabelMarker){try{measureLabelMarker.remove()}catch{}measureLabelMarker=null}
 if(map?.getSource("pv-vertices"))map.getSource("pv-vertices").setData({type:"FeatureCollection",features:[]});
}
function makeMeasureLabel(coord,kind,text){
 if(!map||!coord)return null;
 const el=document.createElement("div");el.className="iv-map-measure iv-measure-label "+kind;el.textContent=text;
 return new maplibregl.Marker({element:el,anchor:"center"}).setLngLat(coord).addTo(map);
}
function setMeasureLabel(coord,kind,text){
 if(measureLabelMarker){try{measureLabelMarker.remove()}catch{}measureLabelMarker=null}
 measureLabelMarker=makeMeasureLabel(coord,kind,text);
}
function areaLabelPoint(poly){
 let p=turf.centerOfMass(poly);
 try{if(!turf.booleanPointInPolygon(p,poly))p=turf.pointOnFeature(poly)}catch{p=turf.pointOnFeature(poly)}
 return p;
}
function updateVertices(){
 const src=map?.getSource("pv-vertices");if(!src)return;
 src.setData({type:"FeatureCollection",features:coords.map((c,i)=>turf.point(c,{n:i+1}))});
 if(map.getLayer("pv-draw-points"))map.moveLayer("pv-draw-points");
 if(map.getLayer("pv-vertex-numbers"))map.moveLayer("pv-vertex-numbers");
}
function updateMeasureLabel(active,mode){
 if(mode==="distance"&&active.length>1){
  const line=turf.lineString(active),total=turf.length(line,{units:"kilometers"}),mid=turf.along(line,total/2,{units:"kilometers"});
  setMeasureLabel(mid.geometry.coordinates,"iv-distance-label",fmtDistance(total));return;
 }
 if(mode==="area"&&active.length>2){
  const poly=turf.polygon([[...active,active[0]]]),a=turf.area(poly),center=areaLabelPoint(poly);
  setMeasureLabel(center.geometry.coordinates,"iv-area-label","Área · "+fmtArea(a));return;
 }
 if(measureLabelMarker){try{measureLabelMarker.remove()}catch{}measureLabelMarker=null}
}
function drawFC(preview=null){
 const mode=drawMode||lastMeasureMode,active=preview?[...coords,preview]:coords.slice(),fs=[];
 coords.forEach((c,i)=>fs.push(turf.point(c,{vertex:true,vertexNo:i+1})));
 if(active.length>1){
  const line=turf.lineString(active,{measurement:true});fs.push(line);
  if(mode==="distance"){
   const total=turf.length(line,{units:"kilometers"}),mid=turf.along(line,total/2,{units:"kilometers"});
   mid.properties={label:fmtDistance(total),labelType:"total"};fs.push(mid);measure("Distancia total",fmtDistance(total));
  }
 }
 if(["area","stats"].includes(mode)&&active.length>2){
  const ring=[...active,active[0]],poly=turf.polygon([ring],{measurement:true});fs.push(poly);
  if(mode==="area"){
   const a=turf.area(poly),center=areaLabelPoint(poly);measure("Área",fmtArea(a));syncAreaUnitUI();
  }
 }
 map.getSource("pv-draw")?.setData({type:"FeatureCollection",features:fs});
 updateVertices();updateMeasureLabel(active,mode);
}
async function handleMapClick(e){
 if(!drawMode)return;
 if(drawMode==="inspect"){if(entry.type===4)try{const v=await getJSON("/raster-point-value?path="+encodeURIComponent(entry.path)+"&x="+e.lngLat.lng+"&y="+e.lngLat.lat);measure("Valor raster",JSON.stringify(v));}catch(err){measure("Coordenada",e.lngLat.lng.toFixed(7)+", "+e.lngLat.lat.toFixed(7))}else measure("Coordenada",e.lngLat.lng.toFixed(7)+", "+e.lngLat.lat.toFixed(7));return}
 const detail=Number(e.originalEvent?.detail||1);
 if(detail>1){drawFC();return}
 const c=[e.lngLat.lng,e.lngLat.lat];if(!sameCoord(coords[coords.length-1],c))coords.push(c);drawFC();
 status((drawMode==="area"?"Vértices: "+coords.length+" · ":"")+"Sigue añadiendo puntos · doble clic sobre el último punto para finalizar");
}
function measure(title,value){if((drawMode||lastMeasureMode)==="area"){$("#pv-measure").classList.add("hidden");return}$("#pv-measure").innerHTML="<strong>"+esc(title)+"</strong><div>"+esc(value)+"</div>";$("#pv-measure").classList.remove("hidden")}
async function finishDraw(){
 cleanDoubleClickPoint();
 const mode=drawMode;
 if(mode==="distance"&&coords.length>1){const l=turf.length(turf.lineString(coords),{units:"kilometers"});measure("Distancia total",fmtDistance(l))}
 if(mode==="area"&&coords.length>2){const a=turf.area(turf.polygon([[...coords,coords[0]]]));measure("Área total",fmtArea(a))}
 if(mode==="stats"&&coords.length>1&&entry.type===4){const bb=turf.bbox(turf.lineString(coords));try{const st=await getJSON("/raster-area-stats?path="+encodeURIComponent(entry.path)+"&x0="+bb[0]+"&y0="+bb[1]+"&x1="+bb[2]+"&y1="+bb[3]);measure("Estadísticas","Min "+st.min+" · Max "+st.max+" · Media "+st.mean+" · Mediana "+st.median)}catch(e){measure("Estadísticas",e.message)}}
 lastMeasureMode=mode;drawFC();drawMode=null;syncAreaUnitUI();map.getCanvas().style.cursor="";document.querySelectorAll("[data-tool]").forEach(b=>b.classList.remove("active"));status(mode==="area"?"Polígono cerrado · "+coords.length+" vértices · medición finalizada":"Medición finalizada");
}
async function loadMapProduct(){if(entry.type===4){map.addSource("product",{type:"raster",tiles:[base+"/tiles/{z}/{x}/{y}.png?path="+encodeURIComponent(entry.path)],tileSize:256});map.addLayer({id:"product",type:"raster",source:"product",paint:{"raster-opacity":.98}});const g=entry.polygon_geom;if(g)try{const bb=turf.bbox({type:"Feature",geometry:g,properties:{}});map.fitBounds([[bb[0],bb[1]],[bb[2],bb[3]]],{padding:55,maxZoom:20})}catch{}status("GeoRaster sobre imagen satelital")}else if(entry.type===14&&entry.hash){const meta=await getJSON("/mvt/"+encodeURIComponent(entry.hash)+"/metadata.json"),layers=meta.vector_layers||[];map.addSource("product",{type:"vector",tiles:[base+"/mvt/"+encodeURIComponent(entry.hash)+"/{z}/{x}/{y}.pbf"],maxzoom:meta.maxzoom||18});for(const [i,l] of layers.entries()){const sl=l.id;map.addLayer({id:"vf"+i,type:"fill",source:"product","source-layer":sl,filter:["==",["geometry-type"],"Polygon"],paint:{"fill-color":"#19b7d1","fill-opacity":.22,"fill-outline-color":"#b5f3f8"}});map.addLayer({id:"vl"+i,type:"line",source:"product","source-layer":sl,filter:["==",["geometry-type"],"LineString"],paint:{"line-color":"#7de3ec","line-width":2.5}});map.addLayer({id:"vp"+i,type:"circle",source:"product","source-layer":sl,filter:["==",["geometry-type"],"Point"],paint:{"circle-radius":5,"circle-color":"#a8d64b","circle-stroke-color":"#fff","circle-stroke-width":1.5}})}for(let i=0;i<layers.length;i++)for(const id of["vf"+i,"vl"+i,"vp"+i])map.on("click",id,e=>{const p=e.features?.[0]?.properties||{},rows=Object.entries(p).slice(0,14).map(([k,v])=>"<tr><th style=\"text-align:left;padding-right:8px\">"+esc(k)+"</th><td>"+esc(v)+"</td></tr>").join("");new maplibregl.Popup({maxWidth:"360px"}).setLngLat(e.lngLat).setHTML("<strong>"+esc(name(entry))+"</strong><table style=\"font-size:10px;margin-top:6px\">"+rows+"</table>").addTo(map)});if(meta.bounds?.length===4)map.fitBounds([[meta.bounds[0],meta.bounds[1]],[meta.bounds[2],meta.bounds[3]]],{padding:50,maxZoom:18});status("Vector MVT sobre imagen satelital")}else if(entry.type===3){const g=entry.point_geom;if(g?.coordinates){new maplibregl.Marker().setLngLat(g.coordinates.slice(0,2)).setPopup(new maplibregl.Popup().setHTML('<img src="'+esc(thumbUrl(entry.path))+'" style="width:220px;max-width:100%">')).addTo(map);map.flyTo({center:g.coordinates.slice(0,2),zoom:19})}status("Fotografía georreferenciada")}bringOverlaysToFront();showEngine("#pv-map")}
function openMedia(){const u=inlineUrl(entry.path),x=ext(entry.path),box=$("#pv-media");if([6,12,13].includes(entry.type)||["jpg","jpeg","png","webp","gif"].includes(x))box.innerHTML='<img src="'+esc(u)+'" alt="">';else if([9,10].includes(entry.type)||["mp4","mov","webm"].includes(x))box.innerHTML='<video src="'+esc(u)+'" controls playsinline></video>';else if(x==="pdf")box.innerHTML='<iframe src="'+esc(u)+'"></iframe>';else box.innerHTML='<div style="color:#b8c9ce;text-align:center"><div style="font-size:58px">'+icon(entry)+'</div><h3>'+esc(name(entry))+'</h3><p>Este archivo puede descargarse o abrirse desde sus propiedades.</p><a href="'+esc(u)+'" style="color:#72dce7">Abrir archivo original</a></div>';$("#pv-engine-label").textContent="MEDIA";showEngine("#pv-media");status("Producto abierto")}
function openProduct(){if([3,4,14].includes(entry.type)){initMap();return}if(entry.type===5){
 const st=String(entry.buildStatus||"").toLowerCase();
 if(["failed","pending","queued"].includes(st))status(st==="failed"?"El procesamiento COPC de DroneDB figura como fallido":st==="pending"?"COPC pendiente de dependencias/procesamiento":"COPC en cola de procesamiento");
 const native=nativePotreeUrl();
 if(native){document.querySelector(".pv-shell").classList.add("native-potree");openFrame(native,"POTREE · DRONEDB");return}
 openFrame("./pointcloud-viewer.html?embedded=1&v=20261005-0010&project="+encodeURIComponent(projectKey)+"&path="+encodeURIComponent(entry.path)+"&hash="+encodeURIComponent(entry.hash||""),"POTREE");return}if([11,16].includes(entry.type)){openFrame("./unified-viewer.html?embedded=1&mode=product&project="+encodeURIComponent(projectKey)+"&path="+encodeURIComponent(entry.path)+"&product="+encodeURIComponent(productId(entry)),"3D");return}openMedia()}
document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>{const t=b.dataset.tool;if(t==="clear"){coords=[];drawMode=null;lastMeasureMode=null;clearMeasureMarkers();if(drawSourceReady)map.getSource("pv-draw").setData({type:"FeatureCollection",features:[]});$("#pv-measure").classList.add("hidden");$("#pv-area-units").classList.add("hidden");if(map)map.getCanvas().style.cursor="";document.querySelectorAll("[data-tool]").forEach(x=>x.classList.remove("active"));return}drawMode=t;lastMeasureMode=null;coords=[];clearMeasureMarkers();syncAreaUnitUI();if(map)map.getCanvas().style.cursor="crosshair";if(drawSourceReady)map.getSource("pv-draw").setData({type:"FeatureCollection",features:[]});$("#pv-measure").classList.add("hidden");document.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("active",x===b));status(t==="inspect"?"Toca el producto para consultar":t==="area"?"Añade todos los vértices que necesites · doble clic sobre el último para cerrar":t==="distance"?"Toca los puntos · doble clic para terminar la distancia":"Toca para añadir vértices · doble clic para finalizar")});
document.querySelectorAll("[data-area-unit]").forEach(b=>b.onclick=()=>{areaUnit=b.dataset.areaUnit;localStorage.setItem("iv-area-unit",areaUnit);syncAreaUnitUI();if((drawMode||lastMeasureMode)==="area"&&coords.length>2)drawFC()});
syncAreaUnitUI();
window.addEventListener("message",e=>{const d=e.data;if(!d||d.source!=="island-view-potree")return;if(d.type==="loaded"){clearTimeout(potreeReadyTimer);potreeReadyTimer=null;return}if(d.type==="load-failed"){clearTimeout(potreeReadyTimer);potreeReadyTimer=null;openNativePotree()}});function openNativePotree(){const u=nativePotreeUrl();if(u){status("Abriendo Potree nativo de DroneDB…");openFrame(u,"POTREE · DRONEDB");document.querySelector(".pv-shell").classList.add("native-potree")}}
function frameCommand(command){try{$("#pv-frame").contentWindow?.postMessage({source:"island-view-product-viewer",command},"*")}catch{}}
function zoomBy(delta){if(map){map.zoomTo(map.getZoom()+delta,{duration:250});return}frameCommand(delta>0?"zoom-in":"zoom-out")}
function homeProduct(){if(map){const g=entry.polygon_geom;if(g)try{const bb=turf.bbox({type:"Feature",geometry:g,properties:{}});map.fitBounds([[bb[0],bb[1]],[bb[2],bb[3]]],{padding:55,maxZoom:20});return}catch{}map.flyTo({center:project?.coordinates||[-81.7006,12.5847],zoom:13,bearing:0,pitch:0});return}frameCommand("home")}
$("#pv-search").oninput=renderFiles;$("#pv-info-btn").onclick=()=>$("#pv-info").classList.toggle("hidden");$("#pv-info-close").onclick=()=>$("#pv-info").classList.add("hidden");$("#pv-full").onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();$("#pv-full-map").onclick=$("#pv-full").onclick;$("#pv-files-open").onclick=()=>document.querySelector(".pv-shell").classList.add("files-open");$("#pv-files-toggle").onclick=()=>document.querySelector(".pv-shell").classList.remove("files-open");$("#pv-close").onclick=()=>location.href=backUrl;$("#pv-zoom-in").onclick=()=>zoomBy(1);$("#pv-zoom-out").onclick=()=>zoomBy(-1);const zoomToggle=$("#pv-zoom-toggle");zoomToggle.onclick=()=>{if(entry.type!==TYPES.POINTCLOUD)return;const z=document.querySelector(".pv-zoom"),collapsed=z.classList.toggle("is-collapsed");zoomToggle.setAttribute("aria-expanded",String(!collapsed));zoomToggle.title=collapsed?"Mostrar controles de zoom":"Minimizar controles de zoom";zoomToggle.setAttribute("aria-label",zoomToggle.title)};$("#pv-home").onclick=homeProduct;$("#pv-north").onclick=()=>{if(map)map.easeTo({bearing:0,pitch:0,duration:350});else frameCommand("north")};
(async()=>{try{await loadProject();await resolveEntry();openProduct()}catch(e){fail(e)}})();
})();