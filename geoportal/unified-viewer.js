import XYZ from "ol/source/XYZ.js";
import {fromLonLat} from "ol/proj.js";
import {getLength,getArea} from "ol/sphere.js";
import {Circle,Fill,Stroke,Style} from "ol/style.js";
import {AmbientLight,Box3,DirectionalLight,Vector3} from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {MapControls} from "three/examples/jsm/controls/MapControls.js";
import CoordinateSystem from "@giro3d/giro3d/core/geographic/CoordinateSystem.js";
import Extent from "@giro3d/giro3d/core/geographic/Extent.js";
import Instance from "@giro3d/giro3d/core/Instance.js";
import ColorLayer from "@giro3d/giro3d/core/layer/ColorLayer.js";
import GiroMap from "@giro3d/giro3d/entities/Map.js";
import DrawTool from "@giro3d/giro3d/interactions/DrawTool.js";
import TiledImageSource from "@giro3d/giro3d/sources/TiledImageSource.js";
import VectorSource from "@giro3d/giro3d/sources/VectorSource.js";

const $=s=>document.querySelector(s), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.__IV_STAGE="parámetros";
const params=new URLSearchParams(location.search),projectKey=params.get("project")||"",productKey=params.get("product")||"",productPath=params.get("path")||"",productMode=params.get("mode")==="product"||!!productKey;
if(productMode)document.querySelector(".uv-shell")?.classList.add("product-mode");if(params.get("embedded")==="1")document.querySelector(".uv-shell")?.classList.add("embedded-mode");
if(productMode){const back="./dataset-explorer.html?project="+encodeURIComponent(projectKey);const close=document.querySelector(".uv-close"),brand=document.querySelector(".uv-brand");if(close)close.href=back;if(brand)brand.href=back}
const defaultLonLat=[-81.7006,12.5847],center=fromLonLat(defaultLonLat),crs=CoordinateSystem.epsg3857;
const extent=Extent.fromCenterAndSize(crs,{x:center[0],y:center[1]},80000,80000);
window.__IV_STAGE="instancia Giro3D";
const viewTarget=document.getElementById("view");
if(!(viewTarget instanceof HTMLDivElement))throw new Error("No se encontró el contenedor #view");
const instance=new Instance({target:viewTarget,crs,backgroundColor:0xdce5ea,renderer:{logarithmicDepthBuffer:true}});instance.view.camera.up.set(0,0,1);
const map=new GiroMap({extent,backgroundColor:"#d9e1e5"}); await instance.add(map);
const ambient=new AmbientLight(0xffffff,1.5),sun=new DirectionalLight(0xffffff,2);sun.position.set(1,-1,2).normalize();instance.scene.add(ambient);instance.scene.add(sun);
window.__IV_STAGE="mapa base";
const basemapSource=new XYZ({url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",projection:"EPSG:3857",wrapX:false,crossOrigin:"anonymous",attributions:"Esri World Imagery"});
const osm=new ColorLayer({name:"Mapa base · OSM",extent,source:new TiledImageSource({source:basemapSource,extent})});await map.addLayer(osm);
const controls=new MapControls(instance.view.camera,instance.domElement);controls.enableDamping=true;controls.dampingFactor=.18;instance.view.setControls(controls);
const layerRegistry=new Map(),entityRegistry=new Map(),measurements=[];
let currentCenter=new Vector3(center[0],center[1],0),drawTool=null,measureSource=null,measureLayer=null,mode="2d";

function status(t){$("#uv-status").textContent=t}
function message(t){const e=$("#uv-message");e.textContent=t;e.classList.remove("hidden");setTimeout(()=>e.classList.add("hidden"),5000)}
function setCamera(kind=mode){
 mode=kind;$("#uv-2d").classList.toggle("active",kind==="2d");$("#uv-3d").classList.toggle("active",kind==="3d");
 const tilt=Number($("#uv-tilt").value||45)*Math.PI/180,dist=kind==="2d"?18000:12000;
 const p=kind==="2d"?new Vector3(currentCenter.x,currentCenter.y-1,dist):new Vector3(currentCenter.x,currentCenter.y-dist*Math.sin(tilt),dist*Math.cos(tilt));
 instance.view.camera.position.copy(p);controls.target.copy(currentCenter);instance.view.camera.lookAt(currentCenter);controls.update();instance.notifyChange();
 status(kind==="2d"?"Vista ortográfica superior":"Vista 3D activa");
}
window.addEventListener("message",e=>{const d=e.data;if(!d||d.source!=="island-view-product-viewer")return;try{if(d.command==="home"||d.command==="north"){setCamera(mode)}else if(d.command==="zoom-in"||d.command==="zoom-out"){const factor=d.command==="zoom-in"?.72:1.38;instance.view.camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();instance.notifyChange()}}catch(err){console.warn("Product viewer command",err)}});
function bringMeasurementsToFront(){if(!measureLayer)return;let guard=30;while(map.getIndex(measureLayer)<map.getLayers().length-1&&guard-->0)map.moveLayerUp(measureLayer)}
function setupMeasurements(){
 const style=new Style({fill:new Fill({color:"rgba(0,122,194,.16)"}),stroke:new Stroke({color:"#007ac2",width:3}),image:new Circle({radius:6,fill:new Fill({color:"#007ac2"}),stroke:new Stroke({color:"#fff",width:2})})});
 measureSource=new VectorSource({dataProjection:CoordinateSystem.epsg3857,style,data:[]});
 measureLayer=new ColorLayer({name:"Mediciones",source:measureSource,extent});map.addLayer(measureLayer);drawTool=new DrawTool({instance});bringMeasurementsToFront();
}
window.__IV_STAGE="mediciones";
setupMeasurements();

async function draw(type){
 if(!drawTool)return;controls.enabled=false;document.querySelectorAll("[data-draw]").forEach(b=>b.classList.toggle("active",b.dataset.draw===type));
 try{
  const shape=type==="point"?await drawTool.createPoint():type==="line"?await drawTool.createLineString():await drawTool.createPolygon();
  if(!shape)return;const feature=shape.toOpenLayersFeature(),g=feature.getGeometry();measureSource.addFeature(feature);instance.remove(shape);bringMeasurementsToFront();
  let value="Punto";if(type==="line"){const m=getLength(g,{projection:"EPSG:3857"});value=m>=1000?(m/1000).toFixed(3)+" km":m.toFixed(2)+" m"}
  if(type==="polygon"){const a=getArea(g,{projection:"EPSG:3857"});value=a>=10000?(a/10000).toFixed(4)+" ha":a.toFixed(2)+" m²"}
  measurements.push({type,value});renderMeasures();status("Medición creada · "+value);
 }catch(e){console.error(e);message("No fue posible completar la medición.")}finally{controls.enabled=true;document.querySelectorAll("[data-draw]").forEach(b=>b.classList.remove("active"))}
}
function renderMeasures(){$("#uv-measures").innerHTML=measurements.map((m,i)=>'<div class="uv-measure">'+(i+1)+'. '+esc(m.value)+'</div>').join("")}
function clearMeasures(){measureSource?.clear();measurements.length=0;renderMeasures();instance.notifyChange()}

function normalizeSource(p){const s=p.source||{};return {kind:String(s.kind||s.type||p.format||"").toLowerCase(),url:s.url||s.href||"",layer:s.layer||s.layerName||"",projection:s.projection||p.metadata?.crs||"EPSG:3857",template:s.template||s.url||""}}
async function addElevationProduct(p){
 const s=normalizeSource(p),url=p.source?.cogUrl||s.url;
 if(!url)throw Error("DEM/DSM/DTM sin COG publicado");
 const [{default:ElevationLayer},{default:GeoTIFFSource}]=await Promise.all([import("@giro3d/giro3d/core/layer/ElevationLayer.js"),import("@giro3d/giro3d/sources/GeoTIFFSource.js")]);
 const source=new GeoTIFFSource({url,crs});
 const opts={name:p.name||p.id,source,extent,resolutionFactor:.5};
 const min=Number(p.metadata?.minElevation),max=Number(p.metadata?.maxElevation);if(Number.isFinite(min)&&Number.isFinite(max))opts.minmax={min,max};
 const layer=new ElevationLayer(opts);await map.addLayer(layer);layerRegistry.set(p.id,layer);mode="3d";setCamera("3d");bringMeasurementsToFront();instance.notifyChange(map);status("Terreno 3D activo · "+(p.name||"DEM/DSM/DTM"));return layer;
}
async function addRasterProduct(p){
 const s=normalizeSource(p);let source;
 if(s.kind.includes("wms")){const {default:WmsSource}=await import("@giro3d/giro3d/sources/WmsSource.js");source=new WmsSource({url:s.url,layer:s.layer,projection:s.projection})}
 else if(s.kind.includes("tif")||s.kind.includes("cog")||s.kind.includes("geotiff")){const {default:GeoTIFFSource}=await import("@giro3d/giro3d/sources/GeoTIFFSource.js");source=new GeoTIFFSource({url:s.url,crs})}
 else {source=new TiledImageSource({source:new XYZ({url:s.template,crossOrigin:"anonymous"})})}
 const layer=new ColorLayer({name:p.name||p.id,source,extent});map.addLayer(layer);layerRegistry.set(p.id,layer);bringMeasurementsToFront();instance.notifyChange(map);return layer;
}
async function addGLB(p){
 const s=normalizeSource(p),loader=new GLTFLoader(),gltf=await loader.loadAsync(s.url),model=gltf.scene;
 const pos=p.source?.position;if(Array.isArray(pos)&&pos.length>=2){const xy=fromLonLat(pos);model.position.set(xy[0],xy[1],Number(pos[2]||0))}else model.position.copy(currentCenter);
 const scale=Number(p.source?.scale||1);model.scale.setScalar(scale);model.updateMatrixWorld(true);await instance.add(model);entityRegistry.set(p.id,model);
 const box=new Box3().setFromObject(model),c=box.getCenter(new Vector3());if(Number.isFinite(c.x)){currentCenter.copy(c);setCamera("3d")}instance.notifyChange(model);return model;
}
async function addTiles3D(p){
 const s=normalizeSource(p),{default:Tiles3D}=await import("@giro3d/giro3d/entities/Tiles3D.js");const e=new Tiles3D({url:s.url});await instance.add(e);entityRegistry.set(p.id,e);return e;
}
async function addCOPC(p){
 const s=normalizeSource(p);const [{default:PointCloud},{default:COPCSource}]=await Promise.all([import("@giro3d/giro3d/entities/PointCloud.js"),import("@giro3d/giro3d/sources/COPCSource.js")]);
 const source=new COPCSource({url:s.url});await source.initialize();const e=new PointCloud({source});await instance.add(e);e.pointSize=2;entityRegistry.set(p.id,e);instance.renderingOptions.enableEDL=$("#uv-edl").checked;
 const box=e.getBoundingBox?.();if(box){const c=box.getCenter(new Vector3());currentCenter.copy(c);setCamera("3d")}return e;
}
async function addPotree(p){
 const s=normalizeSource(p);const [{default:PointCloud},{default:PotreeSource}]=await Promise.all([import("@giro3d/giro3d/entities/PointCloud.js"),import("@giro3d/giro3d/sources/PotreeSource.js")]);
 const source=new PotreeSource({url:s.url});await source.initialize();const e=new PointCloud({source});await instance.add(e);e.visible=true;entityRegistry.set(p.id,e);instance.renderingOptions.enableEDL=$("#uv-edl").checked;return e;
}
async function ensureProduct(p){
 if(layerRegistry.has(p.id))return layerRegistry.get(p.id);if(entityRegistry.has(p.id))return entityRegistry.get(p.id);
 const s=normalizeSource(p);if(!s.url&&!s.template)throw Error("Producto sin URL de publicación web");
 if(s.kind.includes("copc")||String(s.url).toLowerCase().includes(".copc.laz"))return addCOPC(p);
 if(p.type==="pointcloud"||s.kind.includes("potree"))return addPotree(p);
 if(s.kind.includes("3dtiles")||s.url.endsWith("tileset.json"))return addTiles3D(p);
 if(p.type==="elevation"||s.kind.includes("dem")||s.kind.includes("dsm")||s.kind.includes("dtm"))return addElevationProduct(p);
 if(p.type==="3d"||s.kind.includes("glb")||s.kind.includes("gltf")||String(s.url).toLowerCase().includes(".glb")||String(s.url).toLowerCase().includes(".gltf"))return addGLB(p);
 return addRasterProduct(p);
}
async function toggleProduct(p,on){
 try{let obj=layerRegistry.get(p.id)||entityRegistry.get(p.id);if(on&&!obj)obj=await ensureProduct(p);if(obj){obj.visible=on;instance.notifyChange(obj)}status((on?"Capa activada · ":"Capa oculta · ")+(p.name||"Producto"))}
 catch(e){console.error(e);message((p.name||"Producto")+": "+e.message);const c=document.querySelector('[data-product="'+CSS.escape(p.id)+'"]');if(c)c.checked=false}
}
function renderProducts(products){
 const box=$("#uv-layers");if(!products.length){box.innerHTML='<div class="uv-empty">Este proyecto aún no tiene productos web publicados.</div>';return}
 box.innerHTML=products.map(p=>'<div class="uv-layer"><div class="uv-layer-main"><input type="checkbox" data-product="'+esc(p.id)+'"><div class="uv-layer-name"><strong>'+esc(p.name)+'</strong><small>'+esc(p.type||p.format||"producto")+'</small></div><button data-focus="'+esc(p.id)+'" title="Acercar">⌖</button></div><input class="uv-layer-opacity" data-opacity="'+esc(p.id)+'" type="range" min="0" max="1" step=".05" value="1"></div>').join("");
 box.querySelectorAll("[data-product]").forEach(c=>c.onchange=()=>toggleProduct(products.find(p=>p.id===c.dataset.product),c.checked));
 box.querySelectorAll("[data-opacity]").forEach(r=>r.oninput=()=>{const o=layerRegistry.get(r.dataset.opacity);if(o){o.opacity=Number(r.value);instance.notifyChange(o)}});
 box.querySelectorAll("[data-focus]").forEach(b=>b.onclick=()=>{const o=entityRegistry.get(b.dataset.focus);if(o?.getBoundingBox){const bb=o.getBoundingBox(),c=bb.getCenter(new Vector3());currentCenter.copy(c);setCamera("3d")}else setCamera(mode)});
}
async function discoverDroneDB(cfg){
 const base=String(cfg.registry||"https://hub.dronedb.app").replace(/\/$/,"")+"/orgs/"+encodeURIComponent(cfg.org)+"/ds/"+encodeURIComponent(cfg.dataset);
 const found=[],seen=new Set();let visited=0;
 async function list(path=""){
  if(visited++>80)return;
  const form=new FormData();if(path)form.append("path",path);
  const res=await fetch(base+"/list",{method:"POST",body:form,credentials:"omit"});
  if(!res.ok)throw Error("DroneDB respondió "+res.status);
  const rows=await res.json();
  for(const e of rows||[]){
   if(!e?.path||String(e.path).startsWith(".ddb"))continue;
   if((e.type===1||e.type===7)&&!seen.has(e.path)){seen.add(e.path);await list(e.path);continue}
   const id="ddb-"+String(e.hash||e.path).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80);
   if(e.type===4){const n=e.name||e.path.split("/").pop(),terrain=/\b(dem|dsm|dtm|elevation|elevacion|elevación)\b/i.test(n+" "+e.path),cog=e.hash?base+"/build/"+e.hash+"/cog/cog.tif":"";found.push({id,name:n,type:terrain?"elevation":"orthomosaic",format:terrain?"DEM/DSM/DTM · COG":"DroneDB GeoRaster",source:terrain?{kind:"dem-cog",url:cog,cogUrl:cog}:{kind:"xyz",url:base+"/tiles/{z}/{x}/{y}.png?path="+encodeURIComponent(e.path),cogUrl:cog},metadata:{path:e.path,hash:e.hash,provider:"DroneDB"}})}
   else if(e.type===5&&e.hash)found.push({id,name:e.name||e.path.split("/").pop(),type:"pointcloud",format:"COPC",source:{kind:"copc",url:base+"/build/"+e.hash+"/copc/cloud.copc.laz"},metadata:{path:e.path,hash:e.hash,provider:"DroneDB"}});
   else if((e.type===11||e.type===16)&&e.hash)found.push({id,name:e.name||e.path.split("/").pop(),type:"3d",format:"3D Tiles",source:{kind:"3dtiles",url:base+"/build/"+e.hash+"/3dtiles/tileset.json"},metadata:{path:e.path,hash:e.hash,provider:"DroneDB"}});
  }
 }
 await list("");
 return found;
}

async function loadCatalog(){
 let project=null,products=[];
 const cfg=window.IV_AUTH_CONFIG||{};
 if(cfg.enabled&&cfg.supabaseUrl&&cfg.supabasePublishableKey&&window.supabase){
  const c=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  if(projectKey){
   const {data}=await c.from("portal_projects").select("*").eq("slug",projectKey).maybeSingle();project=data;
   if(project){const r=await c.from("portal_products").select("*").eq("project_id",project.id).order("created_at");products=(r.data||[]).map(x=>({id:x.id,name:x.name,type:x.product_type,format:x.format,source:x.source||{},metadata:x.metadata||{}}))}
  }
 }
 if(!project&&projectKey){
  try{const r=await fetch("./projects.json",{cache:"no-cache"}),j=await r.json();const p=(j.projects||[]).find(x=>x.id===projectKey);if(p)project={name:p.name,slug:p.id,location:p.location,center:p.coordinates,service:p.service,client_name:p.client,dronedb:p.dronedb}}catch(e){console.warn(e)}
 }
 if(projectKey){try{const r=await fetch("./products.json",{cache:"no-cache"}),j=await r.json();const pub=(j.products||[]).filter(x=>x.projectId===projectKey&&x.access!=="private"&&x.status!=="draft");const seen=new Set(products.map(x=>x.id));pub.forEach(x=>{if(!seen.has(x.id))products.push(x)})}catch(e){console.warn(e)}}
 if(project&&!project.dronedb&&project.metadata?.org&&project.metadata?.dataset)project.dronedb={registry:project.metadata.registry||"https://hub.dronedb.app",org:project.metadata.org,dataset:project.metadata.dataset};
 if(project?.dronedb){try{status("Consultando dataset DroneDB · "+project.dronedb.dataset+"…");const remote=await discoverDroneDB(project.dronedb),seen=new Set(products.map(x=>x.id));remote.forEach(x=>{if(!seen.has(x.id))products.push(x)});project.dronedbCount=remote.length}catch(e){console.error(e);message("No fue posible consultar DroneDB directamente. Verifica que el dataset SAI sea público y permita CORS.");project.dronedbError=e.message}}

 if(project){
  $("#uv-title").textContent=project.name||"Proyecto";$("#uv-subtitle").textContent=[project.client_name,project.location,project.service].filter(Boolean).join(" · ")||"Island View S.A.S.";
  const ll=Array.isArray(project.center)?project.center:project.center?.coordinates;if(ll?.length>=2){const xy=fromLonLat(ll);currentCenter.set(xy[0],xy[1],0)}
 }else{$("#uv-subtitle").textContent=projectKey?"Proyecto no disponible para esta cuenta":"Visor general · San Andrés Isla"}
 renderProducts(products);
 if(productMode){
  const selected=products.find(p=>p.id===productKey||p.metadata?.path===productPath);
  if(selected){
   $("#uv-title").textContent=selected.name||project?.name||"Producto geoespacial";
   $("#uv-subtitle").textContent=[selected.format||selected.type,project?.name].filter(Boolean).join(" · ");
   status("Abriendo · "+(selected.name||"Producto"));
   try{await toggleProduct(selected,true);const cb=document.querySelector('[data-product="'+CSS.escape(selected.id)+'"]');if(cb)cb.checked=true;if(selected.type==="3d"||selected.type==="pointcloud")setCamera("3d");else setCamera("2d")}catch(e){console.error(e);message("No fue posible abrir "+(selected.name||"el producto")+": "+e.message)}
  }else{setCamera("2d");message("El producto solicitado no está disponible o continúa en procesamiento.")}
 }else setCamera("2d");
 $("#uv-loading").classList.add("hidden");status((productMode?"Visor de producto listo · ":"Giro3D listo · ")+products.length+" productos disponibles"+(project?.dronedb?" · DroneDB SAI":""));
}
$("#uv-2d").onclick=()=>setCamera("2d");$("#uv-3d").onclick=()=>setCamera("3d");$("#uv-tilt").oninput=()=>{if(mode==="3d")setCamera("3d")};$("#uv-full").onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();$("#uv-collapse").onclick=()=>{$(".uv-shell").classList.toggle("collapsed");setTimeout(()=>instance.resize?.(),200)};$("#uv-clear").onclick=clearMeasures;$("#uv-edl").onchange=e=>{instance.renderingOptions.enableEDL=e.target.checked;instance.notifyChange()};document.querySelectorAll("[data-draw]").forEach(b=>b.onclick=()=>draw(b.dataset.draw));instance.domElement.addEventListener("contextmenu",e=>e.preventDefault());
await loadCatalog().catch(e=>{console.error(e);$("#uv-loading").classList.add("hidden");message("El visor inició, pero no fue posible cargar el catálogo del proyecto.");setCamera("2d")});
window.IVUnified={instance,map,loadProduct:ensureProduct,setCamera,clearMeasures};
