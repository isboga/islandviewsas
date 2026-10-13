/* Island View GIS Studio: public DroneDB URL bridge + RLS-scoped project data exchange.
   No access tokens or private datasets are sent to web.rustgis.app. */
(()=>{"use strict";
const $=s=>document.querySelector(s);
const els={projects:$("#iv-projects"),layers:$("#iv-layer-list"),status:$("#iv-studio-status"),account:$("#iv-account"),selected:$("#iv-selected-project"),summary:$("#iv-data-summary"),publicBtn:$("#iv-open-public"),exportBtn:$("#iv-export"),importBtn:$("#iv-import"),file:$("#iv-import-file"),login:$("#iv-login"),email:$("#iv-email"),password:$("#iv-password"),signin:$("#iv-signin"),signout:$("#iv-signout")};
const allowed=new Set([".geojson",".json",".csv",".tif",".tiff",".asc",".rgis"]);
const q=new URLSearchParams(location.search);let publicProjects=[],dbProjects=[],project=null,assets=[],layers=[],annotations=[],session=null,sb=null,selected=new Set();
function safe(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function status(message,isError=false){els.status.textContent=message;els.status.classList.toggle("iv-error",isError)}
function isPublic(p){return p?.access==="public"||p?.is_public===true}
function cleanName(v){return String(v||"capa").replace(/[^a-zA-Z0-9_\-]/g,"_").slice(0,70)}
function download(name,obj){const b=new Blob([JSON.stringify(obj,null,2)],{type:"application/geo+json"});const url=URL.createObjectURL(b);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function feature(geometry,properties){return {type:"Feature",geometry,properties}}
function hasGeo(g){return !!g&&typeof g==="object"&&typeof g.type==="string"&&g.coordinates!=null}
function geoFeatures(){const out=[];
 if(selected.has("project:location")&&project){
  const c=Array.isArray(project.coordinates)?project.coordinates:Array.isArray(project.center)?project.center:null;
  if(c?.length>=2&&c.every(Number.isFinite)&&Math.abs(c[0])<=180&&Math.abs(c[1])<=90){
   out.push(feature({type:"Point",coordinates:c.slice(0,2)},{iv_name:project.name,iv_type:"project_location",iv_project:project.id,service:project.service||"",description:project.description||"",location:project.location||""}));
  }
 }
 for(const layer of layers)if(selected.has("layer:"+layer.id)){for(const f of layer.features||[])if(hasGeo(f.geometry))out.push(feature(f.geometry,{...f.properties,iv_name:f.name,iv_layer:layer.name,iv_layer_id:layer.id}))}
 if(selected.has("annotations"))for(const a of annotations)if(hasGeo(a.geometry))out.push(feature(a.geometry,{iv_name:a.title,iv_type:a.annotation_type,iv_visibility:a.visibility,...(a.measurement||{})}));
 return out}
function publicUrls(){return assets.filter(a=>selected.has("asset:"+a.path)).map(a=>a.url)}
function updateButtons(){const u=publicUrls(),f=geoFeatures();els.publicBtn.disabled=!u.length;els.exportBtn.disabled=!f.length;els.summary.textContent=u.length+" archivos públicos · "+f.length+" geometrías autorizadas seleccionadas"}
function cardCheck(key,title,meta,checked=false){const label=document.createElement("label");label.className="iv-data-item";const c=document.createElement("input");c.type="checkbox";c.checked=checked;c.addEventListener("change",()=>{c.checked?selected.add(key):selected.delete(key);updateButtons()});const info=document.createElement("span");const name=document.createElement("strong");name.textContent=title;const small=document.createElement("small");small.textContent=meta;info.append(name,small);label.append(c,info);return label}
function renderData(){els.layers.replaceChildren();if(!project){els.layers.textContent="Selecciona un proyecto.";return}
 const center=Array.isArray(project.coordinates)?project.coordinates:Array.isArray(project.center)?project.center:null;
 if(center?.length>=2&&center.every(Number.isFinite)){
  const heading=document.createElement("h3");heading.textContent="Ficha geoespacial del proyecto";els.layers.append(heading);
  els.layers.append(cardCheck("project:location","Ubicación del proyecto",project.name+" · punto de referencia"));
 }
 if(assets.length){const heading=document.createElement("h3");heading.textContent="Archivos DroneDB públicos";els.layers.append(heading);
  for(const a of assets)els.layers.append(cardCheck("asset:"+a.path,a.name,a.path))}
 if(layers.length){const heading=document.createElement("h3");heading.textContent="Capas vectoriales autorizadas";els.layers.append(heading);
  for(const l of layers)els.layers.append(cardCheck("layer:"+l.id,l.name,(l.features||[]).length+" entidades · Supabase RLS"))}
 if(annotations.length){const heading=document.createElement("h3");heading.textContent="Mediciones y anotaciones";els.layers.append(heading);els.layers.append(cardCheck("annotations","Anotaciones del proyecto",annotations.filter(x=>hasGeo(x.geometry)).length+" geometrías"))}
 if(!center?.length&&!assets.length&&!layers.length&&!annotations.length){const p=document.createElement("p");p.textContent="Todavía no hay archivos compatibles publicados o capas autorizadas para este proyecto.";els.layers.append(p)}
 updateButtons();renderManager()}

function renderManager(){
 const list=$("#iv-manage-list");if(!list)return;
 const query=$("#iv-layer-search")?.value?.trim().toLocaleLowerCase("es")||"";
 list.replaceChildren();
 const matching=layers.filter(l=>(l.name+" "+l.geometry_type).toLocaleLowerCase("es").includes(query));
 if(!matching.length){const empty=document.createElement("p");empty.textContent=layers.length?"No se encontraron capas con ese filtro.":"Este proyecto no tiene capas GIS autorizadas todavía.";list.append(empty);return}
 for(const layer of matching){
  const section=document.createElement("section");section.className="iv-managed-layer";
  const top=document.createElement("div");top.className="iv-managed-top";
  const info=document.createElement("div");const name=document.createElement("strong");name.textContent=layer.name;
  const details=document.createElement("small");details.textContent=(layer.features||[]).length+" entidades · "+(layer.geometry_type||"vector")+" · "+(layer.visibility==="public"?"Acceso público":"Acceso del proyecto");
  info.append(name,details);top.append(info);
  const exportButton=document.createElement("button");exportButton.type="button";exportButton.textContent="GeoJSON ↓";exportButton.addEventListener("click",()=>{
   const feats=(layer.features||[]).filter(f=>validGeometry(f.geometry)).map(f=>feature(f.geometry,{...(f.properties||{}),iv_name:f.name,iv_layer:layer.name}));
   if(!feats.length)return status("La capa no tiene geometrías válidas para exportar.",true);
   download("island-view-"+cleanName(project.id)+"-"+cleanName(layer.name)+".geojson",{type:"FeatureCollection",features:feats});
   status("Capa exportada: "+layer.name+" ("+feats.length+" entidades).");
  });top.append(exportButton);section.append(top);
  const controls=document.createElement("div");controls.className="iv-managed-controls";
  const colorLabel=document.createElement("label");colorLabel.textContent="Color";
  const color=document.createElement("input");color.type="color";color.value=/^#[0-9a-f]{6}$/i.test(layer.style?.color||"")?layer.style.color:"#19a6c4";colorLabel.append(color);
  const opacityLabel=document.createElement("label");opacityLabel.textContent="Opacidad";
  const opacity=document.createElement("input");opacity.type="range";opacity.min="0.05";opacity.max="1";opacity.step=".05";opacity.value=Math.max(.05,Math.min(1,Number(layer.style?.opacity??.55)));opacityLabel.append(opacity);
  const save=document.createElement("button");save.type="button";save.textContent="Guardar estilo";save.addEventListener("click",async()=>{
   if(!sb||!session||!project?.dbId)return status("Necesitas una sesión editora para guardar estilos.",true);
   save.disabled=true;
   try{
    const style={...(layer.style||{}),color:color.value,opacity:Number(opacity.value)};
    const {data,error}=await sb.from("project_layers").update({style,updated_at:new Date().toISOString()}).eq("id",layer.id).eq("project_id",project.dbId).select("id,style").maybeSingle();
    if(error)throw error;if(!data)throw Error("No se modificó la capa. Verifica permisos de editor.");
    layer.style=data.style;status("Estilo guardado en "+layer.name+". Actualiza los otros visores para ver el cambio.");
   }catch(e){status("No se pudo guardar el estilo: "+e.message,true)}
   finally{save.disabled=false}
  });
  const rename=document.createElement("button");rename.type="button";rename.textContent="Renombrar";rename.addEventListener("click",async()=>{
   if(!sb||!session||!project?.dbId)return status("Necesitas una sesión editora para renombrar capas.",true);
   const next=prompt("Nuevo nombre de la capa:",layer.name)?.trim();if(!next||next===layer.name)return;
   if(next.length>120)return status("El nombre no puede superar 120 caracteres.",true);
   rename.disabled=true;
   try{
    const {data,error}=await sb.from("project_layers").update({name:next,updated_at:new Date().toISOString()}).eq("id",layer.id).eq("project_id",project.dbId).select("id,name").maybeSingle();
    if(error)throw error;if(!data)throw Error("Sin permiso para cambiar el nombre.");
    layer.name=data.name;renderData();renderManager();status("Capa renombrada correctamente.");
   }catch(e){status("No se pudo renombrar: "+e.message,true)}
   finally{rename.disabled=false}
  });
  controls.append(colorLabel,opacityLabel,save,rename);section.append(controls);list.append(section);
 }
}
async function testConnections(){
 const button=$("#iv-test-connectivity"),box=$("#iv-health-results");button.disabled=true;box.replaceChildren();
 const add=(name,ok,detail)=>{const line=document.createElement("div");line.className="iv-health-line "+(ok?"ok":"fail");const label=document.createElement("strong");label.textContent=(ok?"✓ ":"! ")+name;const info=document.createElement("span");info.textContent=detail;line.append(label,info);box.append(line)};
 try{
  const r=await fetch("../projects.json",{cache:"no-store"});add("Catálogo Island View",r.ok,r.ok?"Archivo de proyectos disponible":"HTTP "+r.status);
 }catch(e){add("Catálogo Island View",false,e.message)}
 if(!sb)add("Supabase",false,"Cliente de autenticación no disponible");
 else{
  try{
   const {error}=await Promise.race([
    sb.from("portal_projects").select("id",{head:true,count:"exact"}).limit(1),
    new Promise((_,reject)=>setTimeout(()=>reject(Error("Tiempo de espera agotado (8 s)")),8000))
   ]);
   add("Supabase",!error,error?"No se pudo consultar: "+error.message:"Consulta permitida por las políticas RLS");
  }catch(e){add("Supabase",false,e.message)}
 }
 if(project?.dronedb&&isPublic(project)){
  try{
   const d=project.dronedb,base=new URL(d.registry||"https://hub.dronedb.app");
   const u=base.origin+"/orgs/"+encodeURIComponent(d.org)+"/ds/"+encodeURIComponent(d.dataset)+"/list";
   const r=await fetch(u,{method:"POST",body:new FormData(),credentials:"omit",signal:AbortSignal.timeout(8000)});
   add("DroneDB público",r.ok,r.ok?"Catálogo accesible desde este navegador":"HTTP "+r.status);
  }catch(e){add("DroneDB público",false,e.message)}
 }else add("DroneDB público",true,"Sin dataset público seleccionado para probar");
 add("RustGIS Web",true,"Enlace configurado; la carga real de archivos debe probarse en RustGIS");
 button.disabled=false;
}
function renderProjects(){els.projects.replaceChildren();for(const p of allProjects()){const opt=document.createElement("option");opt.value=p.id;opt.textContent=p.name+(isPublic(p)?" · Público":" · Autorizado");els.projects.append(opt)}
 if(project)els.projects.value=project.id;else if(els.projects.options.length)project=allProjects()[0];
 els.selected.textContent=project?.name||"Sin proyectos"}
function allProjects(){const map=new Map(publicProjects.map(p=>[p.id,p]));for(const p of dbProjects){const old=map.get(p.slug)||{};map.set(p.slug,{...old,id:p.slug,name:p.name||old.name||p.slug,is_public:p.is_public,center:p.center,dbId:p.id,access:old.access||((p.is_public===true)?"public":"private")})}return [...map.values()]}
async function getDbProjects(){if(!sb)return;const {data,error}=await sb.from("portal_projects").select("id,slug,name,is_public,center").order("name").limit(100);if(error){status("Proyectos Supabase: "+error.message,true);return}dbProjects=data||[]}
async function initAuth(){const cfg=window.IV_AUTH_CONFIG||{};if(!cfg.enabled||!window.supabase?.createClient){els.account.textContent="Sin conexión de autenticación";return}
 sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data}=await sb.auth.getSession();session=data.session||null;
 sb.auth.onAuthStateChange((_event,next)=>{session=next||null;showAuth();getDbProjects().then(()=>{renderProjects();if(project)selectProject(project.id)}).catch(e=>status(e.message,true))});
 showAuth();
}
function showAuth(){els.account.textContent=session?"Sesión: "+(session.user?.email||"Autorizado"):"Acceso público · inicia sesión para proyectos privados";els.signout.hidden=!session;els.login.hidden=!!session}
async function selectProject(id){const p=allProjects().find(x=>x.id===id);if(!p)return;project=p;selected.clear();assets=[];layers=[];annotations=[];els.selected.textContent=p.name;renderData();status("Cargando fuentes del proyecto…");
 const db=dbProjects.find(x=>x.slug===id);
 const jobs=[],issues=[];
 if(p.dronedb&&isPublic(p))jobs.push(loadDroneDB(p).catch(e=>issues.push("DroneDB: "+e.message)));
 if(db&&sb)jobs.push(Promise.race([loadAuthorized(db.id),new Promise((_,reject)=>setTimeout(()=>reject(Error("Tiempo de espera agotado (12 s)")),12000))]).catch(e=>issues.push("Supabase: "+e.message)));
 await Promise.all(jobs);if(project!==p)return;renderData();
 status(issues.length?"Carga parcial · "+issues.join(" · "):"Proyecto cargado. Selecciona los datos que deseas abrir o exportar.",issues.length>0);
 try{sessionStorage.setItem("iv-last-project",id)}catch{}
 const link=$("#iv-explorer-link");link.href="../dataset-explorer.html?project="+encodeURIComponent(id);
 const map=$("#iv-project-map");map.href="../dataset-explorer.html?project="+encodeURIComponent(id)+"&tab=map";
}
async function loadDroneDB(p){
 const d=p.dronedb;if(!d)return;const registry=new URL(d.registry||"https://hub.dronedb.app");if(registry.protocol!=="https:")throw Error("Se requiere HTTPS");
 const base=registry.origin+"/orgs/"+encodeURIComponent(d.org)+"/ds/"+encodeURIComponent(d.dataset);
 const queue=[""],seen=new Set(),results=[];let visited=0;
 while(queue.length&&visited<35&&results.length<180){const folder=queue.shift();if(seen.has(folder))continue;seen.add(folder);visited++;
 const form=new FormData();if(folder)form.append("path",folder);
 const resp=await fetch(base+"/list",{method:"POST",body:form,credentials:"omit",signal:AbortSignal.timeout(10000)});if(!resp.ok)throw Error("Catálogo no disponible ("+resp.status+")");
 const entries=await resp.json();if(!Array.isArray(entries))throw Error("Respuesta inesperada");
 for(const e of entries){if(!e?.path||String(e.path).startsWith(".ddb"))continue;
  if(e.type===1||e.type===7){queue.push(e.path);continue}
  const path=String(e.path);const ext=path.slice(path.lastIndexOf(".")).toLowerCase();
  if(!allowed.has(ext))continue;
  results.push({path,name:e.name||path.split("/").pop(),url:base+"/download/"+path.split("/").map(encodeURIComponent).join("/")+"?inline=1"});
  if(results.length>=180)break;
 }}
 if(project===p)assets=results;
}
async function loadAuthorized(projectId){
 const [{data:ls,error:le},{data:fs,error:fe},{data:ann,error:ae}]=await Promise.all([
  sb.from("project_layers").select("id,name,visibility,geometry_type,style").eq("project_id",projectId).limit(200),
  sb.from("project_features").select("id,layer_id,name,geometry,properties").eq("project_id",projectId).limit(5000),
  sb.from("project_annotations").select("id,title,annotation_type,geometry,measurement,visibility").eq("project_id",projectId).limit(2000)
 ]);
 if(le)throw Error("Capas: "+le.message);if(fe)throw Error("Entidades: "+fe.message);if(ae)throw Error("Anotaciones: "+ae.message);
 const index=new Map((ls||[]).map(l=>[l.id,{...l,features:[]}]));
 for(const f of fs||[])index.get(f.layer_id)?.features.push(f);
 if(project?.dbId===projectId){layers=[...index.values()];annotations=ann||[]}
}
function openRustGIS(){
 const urls=publicUrls();if(!urls.length)return status("Selecciona archivos públicos compatibles.",true);
 if(urls.length>16)return status("RustGIS permite hasta 16 archivos por enlace. Selecciona menos.",true);
 const target=new URL("https://web.rustgis.app/");target.searchParams.set("blank","");target.searchParams.set("lang","es");
 for(const url of urls)target.searchParams.append("data",url);
 window.open(target.toString(),"_blank","noopener,noreferrer");
 status("RustGIS abierto con enlaces públicos. Si alguna capa no carga, comprueba CORS y disponibilidad de DroneDB.");
}
function exportPrivate(){
 const features=geoFeatures();if(!features.length)return status("Selecciona capas o anotaciones autorizadas.",true);
 download("island-view-"+cleanName(project.id)+"-rustgis.geojson",{type:"FeatureCollection",name:project.name,features});
 status("GeoJSON generado en tu dispositivo. En RustGIS usa Map → Add Data o arrastra el archivo descargado.");
}
function coordsValid(coords){if(!Array.isArray(coords))return false;
 if(coords.length>=2&&typeof coords[0]==="number"&&typeof coords[1]==="number")return coords.length<=3&&coords.every(Number.isFinite)&&Math.abs(coords[0])<=180&&Math.abs(coords[1])<=90;
 return coords.length>0&&coords.every(coordsValid)}
function validGeometry(g){return hasGeo(g)&&["Point","LineString","Polygon","MultiPoint","MultiLineString","MultiPolygon"].includes(g.type)&&coordsValid(g.coordinates)}
async function importResults(file){
 if(!project?.dbId||!sb||!session)return status("Inicia sesión y selecciona un proyecto Supabase autorizado para importar.",true);
 if(!file||file.size>15*1024*1024)return status("Selecciona un GeoJSON de máximo 15 MB.",true);
 let parsed;try{parsed=JSON.parse(await file.text())}catch{return status("Archivo JSON inválido.",true)}
 const features=parsed.type==="FeatureCollection"?parsed.features:parsed.type==="Feature"?[parsed]:[];
 if(!features.length||features.length>500)return status("El archivo debe contener entre 1 y 500 entidades GeoJSON.",true);
 if(!features.every(f=>validGeometry(f.geometry)))return status("Geometría no válida o coordenadas fuera de WGS84.",true);
 if(!confirm("¿Importar "+features.length+" entidades como NUEVA capa al proyecto "+project.name+"? No se reemplazarán capas existentes."))return;
 els.importBtn.disabled=true;status("Guardando capa en Island View…");
 let layerId=null;
 try{
  const {data:l,error:le}=await sb.from("project_layers").insert({project_id:project.dbId,name:"RustGIS · "+file.name.replace(/\.geojson$/i,"").slice(0,65),geometry_type:"mixed",visibility:"project",style:{color:"#117db4",opacity:.55}}).select("id").single();
  if(le)throw le;layerId=l.id;
  const rows=features.map((f,i)=>({project_id:project.dbId,layer_id:layerId,name:String(f.properties?.name||f.properties?.iv_name||"Entidad "+(i+1)).slice(0,180),geometry:f.geometry,properties:Object.fromEntries(Object.entries(f.properties||{}).filter(([k])=>!["iv_id","iv_layer_id"].includes(k)))}));
  const {error:fe}=await sb.from("project_features").insert(rows);if(fe)throw fe;
  status("Importación completada: "+features.length+" entidades guardadas. Abre el Explorador → Mapa → Editor GIS.");
  await loadAuthorized(project.dbId);renderData();
 }catch(e){if(layerId)await sb.from("project_layers").delete().eq("id",layerId);status("Importación rechazada: "+e.message+" (comprueba permisos de edición).",true)}
 finally{els.importBtn.disabled=false;els.file.value=""}
}
async function boot(){
 els.projects.addEventListener("change",e=>selectProject(e.target.value));
 $("#iv-layer-search").addEventListener("input",renderManager);
 $("#iv-refresh-layers").addEventListener("click",async()=>{if(!project?.dbId)return status("Este proyecto no tiene catálogo GIS Supabase.",true);await loadAuthorized(project.dbId);renderData();status("Capas actualizadas desde Supabase.")});
 $("#iv-test-connectivity").addEventListener("click",testConnections);
 els.publicBtn.addEventListener("click",openRustGIS);
 els.exportBtn.addEventListener("click",exportPrivate);
 els.importBtn.addEventListener("click",()=>els.file.click());
 els.file.addEventListener("change",e=>{if(e.target.files[0])importResults(e.target.files[0])});
 els.signin.addEventListener("click",async()=>{
  if(!sb)return;els.signin.disabled=true;
  const {error}=await sb.auth.signInWithPassword({email:els.email.value.trim(),password:els.password.value});
  els.password.value="";els.signin.disabled=false;if(error)status("Inicio de sesión: "+error.message,true);
 });
 els.signout.addEventListener("click",async()=>{if(sb)await sb.auth.signOut()});
 try{
  const r=await fetch("../projects.json",{cache:"no-cache"});if(!r.ok)throw Error("No se pudo abrir projects.json");
  const j=await r.json();publicProjects=(j.projects||[]).filter(isPublic);
  await initAuth();await getDbProjects();renderProjects();
  const wanted=q.get("project")||sessionStorage.getItem("iv-last-project");
  await selectProject(allProjects().some(x=>x.id===wanted)?wanted:allProjects()[0]?.id);
 }catch(e){status(e.message,true)}
}
boot();
})();