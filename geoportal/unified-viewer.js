import OSM from "ol/source/OSM.js";
import XYZ from "ol/source/XYZ.js";
import {fromLonLat} from "ol/proj.js";
import {getLength,getArea} from "ol/sphere.js";
import {Circle,Fill,Stroke,Style} from "ol/style.js";
import {Vector3} from "three";
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
const params=new URLSearchParams(location.search),projectKey=params.get("project")||"";
const defaultLonLat=[-81.7006,12.5847],center=fromLonLat(defaultLonLat),crs=CoordinateSystem.epsg3857;
const extent=Extent.fromCenterAndSize(crs,{x:center[0],y:center[1]},80000,80000);
const instance=new Instance({target:"view",crs,backgroundColor:0xdce5ea,renderer:{logarithmicDepthBuffer:true}});
const map=new GiroMap({extent,backgroundColor:"#d9e1e5"}); await instance.add(map);
const osm=new ColorLayer({name:"Mapa base · OSM",source:new TiledImageSource({source:new OSM({wrapX:false})})});map.addLayer(osm);
const controls=new MapControls(instance.view.camera,instance.domElement);controls.enableDamping=true;controls.dampingFactor=.18;instance.view.setControls(controls);
const layerRegistry=new Map(),entityRegistry=new Map(),measurements=[];
let currentCenter=new Vector3(center[0],center[1],0),drawTool=null,measureSource=null,measureLayer=null,mode="2d";

function status(t){$("#uv-status").textContent=t}
function message(t){const e=$("#uv-message");e.textContent=t;e.classList.remove("hidden");setTimeout(()=>e.classList.add("hidden"),5000)}
function setCamera(kind=mode){
 mode=kind;$("#uv-2d").classList.toggle("active",kind==="2d");$("#uv-3d").classList.toggle("active",kind==="3d");
 const tilt=Number($("#uv-tilt").value||45)*Math.PI/180,dist=kind==="2d"?18000:12000;
 const p=kind==="2d"?new Vector3(currentCenter.x,currentCenter.y,dist):new Vector3(currentCenter.x,currentCenter.y-dist*Math.sin(tilt),dist*Math.cos(tilt));
 instance.view.camera.position.copy(p);controls.target.copy(currentCenter);instance.view.camera.lookAt(currentCenter);controls.update();instance.notifyChange();
 status(kind==="2d"?"Vista ortográfica superior":"Vista 3D activa");
}
function bringMeasurementsToFront(){if(!measureLayer)return;let guard=30;while(map.getIndex(measureLayer)<map.getLayers().length-1&&guard-->0)map.moveLayerUp(measureLayer)}
function setupMeasurements(){
 const style=new Style({fill:new Fill({color:"rgba(0,122,194,.16)"}),stroke:new Stroke({color:"#007ac2",width:3}),image:new Circle({radius:6,fill:new Fill({color:"#007ac2"}),stroke:new Stroke({color:"#fff",width:2})})});
 measureSource=new VectorSource({dataProjection:CoordinateSystem.epsg3857,style,data:[]});
 measureLayer=new ColorLayer({name:"Mediciones",source:measureSource,extent});map.addLayer(measureLayer);drawTool=new DrawTool({instance});bringMeasurementsToFront();
}
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
async function addRasterProduct(p){
 const s=normalizeSource(p);let source;
 if(s.kind.includes("wms")){const {default:WmsSource}=await import("@giro3d/giro3d/sources/WmsSource.js");source=new WmsSource({url:s.url,layer:s.layer,projection:s.projection})}
 else if(s.kind.includes("tif")||s.kind.includes("cog")||s.kind.includes("geotiff")){const {default:GeoTIFFSource}=await import("@giro3d/giro3d/sources/GeoTIFFSource.js");source=new GeoTIFFSource({url:s.url,crs})}
 else {source=new TiledImageSource({source:new XYZ({url:s.template,crossOrigin:"anonymous"})})}
 const layer=new ColorLayer({name:p.name||p.id,source,extent});map.addLayer(layer);layerRegistry.set(p.id,layer);bringMeasurementsToFront();instance.notifyChange(map);return layer;
}
async function addTiles3D(p){
 const s=normalizeSource(p),{default:Tiles3D}=await import("@giro3d/giro3d/entities/Tiles3D.js");const e=new Tiles3D({url:s.url});await instance.add(e);entityRegistry.set(p.id,e);return e;
}
async function addPotree(p){
 const s=normalizeSource(p);const [{default:PointCloud},{default:PotreeSource}]=await Promise.all([import("@giro3d/giro3d/entities/PointCloud.js"),import("@giro3d/giro3d/sources/PotreeSource.js")]);
 const source=new PotreeSource({url:s.url});await source.initialize();const e=new PointCloud({source});await instance.add(e);e.visible=true;entityRegistry.set(p.id,e);instance.renderingOptions.enableEDL=$("#uv-edl").checked;return e;
}
async function ensureProduct(p){
 if(layerRegistry.has(p.id))return layerRegistry.get(p.id);if(entityRegistry.has(p.id))return entityRegistry.get(p.id);
 const s=normalizeSource(p);if(!s.url&&!s.template)throw Error("Producto sin URL de publicación web");
 if(p.type==="pointcloud"||s.kind.includes("potree"))return addPotree(p);
 if(p.type==="3d"||s.kind.includes("3dtiles")||s.url.endsWith("tileset.json"))return addTiles3D(p);
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
  try{const r=await fetch("./projects.json",{cache:"no-cache"}),j=await r.json();const p=(j.projects||[]).find(x=>x.id===projectKey);if(p)project={name:p.name,slug:p.id,location:p.location,center:p.coordinates,service:p.service}}catch(e){console.warn(e)}
 }
 if(project){
  $("#uv-title").textContent=project.name||"Proyecto";$("#uv-subtitle").textContent=[project.client_name,project.location,project.service].filter(Boolean).join(" · ")||"Island View S.A.S.";
  const ll=Array.isArray(project.center)?project.center:project.center?.coordinates;if(ll?.length>=2){const xy=fromLonLat(ll);currentCenter.set(xy[0],xy[1],0)}
 }else{$("#uv-subtitle").textContent=projectKey?"Proyecto no disponible para esta cuenta":"Visor general · San Andrés Isla"}
 renderProducts(products);setCamera("2d");$("#uv-loading").classList.add("hidden");status("Giro3D listo · "+products.length+" productos disponibles");
}
$("#uv-2d").onclick=()=>setCamera("2d");$("#uv-3d").onclick=()=>setCamera("3d");$("#uv-tilt").oninput=()=>{if(mode==="3d")setCamera("3d")};$("#uv-full").onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();$("#uv-collapse").onclick=()=>{$(".uv-shell").classList.toggle("collapsed");setTimeout(()=>instance.resize?.(),200)};$("#uv-clear").onclick=clearMeasures;$("#uv-edl").onchange=e=>{instance.renderingOptions.enableEDL=e.target.checked;instance.notifyChange()};document.querySelectorAll("[data-draw]").forEach(b=>b.onclick=()=>draw(b.dataset.draw));instance.domElement.addEventListener("contextmenu",e=>e.preventDefault());
await loadCatalog().catch(e=>{console.error(e);$("#uv-loading").classList.add("hidden");message("El visor inició, pero no fue posible cargar el catálogo del proyecto.");setCamera("2d")});
window.IVUnified={instance,map,loadProduct:ensureProduct,setCamera,clearMeasures};
