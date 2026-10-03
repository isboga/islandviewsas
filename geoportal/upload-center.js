(() => {
"use strict";
const TYPES=[
 ["orthomosaic","Ortomosaico","COG/GeoTIFF, WMS o XYZ"],
 ["3d","Modelo 3D","GLB/GLTF o visor web"],
 ["pointcloud","Nube de puntos","LAS/LAZ, Potree o DroneDB"],
 ["elevation","DSM / DTM","COG/GeoTIFF, WMS o XYZ"],
 ["thermal","Térmico","Ortomosaico o imágenes térmicas"],
 ["vector","Vector","GeoJSON, KML, GPX o SHP"],
 ["media","Fotografías / 360","JPG, PNG o recorrido 360"],
 ["document","Documento","PDF, informe o ficha técnica"]
];
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const localProducts=[];
let projects=[],published=[],step=1,draft={};
function uid(){return "ivp-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)}
async function load(){
 try{projects=(await (await fetch("./projects.json",{cache:"no-cache"})).json()).projects||[]}catch(e){}
 try{published=(await (await fetch("./products.json",{cache:"no-cache"})).json()).products||[]}catch(e){}
 inject();
 await loadDrafts();
 refreshCounts();
}
function inject(){
 const actions=$(".appbar-actions");if(!actions||$("#product-upload-open"))return;
 const b=document.createElement("button");b.id="product-upload-open";b.className="appbar-button upload-product-button";b.textContent="Cargar producto";actions.prepend(b);b.onclick=open;
 const host=$(".map-wrap");
 host.insertAdjacentHTML("beforeend",'<div id="product-upload-modal" class="modal hidden product-upload-modal"><div class="modal-card upload-card"><div class="modal-head"><div><strong>Centro de carga</strong><small>Productos derivados de proyectos Island View</small></div><button id="product-upload-close" aria-label="Cerrar">×</button></div><div class="upload-progress"><i data-step="1"></i><i data-step="2"></i><i data-step="3"></i><i data-step="4"></i></div><div id="upload-body" class="upload-body"></div><div class="upload-footer"><button id="upload-back">Atrás</button><span id="upload-note"></span><button id="upload-next" class="primary">Continuar</button></div></div></div>');
 $("#product-upload-close").onclick=close;$("#product-upload-modal").onclick=e=>{if(e.target.id==="product-upload-modal")close()};
 $("#upload-back").onclick=()=>{if(step>1){readStep();step--;render()}else close()};
 $("#upload-next").onclick=next;
}
function open(){step=1;draft={id:uid(),access:"private",status:"draft"};$("#product-upload-modal").classList.remove("hidden");render()}
function close(){$("#product-upload-modal").classList.add("hidden")}
function render(){
 $$(".upload-progress i").forEach(i=>i.classList.toggle("active",+i.dataset.step<=step));
 $("#upload-back").textContent=step===1?"Cancelar":"Atrás";
 $("#upload-next").textContent=step===4?"Guardar producto":"Continuar";
 const body=$("#upload-body"),note=$("#upload-note");note.textContent="";
 if(step===1){
  body.innerHTML='<div class="upload-step"><div class="step-kicker">1 · DESTINO</div><h3>¿A qué proyecto pertenece?</h3><p>Todos los productos quedan agrupados dentro de su proyecto. Después podrás filtrarlos por tipo.</p><label>Proyecto<select id="up-project" class="field"><option value="">Seleccionar proyecto…</option>'+projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join("")+'<option value="__new">＋ Crear borrador de proyecto</option></select></label><div id="new-project-fields" class="upload-subpanel hidden"><label>Nombre del proyecto<input id="up-new-name" class="field" placeholder="Nombre del proyecto"></label><label>Ubicación<input id="up-new-location" class="field" placeholder="San Andrés Isla"></label></div></div>';
  $("#up-project").value=draft.projectId||"";$("#up-project").onchange=e=>$("#new-project-fields").classList.toggle("hidden",e.target.value!=="__new");
  if(draft.projectId==="__new")$("#new-project-fields").classList.remove("hidden");
 }else if(step===2){
  body.innerHTML='<div class="upload-step"><div class="step-kicker">2 · PRODUCTO</div><h3>¿Qué estás cargando?</h3><div class="product-type-grid">'+TYPES.map(([id,n,d])=>'<button class="product-type '+(draft.type===id?"selected":"")+'" data-type="'+id+'"><span class="product-type-icon">'+icon(id)+'</span><strong>'+n+'</strong><small>'+d+'</small></button>').join("")+'</div></div>';
  $$("[data-type]",body).forEach(b=>b.onclick=()=>{$$("[data-type]",body).forEach(x=>x.classList.remove("selected"));b.classList.add("selected");draft.type=b.dataset.type});
 }else if(step===3){
  const recommendation=recommend(draft.type);
  body.innerHTML='<div class="upload-step"><div class="step-kicker">3 · ORIGEN Y PUBLICACIÓN</div><h3>¿Dónde está el producto?</h3><div class="recommendation"><strong>Recomendado para '+esc(typeName(draft.type))+':</strong> '+esc(recommendation)+'</div><div class="source-options"><label><input type="radio" name="up-source" value="local" '+((draft.sourceKind||"local")==="local"?"checked":"")+'> <span><strong>Archivo local</strong><small>Preparar y validar desde este dispositivo</small></span></label><label><input type="radio" name="up-source" value="service" '+(draft.sourceKind==="service"?"checked":"")+'> <span><strong>URL / servicio publicado</strong><small>WMS, XYZ, GLB, Potree, COG u otro endpoint</small></span></label><label><input type="radio" name="up-source" value="dronedb" '+(draft.sourceKind==="dronedb"?"checked":"")+'> <span><strong>DroneDB</strong><small>Registrar dataset o capa publicada</small></span></label></div><div id="source-fields"></div></div>';
  $$('input[name="up-source"]').forEach(r=>r.onchange=()=>{draft.sourceKind=r.value;renderSourceFields()});renderSourceFields();
 }else{
  const p=projects.find(x=>x.id===draft.projectId),newName=draft.newProjectName;
  body.innerHTML='<div class="upload-step"><div class="step-kicker">4 · METADATOS Y ACCESO</div><h3>Revisar antes de guardar</h3><div class="upload-summary"><div><small>Proyecto</small><strong>'+esc(p?.name||newName||"Nuevo proyecto")+'</strong></div><div><small>Tipo</small><strong>'+esc(typeName(draft.type))+'</strong></div></div><div class="upload-form-grid"><label>Nombre del producto<input id="up-name" class="field" value="'+esc(draft.name||defaultName())+'"></label><label>Fecha de captura<input id="up-date" class="field" type="date" value="'+esc(draft.captureDate||"")+'"></label><label>CRS / EPSG<input id="up-crs" class="field" placeholder="EPSG:4326 / EPSG:9377…" value="'+esc(draft.crs||"")+'"></label><label>Resolución / GSD<input id="up-gsd" class="field" placeholder="Ej. 2.5 cm/px" value="'+esc(draft.gsd||"")+'"></label><label>Acceso<select id="up-access" class="field"><option value="private">Privado / cliente</option><option value="public">Público</option></select></label><label>Estado<select id="up-status" class="field"><option value="draft">Borrador</option><option value="processing">Procesando</option><option value="ready">Listo</option><option value="published">Publicado</option></select></label></div><label>Descripción<textarea id="up-description" class="field" rows="3" placeholder="Descripción técnica breve">'+esc(draft.description||"")+'</textarea></label><div class="privacy-warning">Los productos privados se guardan únicamente como borrador local en este navegador. No se escriben en el repositorio público.</div></div>';
  $("#up-access").value=draft.access||"private";$("#up-status").value=draft.status||"draft";
  note.textContent="Se guardará en el registro de carga de este dispositivo.";
 }
}
function renderSourceFields(){
 const kind=$('input[name="up-source"]:checked')?.value||"local";draft.sourceKind=kind;const box=$("#source-fields");if(!box)return;
 if(kind==="local")box.innerHTML='<label class="drop-zone">Seleccionar archivo<input id="up-file" type="file"><span id="up-file-name">'+esc(draft.fileName||"GeoTIFF, GLB, LAS/LAZ, GeoJSON, PDF, imágenes…")+'</span></label><p class="source-help">El archivo no se publica automáticamente en GitHub. Se registra para preparación; archivos grandes deben ir a DroneDB, almacenamiento de objetos o un servicio geoespacial.</p>';
 if(kind==="service")box.innerHTML='<div class="upload-form-grid"><label>Tipo de servicio<select id="up-service-type" class="field"><option>WMS</option><option>XYZ</option><option>WMTS</option><option>COG</option><option>GLB</option><option>Potree</option><option>URL</option></select></label><label>URL / endpoint<input id="up-url" class="field" placeholder="https://…" value="'+esc(draft.url||"")+'"></label></div>';
 if(kind==="dronedb")box.innerHTML='<label>Dataset / capa DroneDB<input id="up-url" class="field" placeholder="URL del dataset o nombre de capa" value="'+esc(draft.url||"")+'"></label><p class="source-help">El geoportal conservará la referencia al producto. No almacenes tokens ni credenciales aquí.</p>';
 $("#up-file")?.addEventListener("change",e=>{const f=e.target.files?.[0];if(f){draft.fileName=f.name;draft.fileSize=f.size;draft.fileType=f.type;draft.sessionFile=f;$("#up-file-name").textContent=f.name+" · "+human(f.size)}});
}
function readStep(){
 if(step===1){draft.projectId=$("#up-project")?.value||draft.projectId;if(draft.projectId==="__new"){draft.newProjectName=$("#up-new-name")?.value||draft.newProjectName;draft.newProjectLocation=$("#up-new-location")?.value||draft.newProjectLocation}}
 if(step===3){draft.sourceKind=$('input[name="up-source"]:checked')?.value||draft.sourceKind;if(draft.sourceKind!=="local"){draft.url=$("#up-url")?.value||draft.url;draft.serviceType=$("#up-service-type")?.value||draft.serviceType}}
 if(step===4){draft.name=$("#up-name")?.value;draft.captureDate=$("#up-date")?.value;draft.crs=$("#up-crs")?.value;draft.gsd=$("#up-gsd")?.value;draft.access=$("#up-access")?.value;draft.status=$("#up-status")?.value;draft.description=$("#up-description")?.value}
}
async function next(){
 readStep();
 if(step===1&&!draft.projectId)return warn("Selecciona el proyecto de destino.");
 if(step===1&&draft.projectId==="__new"&&!draft.newProjectName)return warn("Escribe el nombre del nuevo proyecto.");
 if(step===2&&!draft.type)return warn("Selecciona el tipo de producto.");
 if(step===3&&draft.sourceKind==="local"&&!draft.fileName)return warn("Selecciona un archivo.");
 if(step===3&&draft.sourceKind!=="local"&&!draft.url)return warn("Indica la URL, endpoint o dataset.");
 if(step<4){step++;render();return}
 if(!draft.name)return warn("Escribe el nombre del producto.");
 await saveDraft();close();notify("Producto registrado en "+(draft.access==="public"?"borrador público":"área privada")+" · "+draft.name);refreshCounts();
}
function warn(t){$("#upload-note").textContent=t;$("#upload-note").className="upload-error"}
function notify(t){const el=$("#portal-status");if(el){el.textContent=t;el.dataset.type="info"}}
function typeName(id){return TYPES.find(x=>x[0]===id)?.[1]||id}
function icon(id){return ({orthomosaic:"▦","3d":"3D",pointcloud:"•••",elevation:"△",thermal:"◉",vector:"◇",media:"▣",document:"≡"})[id]||"□"}
function defaultName(){return typeName(draft.type)+" · "+(draft.captureDate||new Date().toISOString().slice(0,10))}
function recommend(t){return ({orthomosaic:"COG/teselas o WMS/XYZ; GeoTIFF original en almacenamiento externo.",pointcloud:"LAS/LAZ original en almacenamiento y Potree/DroneDB para visualización web.","3d":"GLB optimizado para web; modelo maestro en almacenamiento externo.",elevation:"COG o WMS/XYZ para DSM/DTM.",thermal:"Ortomosaico térmico como WMS/COG y originales radiométricos preservados.",vector:"GeoJSON para web y SHP/GPKG como entregable.",media:"Imágenes optimizadas para web y originales fuera de GitHub.",document:"PDF optimizado; documentos privados fuera del repositorio público."})[t]||"Servicio web o almacenamiento externo según tamaño."}
function human(n){if(!n)return"";const u=["B","KB","MB","GB"];let i=0;while(n>=1024&&i<u.length-1){n/=1024;i++}return n.toFixed(i?1:0)+" "+u[i]}
function db(){return new Promise((res,rej)=>{const r=indexedDB.open("island-view-geoportal",1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("products"))r.result.createObjectStore("products",{keyPath:"id"})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function saveDraft(){
 const record={...draft,sessionFile:undefined,updatedAt:new Date().toISOString()};
 if(draft.projectId==="__new")record.projectDraft={name:draft.newProjectName,location:draft.newProjectLocation};
 const d=await db();await new Promise((res,rej)=>{const tx=d.transaction("products","readwrite");tx.objectStore("products").put(record);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});d.close();
 const i=localProducts.findIndex(x=>x.id===record.id);if(i>=0)localProducts.splice(i,1);localProducts.push(record);
}
async function loadDrafts(){try{const d=await db();const rows=await new Promise((res,rej)=>{const r=d.transaction("products").objectStore("products").getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});localProducts.push(...rows);d.close()}catch(e){}}
function refreshCounts(){
 const b=$("#product-upload-open");if(b)b.title=(published.length+localProducts.length)+" productos registrados";
}
function projectProducts(projectId){return [...published,...localProducts].filter(p=>p.projectId===projectId)}
function renderProjectProducts(projectId){
 const items=projectProducts(projectId);if(!items.length)return '<section class="drawer-products"><h4>Productos derivados</h4><div class="empty">Sin productos registrados.</div></section>';
 const groups=TYPES.map(([id,label])=>[label,items.filter(p=>p.type===id)]).filter(x=>x[1].length);
 return '<section class="drawer-products"><h4>Productos derivados <span>'+items.length+'</span></h4>'+groups.map(([label,rows])=>'<div class="product-group"><strong>'+esc(label)+'</strong>'+rows.map(p=>'<button class="product-item" data-product-id="'+esc(p.id)+'"><span>'+icon(p.type)+'</span><span><b>'+esc(p.name)+'</b><small>'+esc(p.format||p.serviceType||p.source?.kind||p.sourceKind||"Producto")+' · '+esc(p.status||"published")+'</small></span></button>').join("")+'</div>').join("")+'</section>';
}
function exportRegistry(){
 const data={schemaVersion:1,generatedAt:new Date().toISOString(),products:localProducts.map(x=>({...x,sessionFile:undefined}))};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="island-view-products-staging.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)
}
window.IVProductCenter={open,projectProducts,renderProjectProducts,exportRegistry,refresh:refreshCounts};
load();
})();