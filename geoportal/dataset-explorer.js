const q=new URLSearchParams(location.search),projectKey=q.get("project")||"sai-dronedb";
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let project=null,base="",entries=[],currentPath="",view="grid",projectMap=null,mapReady=false,mapRasters=[];
function toast(t){const e=$("#db-toast");e.textContent=t;e.classList.remove("hidden");setTimeout(()=>e.classList.add("hidden"),2600)}
async function getProject(){const r=await fetch("./projects.json",{cache:"no-cache"}),j=await r.json();project=(j.projects||[]).find(x=>x.id===projectKey);if(!project?.dronedb)throw Error("Este proyecto no tiene un dataset DroneDB publicado.");const d=project.dronedb;base=String(d.registry||"https://hub.dronedb.app").replace(/\/$/,"")+"/orgs/"+encodeURIComponent(d.org)+"/ds/"+encodeURIComponent(d.dataset);document.title="Island View · "+project.name}
async function list(path=""){const f=new FormData();if(path)f.append("path",path);const r=await fetch(base+"/list",{method:"POST",body:f,credentials:"omit"});if(!r.ok)throw Error("DroneDB respondió "+r.status);return await r.json()}
function isFolder(e){return e.type===1||e.type===7}function name(e){return e.name||String(e.path||"").split("/").pop()}function thumb(e){return base+"/thumb?path="+encodeURIComponent(e.path)+"&size=320"}
function typeIcon(e){if(isFolder(e))return"folder";if(e.type===4)return"map";if(e.type===5)return"cloud";if(e.type===11||e.type===16)return"cube";return"file"}
function productUrl(e){const p=encodeURIComponent(projectKey),path=encodeURIComponent(e.path||""),hash=encodeURIComponent(e.hash||"");if(e.type===5)return"./pointcloud-viewer.html?project="+p+"&path="+path+"&hash="+hash;if(e.type===11||e.type===16)return"./unified-viewer.html?project="+p+"&path="+path+"&product="+encodeURIComponent("ddb-"+String(e.hash||e.path).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80))+"&mode=product";return"./unified-viewer.html?project="+p+"&path="+path+"&product="+encodeURIComponent("ddb-"+String(e.hash||e.path).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,80))+"&mode=product"}
function renderGrid(rows){entries=rows;const box=$("#db-files"),term=$("#db-search").value.trim().toLowerCase();const filtered=rows.filter(e=>!term||name(e).toLowerCase().includes(term));box.innerHTML=filtered.map(e=>'<article class="db-card" data-path="'+esc(e.path)+'"><div class="db-preview">'+(isFolder(e)?'<span class="db-folder-icon"></span>':e.type===4?'<img src="'+esc(thumb(e))+'" alt="">':'<span class="db-generic-icon">'+(e.type===5?"◌":(e.type===11||e.type===16?"◇":"▧"))+'</span>')+'</div><strong>'+esc(name(e))+'</strong></article>').join("")||'<div class="db-loading">No hay elementos en esta ubicación.</div>';box.querySelectorAll(".db-card").forEach(c=>{c.onclick=()=>{box.querySelectorAll(".db-card").forEach(x=>x.classList.remove("selected"));c.classList.add("selected")};c.ondblclick=()=>openEntry(rows.find(e=>e.path===c.dataset.path))})}
async function openEntry(e){if(!e)return;if(isFolder(e)){currentPath=e.path;await refresh();return}location.href=productUrl(e)}
async function refresh(){try{$("#db-files").innerHTML='<div class="db-loading">Cargando productos…</div>';const rows=await list(currentPath);renderGrid(rows);await renderTree()}catch(e){console.error(e);$("#db-files").innerHTML='<div class="db-loading">No fue posible consultar el dataset. '+esc(e.message)+'</div>';toast("No se pudo cargar DroneDB")}}
async function collectGeoRasters(){
 const found=[],seen=new Set();let visited=0;
 async function walk(path=""){
  if(visited++>100)return;
  const rows=await list(path);
  for(const e of rows||[]){
   if(!e?.path||String(e.path).startsWith(".ddb"))continue;
   if(isFolder(e)&&!seen.has(e.path)){seen.add(e.path);await walk(e.path)}
   else if(e.type===4)found.push(e);
  }
 }
 await walk("");return found;
}
function satelliteStyle(){
 return {version:8,sources:{satellite:{type:"raster",tiles:["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],tileSize:256,attribution:"Esri World Imagery"}},layers:[{id:"satellite",type:"raster",source:"satellite",minzoom:0,maxzoom:22}]};
}
function setRasterVisibility(id,on){if(projectMap?.getLayer(id))projectMap.setLayoutProperty(id,"visibility",on?"visible":"none")}
function renderMapLayerList(){
 const box=$("#db-map-layer-list");
 box.innerHTML=mapRasters.map((e,i)=>'<label class="db-map-layer"><input type="checkbox" data-map-layer="'+i+'" checked><span><strong>'+esc(name(e))+'</strong><small>'+esc(e.path)+'</small></span><input class="db-map-opacity" data-map-opacity="'+i+'" type="range" min="0" max="1" step=".05" value=".96"></label>').join("");
 box.querySelectorAll("[data-map-layer]").forEach(x=>x.onchange=()=>setRasterVisibility("ddb-ortho-"+x.dataset.mapLayer,x.checked));
 box.querySelectorAll("[data-map-opacity]").forEach(x=>x.oninput=()=>{const id="ddb-ortho-"+x.dataset.mapOpacity;if(projectMap?.getLayer(id))projectMap.setPaintProperty(id,"raster-opacity",Number(x.value))});
}
async function initProjectMap(){
 if(mapReady){setTimeout(()=>projectMap?.resize(),50);return}
 if(!window.maplibregl)throw Error("No fue posible iniciar el motor cartográfico.");
 const ll=Array.isArray(project?.coordinates)?project.coordinates:[-81.7006,12.5847];
 projectMap=new maplibregl.Map({container:"db-map",style:satelliteStyle(),center:ll,zoom:12.2,maxZoom:22,attributionControl:true});
 projectMap.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true}),"top-left");
 projectMap.addControl(new maplibregl.ScaleControl({maxWidth:130,unit:"metric"}),"bottom-left");
 await new Promise((resolve,reject)=>{projectMap.once("load",resolve);projectMap.once("error",e=>{if(!projectMap.loaded())console.warn(e)})});
 mapRasters=await collectGeoRasters();
 for(let i=0;i<mapRasters.length;i++){
  const e=mapRasters[i],sourceId="ddb-src-"+i,layerId="ddb-ortho-"+i;
  projectMap.addSource(sourceId,{type:"raster",tiles:[base+"/tiles/{z}/{x}/{y}.png?path="+encodeURIComponent(e.path)],tileSize:256,maxzoom:22});
  projectMap.addLayer({id:layerId,type:"raster",source:sourceId,paint:{"raster-opacity":.96,"raster-fade-duration":0}});
 }
 mapReady=true;$("#db-map-count").textContent=mapRasters.length+" ortomosaico"+(mapRasters.length===1?"":"s")+" activo"+(mapRasters.length===1?"":"s");
 renderMapLayerList();setTimeout(()=>projectMap.resize(),80);
}
async function showMapTab(){
 try{$("#db-map-count").textContent="Cargando todos los ortomosaicos…";await initProjectMap()}catch(e){console.error(e);$("#db-map-count").textContent="No fue posible cargar el mapa";toast(e.message)}
}
async function renderTree(){const root=await list("");let html='<div class="db-tree-row '+(!currentPath?"active":"")+'" data-tree=""><span class="twisty">▾</span><span class="kind">●</span><span class="label">'+esc(project.dronedb.dataset)+'</span></div>';for(const e of root){html+='<div class="db-tree-row '+(currentPath===e.path?"active":"")+'" data-tree="'+esc(e.path)+'"><span class="twisty">'+(isFolder(e)?"›":"")+'</span><span class="kind">'+(isFolder(e)?"□":e.type===4?"▧":e.type===5?"◌":"◇")+'</span><span class="label">'+esc(name(e))+'</span></div>'}$("#db-tree").innerHTML=html;$("#db-tree").querySelectorAll("[data-tree]").forEach(r=>r.onclick=async()=>{const path=r.dataset.tree;if(!path){currentPath="";await refresh();return}const e=root.find(x=>x.path===path);if(isFolder(e)){currentPath=e.path;await refresh()}else openEntry(e)})}
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=async()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));$("#db-files").classList.toggle("hidden",b.dataset.tab!=="files");$("#db-map-tab").classList.toggle("hidden",b.dataset.tab!=="map");$("#db-tasks-tab").classList.toggle("hidden",b.dataset.tab!=="tasks");if(b.dataset.tab==="map")await showMapTab()});
$("#db-map-home").onclick=()=>{const ll=Array.isArray(project?.coordinates)?project.coordinates:[-81.7006,12.5847];projectMap?.flyTo({center:ll,zoom:12.2,bearing:0,pitch:0})};
$("#db-map-layers-btn").onclick=()=>$("#db-map-layers").classList.toggle("hidden");
$("#db-map-layers-close").onclick=()=>$("#db-map-layers").classList.add("hidden");
$("#db-map-full").onclick=()=>{const el=$("#db-map-tab");document.fullscreenElement?document.exitFullscreen():el.requestFullscreen?.()};
$("#db-refresh").onclick=refresh;$("#db-search").oninput=()=>renderGrid(entries);$("#db-view-toggle").onclick=()=>{view=view==="grid"?"compact":"grid";$("#db-files").style.gridTemplateColumns=view==="grid"?"":"repeat(auto-fill,minmax(210px,1fr))"};
await getProject().then(refresh).catch(e=>{$("#db-files").innerHTML='<div class="db-loading">'+esc(e.message)+'</div>';console.error(e)});