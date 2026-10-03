(() => {
"use strict";
const IV=window.IVGeo;
if(!IV){console.error("Island View Geoportal API no disponible");return}
const {map,sketch,redraw,activateTool,fitFeature,dl,setBasemap,getBasemap}=IV;
const state={projects:[],filtered:[],imported:{type:"FeatureCollection",features:[]},category:"all"};
const qs=(s,p=document)=>p.querySelector(s), qsa=(s,p=document)=>[...p.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(msg,type="info"){const el=qs("#portal-status");if(el){el.textContent=msg;el.dataset.type=type}}
function insertUI(){
 document.body.insertAdjacentHTML("afterbegin",'<header class="gis-appbar"><div class="appbar-left"><img class="appbar-logo" src="'+qs(".brand-logo").src+'" alt="Island View SAS"><button id="sidebar-toggle" class="icon-button" title="Mostrar u ocultar panel" aria-label="Mostrar u ocultar panel">☰</button><div class="appbar-title"><strong>Island View Geoportal</strong><span>San Andrés, Providencia y Santa Catalina</span></div></div><div class="appbar-actions"><button id="basemap-open" class="appbar-button">Mapa base</button><button id="table-open" class="appbar-button">Tabla</button><button id="app-fullscreen" class="icon-button" title="Pantalla completa" aria-label="Pantalla completa">⛶</button></div></header>');
 const mapWrap=qs(".map-wrap");
 mapWrap.insertAdjacentHTML("beforeend",'<nav class="gis-rail" aria-label="Accesos del geoportal"><button data-rail="catalog" title="Proyectos">P</button><button data-rail="viewer" title="Visor">V</button><button data-rail="dashboard" title="Paneles">D</button><button data-rail="stories" title="Historias">H</button><button data-rail="models" title="Modelos 3D">3D</button></nav><section id="basemap-gallery" class="basemap-gallery hidden" aria-label="Galería de mapas base"><div class="floating-head"><strong>Mapa base</strong><button id="basemap-close" aria-label="Cerrar">×</button></div><div class="basemap-options"><button data-basemap="satellite" class="basemap-card active"><span class="basemap-preview satellite-preview"></span><strong>Imágenes</strong><small>Esri World Imagery</small></button><button data-basemap="osm" class="basemap-card"><span class="basemap-preview osm-preview"></span><strong>Calles</strong><small>OpenStreetMap</small></button></div></section><aside id="project-drawer" class="project-drawer hidden" aria-label="Detalles del proyecto"><div class="drawer-head"><div><small>PROYECTO</small><strong id="drawer-title">Proyecto</strong></div><button id="drawer-close" aria-label="Cerrar">×</button></div><div id="drawer-body" class="drawer-body"></div></aside><section id="attribute-table" class="attribute-table hidden" aria-label="Tabla de atributos"><div class="attribute-head"><div><strong>Tabla de atributos</strong><div class="attribute-tabs"><button data-table="projects" class="active">Proyectos <span id="table-project-count">0</span></button><button data-table="drawings">Dibujos <span id="table-draw-count">0</span></button></div></div><button id="table-close" aria-label="Cerrar">×</button></div><div class="attribute-scroll"><table><thead id="attribute-thead"></thead><tbody id="attribute-tbody"></tbody></table></div></section>');
 const eyebrow=qs(".eyebrow");
 qsa(".sidebar > .panel").forEach(p=>p.classList.add("map-workspace-panel"));
 const nav=document.createElement("nav");nav.className="portal-nav";nav.setAttribute("aria-label","Secciones del geoportal");
 nav.innerHTML='<button data-view="catalog" class="active">Proyectos</button><button data-view="viewer">Visor</button><button data-view="dashboard">Paneles</button><button data-view="stories">Historias</button><button data-view="models">3D/AR</button>';
 eyebrow.after(nav);
 const catalog=document.createElement("section");catalog.id="catalog-panel";catalog.className="panel catalog-panel project-workspace-panel";
 catalog.innerHTML='<div class="panel-title"><h2>Catálogo de proyectos</h2><span id="project-count" class="badge">0</span></div><input id="project-search" class="field" type="search" placeholder="Buscar proyecto, cliente o ubicación" aria-label="Buscar proyectos"><div class="filter-grid"><select id="filter-service" class="field" aria-label="Filtrar por servicio"><option value="">Servicio</option></select><select id="filter-client" class="field" aria-label="Filtrar por cliente"><option value="">Cliente</option></select><select id="filter-location" class="field" aria-label="Filtrar por ubicación"><option value="">Ubicación</option></select><select id="filter-date" class="field" aria-label="Filtrar por fecha"><option value="">Fecha</option></select><select id="filter-product" class="field" aria-label="Filtrar por producto"><option value="">Producto</option></select></div><div id="category-tabs" class="category-tabs"></div><div id="project-list" class="project-list"><div class="loading">Cargando proyectos…</div></div>';
 nav.after(catalog);
 const search=document.createElement("section");search.className="panel viewer-panel map-workspace-panel";search.innerHTML='<h2>Buscar en el visor</h2><div class="search-row"><input id="map-search" class="field" placeholder="Proyecto o lat, lng" aria-label="Buscar proyecto o coordenadas"><button id="map-search-btn" aria-label="Buscar">⌕</button></div><p class="help">Búsqueda local por proyectos publicados o coordenadas. No envía consultas a geocodificadores externos.</p>';
 catalog.after(search);
 const rasterPanel=document.createElement("section");rasterPanel.className="panel viewer-panel map-workspace-panel";rasterPanel.innerHTML='<div class="panel-title"><h2>Capas configuradas</h2><span id="layer-registry-status" class="dot pending"></span></div><div id="configured-layers" class="layer-list"><div class="loading">Leyendo layers.json…</div></div>';
 search.after(rasterPanel);
 const toolsPanel=qsa(".panel").find(p=>qs("h2",p)?.textContent==="Herramientas");
 if(toolsPanel){
   const extras=document.createElement("div");extras.className="portal-extra-tools";extras.innerHTML='<button id="btn-fullscreen">⛶ Pantalla</button><button id="btn-import">⇧ Cargar datos</button><input id="local-file" type="file" hidden accept=".geojson,.json,.kml,.gpx,.csv,application/geo+json"><button id="btn-edit">✥ Editar selección</button>';
   toolsPanel.append(extras);
 }
 const results=document.createElement("section");results.className="panel viewer-panel map-workspace-panel";results.innerHTML='<div class="panel-title"><h2>Resultados / dibujos</h2><button id="download-notes" class="mini">Anotaciones</button></div><div id="draw-results" class="draw-results"><div class="empty">Aún no hay geometrías.</div></div>';
 toolsPanel?.after(results);
 const live=document.createElement("div");live.id="portal-status";live.className="sr-status";live.setAttribute("role","status");live.setAttribute("aria-live","polite");live.textContent="Geoportal listo";document.body.append(live);
 const modal=document.createElement("div");modal.id="portal-modal";modal.className="modal hidden";modal.innerHTML='<div class="modal-card portal-modal-card"><div class="modal-head"><div><strong id="portal-modal-title">Island View</strong><small id="portal-modal-subtitle"></small></div><button id="portal-modal-close" aria-label="Cerrar">×</button></div><div id="portal-modal-body" class="portal-modal-body"></div></div>';qs(".map-wrap").append(modal);
 qsa(".portal-nav button").forEach(b=>b.onclick=()=>openView(b.dataset.view,b));
 qs("#portal-modal-close").onclick=closeModal;modal.onclick=e=>{if(e.target===modal)closeModal()};
 qs("#btn-fullscreen")?.addEventListener("click",toggleFullscreen);
 qs("#btn-import")?.addEventListener("click",()=>qs("#local-file").click());
 qs("#local-file")?.addEventListener("change",importLocal);
 qs("#btn-edit")?.addEventListener("click",editActive);
 qs("#download-notes")?.addEventListener("click",downloadNotes);
 qs("#map-search-btn").onclick=mapSearch;qs("#map-search").onkeydown=e=>{if(e.key==="Enter")mapSearch()};
 qs("#sidebar-toggle").onclick=toggleSidebar;
 qsa("[data-rail]").forEach(b=>b.onclick=()=>{if(document.body.classList.contains("sidebar-collapsed"))toggleSidebar();const target=qs('.portal-nav [data-view="'+b.dataset.rail+'"]');target?.click()});
 qs("#basemap-open").onclick=toggleBasemapGallery;
 qs("#basemap-close").onclick=()=>qs("#basemap-gallery").classList.add("hidden");
 qsa("[data-basemap]").forEach(b=>b.onclick=()=>chooseBasemap(b.dataset.basemap));
 qs("#table-open").onclick=()=>toggleAttributeTable();
 qs("#table-close").onclick=()=>{qs("#attribute-table").classList.add("hidden");setTimeout(()=>map.resize(),220)};
 qsa("[data-table]").forEach(b=>b.onclick=()=>renderAttributeTable(b.dataset.table));
 qs("#drawer-close").onclick=closeProjectDrawer;
 qs("#app-fullscreen").onclick=toggleFullscreen;
 setWorkspace("catalog");
}
function setWorkspace(view){
 const project=view==="catalog";
 qsa(".project-workspace-panel").forEach(el=>el.classList.toggle("workspace-hidden",!project));
 qsa(".map-workspace-panel").forEach(el=>el.classList.toggle("workspace-hidden",project));
 document.body.dataset.workspace=project?"catalog":"viewer";
}
function toggleSidebar(){
 document.body.classList.toggle("sidebar-collapsed");
 setTimeout(()=>map.resize(),220);
}
function toggleBasemapGallery(){
 qs("#basemap-gallery").classList.toggle("hidden");
 const current=getBasemap?getBasemap():"satellite";
 qsa("[data-basemap]").forEach(b=>b.classList.toggle("active",b.dataset.basemap===current));
}
function chooseBasemap(name){
 if(setBasemap)setBasemap(name);
 qsa("[data-basemap]").forEach(b=>b.classList.toggle("active",b.dataset.basemap===name));
 qs("#basemap-gallery").classList.add("hidden");
 status(name==="satellite"?"Mapa base: Imágenes":"Mapa base: Calles");
}
function toggleAttributeTable(kind){
 const panel=qs("#attribute-table"),willOpen=panel.classList.contains("hidden");
 panel.classList.toggle("hidden");
 if(willOpen)renderAttributeTable(kind||"projects");
 setTimeout(()=>map.resize(),220);
}
function renderAttributeTable(kind="projects"){
 qsa("[data-table]").forEach(b=>b.classList.toggle("active",b.dataset.table===kind));
 const head=qs("#attribute-thead"),body=qs("#attribute-tbody");
 qs("#table-project-count").textContent=state.projects.length;
 qs("#table-draw-count").textContent=sketch.features.length;
 if(kind==="projects"){
  head.innerHTML="<tr><th>Proyecto</th><th>Servicio</th><th>Cliente</th><th>Ubicación</th><th>Fecha</th><th>Acceso</th></tr>";
  body.innerHTML=state.projects.map(p=>'<tr data-project-row="'+esc(p.id)+'"><td><button class="table-link">'+esc(p.name)+'</button></td><td>'+esc(p.service)+'</td><td>'+esc(p.client)+'</td><td>'+esc(p.location)+'</td><td>'+esc(p.captureDate)+'</td><td>Público</td></tr>').join("")||'<tr><td colspan="6">Sin proyectos.</td></tr>';
  qsa("[data-project-row]",body).forEach(r=>r.onclick=()=>showProject(r.dataset.projectRow));
 }else{
  head.innerHTML="<tr><th>#</th><th>Nombre</th><th>Geometría</th><th>Detalle</th></tr>";
  body.innerHTML=sketch.features.map((f,i)=>{const g=f.geometry.type,n=f.properties?.name||"Selección";let d="";if(g==="Point")d=f.geometry.coordinates[1].toFixed(6)+", "+f.geometry.coordinates[0].toFixed(6);if(g==="LineString")d=turf.length(f,{units:"kilometers"}).toFixed(3)+" km";if(g==="Polygon")d=(turf.area(f)/10000).toFixed(4)+" ha";return '<tr data-draw-row="'+i+'"><td>'+(i+1)+'</td><td><button class="table-link">'+esc(n)+'</button></td><td>'+esc(g)+'</td><td>'+esc(d)+'</td></tr>'}).join("")||'<tr><td colspan="4">No hay dibujos.</td></tr>';
  qsa("[data-draw-row]",body).forEach(r=>r.onclick=()=>fitFeature(sketch.features[+r.dataset.drawRow]));
 }
}
function closeProjectDrawer(){qs("#project-drawer").classList.add("hidden")}
function openView(view,button){
 qsa(".portal-nav button").forEach(b=>b.classList.toggle("active",b===button));
 if(view==="catalog"){setWorkspace("catalog");qs("#catalog-panel").scrollIntoView({behavior:"smooth"});return}
 if(view==="viewer"){setWorkspace("viewer");qs("#map").focus?.();status("Visor activo");return}
 if(view==="dashboard")showDashboard();
 if(view==="stories")showStories();
 if(view==="models")showModels();
}
function openModal(title,subtitle,html){qs("#portal-modal-title").textContent=title;qs("#portal-modal-subtitle").textContent=subtitle||"";qs("#portal-modal-body").innerHTML=html;qs("#portal-modal").classList.remove("hidden")}
function closeModal(){qs("#portal-modal").classList.add("hidden");qs("#portal-modal-body").innerHTML=""}
async function loadProjects(){
 try{const r=await fetch("./projects.json",{cache:"no-cache"});if(!r.ok)throw Error("HTTP "+r.status);const data=await r.json();state.projects=(data.projects||[]).filter(p=>p.access==="public");setupFilters();filterProjects();syncProjectMap();if(qs("#table-project-count"))qs("#table-project-count").textContent=state.projects.length;status(state.projects.length+" proyectos públicos cargados")}
 catch(e){qs("#project-list").innerHTML='<div class="error-state">No fue posible cargar projects.json.</div>';status("Error cargando proyectos","error")}
}
function unique(key,arr=state.projects){return [...new Set(arr.flatMap(p=>Array.isArray(p[key])?p[key]:[p[key]]).filter(Boolean))].sort()}
function fillSelect(id,values,label){const s=qs(id);s.innerHTML='<option value="">'+label+'</option>'+values.map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("");s.onchange=filterProjects}
function setupFilters(){
 fillSelect("#filter-service",unique("service"),"Servicio");fillSelect("#filter-client",unique("client"),"Cliente");fillSelect("#filter-location",unique("location"),"Ubicación");fillSelect("#filter-date",unique("captureDate"),"Fecha");fillSelect("#filter-product",unique("products"),"Producto");
 qs("#project-search").oninput=filterProjects;
 const cats=[["all","Todos"],["fotogrametria","Fotogrametría"],["lidar","LiDAR"],["inspecciones","Inspecciones"],["monitoreo","Monitoreo"],["modelos-3d","Modelos 3D"],["cartografia","Cartografía"]];
 qs("#category-tabs").innerHTML=cats.map(([v,l])=>'<button data-cat="'+v+'" class="'+(v==="all"?"active":"")+'">'+l+'</button>').join("");
 qsa("#category-tabs button").forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;qsa("#category-tabs button").forEach(x=>x.classList.toggle("active",x===b));filterProjects()});
}
function filterProjects(){
 const q=qs("#project-search").value.trim().toLowerCase(), service=qs("#filter-service").value,client=qs("#filter-client").value,loc=qs("#filter-location").value,date=qs("#filter-date").value,prod=qs("#filter-product").value;
 state.filtered=state.projects.filter(p=>{
  const hay=[p.name,p.description,p.client,p.location,p.service,...(p.products||[])].join(" ").toLowerCase();
  return (!q||hay.includes(q))&&(!service||p.service===service)&&(!client||p.client===client)&&(!loc||p.location===loc)&&(!date||p.captureDate===date)&&(!prod||(p.products||[]).includes(prod))&&(state.category==="all"||p.category===state.category);
 });renderProjects(); if(qs("#attribute-table")&&!qs("#attribute-table").classList.contains("hidden")&&qs("[data-table].active")?.dataset.table==="projects")renderAttributeTable("projects");
}
function renderProjects(){
 qs("#project-count").textContent=state.filtered.length;
 qs("#project-list").innerHTML=state.filtered.length?state.filtered.map(p=>'<article class="project-card" data-id="'+esc(p.id)+'"><div><span class="access public">Público</span><strong>'+esc(p.name)+'</strong><small>'+esc(p.service)+' · '+esc(p.location)+'</small></div><button class="project-open" data-id="'+esc(p.id)+'">Ver</button></article>').join(""):'<div class="empty">No hay proyectos con esos filtros.</div>';
 qsa(".project-open").forEach(b=>b.onclick=()=>showProject(b.dataset.id));
}
function showProject(id){
 const p=state.projects.find(x=>x.id===id);if(!p)return;
 const rows=[["Ubicación",p.location],["Captura",p.captureDate],["Servicio",p.service],["Cliente",p.client],["Métodos",(p.methods||[]).join(", ")],["Equipos",(p.equipment||[]).join(", ")||"—"],["Productos",(p.products||[]).join(", ")],["Sistema de coordenadas",p.crs],["Acceso","Público"]];
 qs("#drawer-title").textContent=p.name;
 qs("#drawer-body").innerHTML='<p class="drawer-description">'+esc(p.description)+'</p><dl class="drawer-meta">'+rows.map(r=>'<div><dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd></div>').join("")+'</dl><div class="drawer-actions"><button id="project-fly" class="primary">Ubicar en mapa</button>'+(p.model?'<button id="project-model">Abrir modelo 3D</button>':'')+'</div>';
 qs("#project-drawer").classList.remove("hidden");
 qs("#project-fly").onclick=()=>{setWorkspace("viewer");map.flyTo({center:p.coordinates,zoom:16,pitch:25});setTimeout(()=>map.resize(),120)};
 if(p.model)qs("#project-model").onclick=()=>showModel(p);
}
function syncProjectMap(){
 if(!map.loaded())return setTimeout(syncProjectMap,300);
 const fc={type:"FeatureCollection",features:state.projects.filter(p=>p.coordinates).map(p=>({type:"Feature",properties:{name:p.name,type:p.service,id:p.id},geometry:{type:"Point",coordinates:p.coordinates}}))};
 if(map.getSource("p"))map.getSource("p").setData(fc);
}
function mapSearch(){
 const q=qs("#map-search").value.trim();if(!q)return;
 const nums=q.split(/[ ,;]+/).map(Number).filter(Number.isFinite);
 if(nums.length>=2&&Math.abs(nums[0])<=90&&Math.abs(nums[1])<=180){map.flyTo({center:[nums[1],nums[0]],zoom:17});status("Coordenada localizada");return}
 const p=state.projects.find(x=>(x.name+" "+x.location).toLowerCase().includes(q.toLowerCase()));
 if(p){map.flyTo({center:p.coordinates,zoom:16});status("Proyecto localizado: "+p.name)}else status("Sin coincidencias en proyectos públicos","empty");
}
function toggleFullscreen(){if(!document.fullscreenElement)qs(".app-shell").requestFullscreen?.();else document.exitFullscreen?.()}
function editActive(){
 const f=sketch.active;if(!f)return status("Selecciona o crea una geometría para editar","empty");
 const idx=sketch.features.indexOf(f);if(idx>=0)sketch.features.splice(idx,1);
 if(f.geometry.type==="LineString"){activateTool("line");sketch.coords=f.geometry.coordinates.map(c=>[...c])}
 else if(f.geometry.type==="Polygon"){activateTool("polygon");sketch.coords=f.geometry.coordinates[0].slice(0,-1).map(c=>[...c])}
 else {activateTool("point");sketch.coords=[]}
 sketch.active=null;redraw();status("Edición activa: ajusta deshaciendo/agregando vértices y pulsa Finalizar");
}
window.ivRenderResults=(features,active)=>{
 const box=qs("#draw-results");if(!box)return; if(qs("#table-draw-count"))qs("#table-draw-count").textContent=features.length;
 box.innerHTML=features.length?features.map((f,i)=>{const t=f.geometry.type,n=f.properties?.name||({Point:"Punto",LineString:"Línea",Polygon:"Polígono"}[t]||t);return '<div class="result-row"><button data-zoom="'+i+'" title="Acercar">'+esc(n)+'</button><small>'+esc(t)+'</small><button data-remove="'+i+'" aria-label="Borrar">×</button></div>'}).join(""):'<div class="empty">Aún no hay geometrías.</div>';
 qsa("[data-zoom]",box).forEach(b=>b.onclick=()=>fitFeature(features[+b.dataset.zoom]));
 qsa("[data-remove]",box).forEach(b=>b.onclick=()=>{const f=features[+b.dataset.remove];const j=sketch.features.indexOf(f);if(j>=0)sketch.features.splice(j,1);if(sketch.active===f)sketch.active=null;redraw()});
};
function downloadNotes(){
 const notes=sketch.features.filter(f=>f.properties?.name==="Anotación");if(!notes.length)return status("No hay anotaciones para descargar","empty");
 dl(new Blob([JSON.stringify({type:"FeatureCollection",features:notes},null,2)],{type:"application/geo+json"}),"island-view-anotaciones.geojson");
}
async function importLocal(e){
 const file=e.target.files?.[0];if(!file)return;status("Cargando "+file.name);
 try{const text=await file.text(),ext=file.name.split(".").pop().toLowerCase();let fc;
  if(ext==="geojson"||ext==="json"){const g=JSON.parse(text);fc=g.type==="FeatureCollection"?g:{type:"FeatureCollection",features:[g]}}
  else if(ext==="kml")fc=parseKML(text);
  else if(ext==="gpx")fc=parseGPX(text);
  else if(ext==="csv")fc=parseCSV(text);
  else throw Error("Formato no compatible");
  addImported(fc);status(fc.features.length+" elementos cargados desde "+file.name);
 }catch(err){status("No se pudo cargar: "+err.message,"error")}finally{e.target.value=""}
}
function parseKML(text){const x=new DOMParser().parseFromString(text,"text/xml"),fs=[];x.querySelectorAll("Placemark").forEach(pm=>{const name=pm.querySelector("name")?.textContent||"KML";const c=pm.querySelector("coordinates")?.textContent.trim();if(!c)return;const pts=c.split(/\s+/).map(v=>v.split(",").slice(0,2).map(Number));let g;if(pm.querySelector("Point"))g={type:"Point",coordinates:pts[0]};else if(pm.querySelector("LineString"))g={type:"LineString",coordinates:pts};else if(pm.querySelector("Polygon"))g={type:"Polygon",coordinates:[pts]};if(g)fs.push({type:"Feature",properties:{name},geometry:g})});return {type:"FeatureCollection",features:fs}}
function parseGPX(text){const x=new DOMParser().parseFromString(text,"text/xml"),fs=[];x.querySelectorAll("wpt").forEach(n=>fs.push({type:"Feature",properties:{name:n.querySelector("name")?.textContent||"GPX"},geometry:{type:"Point",coordinates:[+n.getAttribute("lon"),+n.getAttribute("lat")]}}));x.querySelectorAll("trkseg").forEach(seg=>{const pts=[...seg.querySelectorAll("trkpt")].map(n=>[+n.getAttribute("lon"),+n.getAttribute("lat")]);if(pts.length>1)fs.push({type:"Feature",properties:{name:"Track GPX"},geometry:{type:"LineString",coordinates:pts}})});return {type:"FeatureCollection",features:fs}}
function parseCSV(text){const lines=text.trim().split(/\r?\n/),head=lines.shift().split(",").map(s=>s.trim().toLowerCase()),lat=head.findIndex(h=>["lat","latitude","y"].includes(h)),lon=head.findIndex(h=>["lon","lng","longitude","x"].includes(h));if(lat<0||lon<0)throw Error("CSV requiere columnas lat/lon");return {type:"FeatureCollection",features:lines.map((l,i)=>{const v=l.split(",");return {type:"Feature",properties:{name:"CSV "+(i+1)},geometry:{type:"Point",coordinates:[+v[lon],+v[lat]]}}}).filter(f=>f.geometry.coordinates.every(Number.isFinite))}}
function addImported(fc){
 state.imported.features.push(...fc.features);const id="local-import";
 if(!map.getSource(id)){map.addSource(id,{type:"geojson",data:state.imported});map.addLayer({id:id+"-fill",type:"fill",source:id,filter:["==",["geometry-type"],"Polygon"],paint:{"fill-color":"#18a9c6","fill-opacity":.22}});map.addLayer({id:id+"-line",type:"line",source:id,filter:["match",["geometry-type"],["LineString","Polygon"],true,false],paint:{"line-color":"#8eeaff","line-width":3}});map.addLayer({id:id+"-point",type:"circle",source:id,filter:["==",["geometry-type"],"Point"],paint:{"circle-color":"#18a9c6","circle-radius":6,"circle-stroke-color":"#fff","circle-stroke-width":2}})}
 else map.getSource(id).setData(state.imported);
 if(fc.features.length)fitFeature(fc);
}
async function loadLayerRegistry(){
 if(!map.loaded())return setTimeout(loadLayerRegistry,300);
 const box=qs("#configured-layers"),dot=qs("#layer-registry-status");
 try{
  const r=await fetch("./layers.json",{cache:"no-cache"});if(!r.ok)throw Error("HTTP "+r.status);const data=await r.json();window.IV_LAYER_CONFIG=data;
  const entries=data.rasters||[];box.innerHTML="";
  for(const cfg of entries){
   const row=document.createElement("label");row.className="layer-row";
   if(cfg.type==="wms"&&!cfg.layer){row.innerHTML='<span>◫</span><span>'+esc(cfg.title||cfg.id)+'<small> · WMS por capacidades</small></span>';box.append(row);continue}
   const id="cfg-"+String(cfg.id).replace(/[^a-z0-9_-]/gi,"-");
   let tiles=[];
   if(cfg.type==="xyz"&&cfg.url)tiles=[cfg.url];
   if(cfg.type==="wmts"&&cfg.tileUrlTemplate)tiles=[cfg.tileUrlTemplate];
   if(cfg.type==="wms"&&cfg.baseUrl&&cfg.layer)tiles=[cfg.baseUrl+"?service=WMS&version=1.1.1&request=GetMap&layers="+encodeURIComponent(cfg.layer)+"&styles=&bbox={bbox-epsg-3857}&width=256&height=256&srs=EPSG:3857&format=image/png&transparent=true"];
   if(!cfg.enabled||!tiles.length)continue;
   if(!map.getSource(id)){map.addSource(id,{type:"raster",tiles,tileSize:256,attribution:cfg.attribution||""});map.addLayer({id,type:"raster",source:id,layout:{visibility:"none"},paint:{"raster-opacity":cfg.opacity??0.9}})}
   row.innerHTML='<input type="checkbox"><span>'+esc(cfg.title||cfg.id)+'</span>';row.querySelector("input").onchange=e=>map.setLayoutProperty(id,"visibility",e.target.checked?"visible":"none");box.append(row);
  }
  if(!box.children.length)box.innerHTML='<div class="empty">No hay capas raster públicas activas.</div>';dot.className="dot ok";
 }catch(e){box.innerHTML='<div class="error-state">No se pudo leer layers.json.</div>';dot.className="dot fail"}
}
function showDashboard(){
 openModal("Paneles de monitoreo","Datos de ejemplo · sustituir mediante projects.json / fuentes reales",'<div class="demo-banner">EJEMPLO — estos indicadores no son datos operativos reales.</div><div class="kpi-grid"><article><small>Misiones</small><strong>7</strong><span>Ejemplo</span></article><article><small>Cobertura</small><strong>7 ha</strong><span>Ejemplo</span></article><article><small>Productos</small><strong>14</strong><span>Ejemplo</span></article><article><small>Estado</small><strong>Activo</strong><span>Ejemplo</span></article></div><div class="dashboard-grid"><section><h3>Monitoreo térmico</h3><div class="spark-bars">'+[42,65,51,78,70,55,38].map((v,i)=>'<i style="height:'+v+'%" title="Dato de ejemplo"></i>').join("")+'</div><small>Serie ilustrativa, no medición real.</small></section><section><h3>Ortomosaicos periódicos</h3><p>Espacio preparado para fechas, cobertura, estado de procesamiento y enlaces a capas.</p></section><section><h3>Inspecciones</h3><p>Tarjetas configurables para hallazgos, evidencias y estado.</p></section><section><h3>Inventario 3D</h3><p>'+state.projects.filter(p=>p.model).length+' modelo(s) público(s) configurado(s).</p></section></div>');
}
function showStories(){
 openModal("Historias geoespaciales","Narrativa propia de Island View SAS",'<div class="stories"><article><span>MONITOREO</span><h3>Del vuelo al seguimiento territorial</h3><p>Ejemplo de historia para combinar narrativa, imágenes autorizadas, mapas y productos periódicos.</p><button data-story="magic-garden">Ver proyecto relacionado</button></article><article><span>FOTOGRAMETRÍA</span><h3>Ortomosaicos que documentan el territorio</h3><p>Plantilla para explicar captura, procesamiento, control de calidad y resultados.</p><button data-story="lynval-cove">Ver proyecto relacionado</button></article><article><span>3D</span><h3>Patrimonio y modelos interactivos</h3><p>Espacio para recorridos narrativos enlazados con modelos GLB optimizados.</p><button data-model-story>Galería 3D</button></article></div>');
 qsa("[data-story]").forEach(b=>b.onclick=()=>showProject(b.dataset.story));qs("[data-model-story]")?.addEventListener("click",showModels);
}
function showModels(){
 const models=state.projects.filter(p=>p.model);
 openModal("Galería 3D / AR","Los modelos pesados no se cargan hasta que el usuario los abre",models.length?'<div class="model-grid">'+models.map(p=>'<article><div class="model-thumb">3D</div><strong>'+esc(p.name)+'</strong><small>'+esc(p.location)+' · '+esc(p.model.format)+' · '+p.model.sizeMB+' MB</small><p>'+esc(p.model.scale)+'</p><button data-model="'+esc(p.id)+'">Ver en 3D</button></article>').join("")+'</div>':'<div class="empty">No hay modelos públicos configurados.</div>');
 qsa("[data-model]").forEach(b=>b.onclick=()=>showModel(state.projects.find(p=>p.id===b.dataset.model)));
}
function showModel(p){
 if(!p?.model)return;
 openModal(p.name,"Visor 3D · "+p.model.format+' · '+p.model.sizeMB+' MB','<div class="model-view-wrap"><div id="model-warning" class="demo-banner">'+(p.model.sizeMB>25?"Modelo pesado: puede tardar en móvil.":"Modelo optimizado para demostración web.")+'</div><model-viewer id="iv-model" src="'+esc(p.model.src)+'" camera-controls auto-rotate shadow-intensity="1" ar ar-modes="webxr scene-viewer quick-look" loading="eager" alt="'+esc(p.name)+'"><button slot="ar-button" id="ar-button" class="ar-button hidden">Ver en AR</button></model-viewer><p class="help">AR se muestra solo si model-viewer informa compatibilidad en este dispositivo. En iOS, Quick Look puede requerir USDZ según el flujo del navegador.</p></div>');
 const mv=qs("#iv-model"),ar=qs("#ar-button");mv.addEventListener("load",()=>{if(mv.canActivateAR)ar.classList.remove("hidden")});
}
map.on("style.load",()=>setTimeout(()=>{loadLayerRegistry();syncProjectMap()},0));
insertUI();loadProjects();loadLayerRegistry();window.ivRenderResults(sketch.features,sketch.active);
})();