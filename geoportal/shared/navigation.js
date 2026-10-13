/* Island View shared navigation: works with static GitHub Pages and embedded viewers. */
(()=>{"use strict";
const params=new URLSearchParams(location.search);
if(params.get("embedded")==="1")return;
const file=location.pathname.split("/").pop()||"index.html";
const inStudio=location.pathname.includes("/studio/");
const root=inStudio?"../":"./";
const explicit=params.get("project");
if(explicit&&/^[a-zA-Z0-9_-]{1,100}$/.test(explicit)){try{sessionStorage.setItem("iv-last-project",explicit)}catch{}}
let remembered="sai-dronedb";try{remembered=sessionStorage.getItem("iv-last-project")||remembered}catch{}
let project=explicit&&/^[a-zA-Z0-9_-]{1,100}$/.test(explicit)?explicit:remembered;
const query="?project="+encodeURIComponent(project);
const isHome=file==="index.html"||file==="";
const isExplorer=file==="dataset-explorer.html";
const isProduct=file==="product-viewer.html";
const isUnified=file==="unified-viewer.html";
const isCloud=file==="pointcloud-viewer.html";
const isStudio=file==="index.html"&&inStudio;
const target=isHome&&!inStudio?document.querySelector(".sidebar .brand"):
 isExplorer?document.querySelector(".db-head-actions"):
 isProduct?document.querySelector(".pv-head-actions"):
 isUnified?document.querySelector(".uv-actions"):
 isCloud?document.querySelector(".pc-actions"):
 isStudio?document.querySelector(".iv-studio-actions"):null;
if(!target)return;
const hub=document.createElement("div");hub.className="iv-hub"+(isHome&&!inStudio?" iv-hub--sidebar":"");
const trigger=document.createElement("button");trigger.type="button";trigger.className="iv-hub-trigger";
trigger.setAttribute("aria-label","Abrir navegación de Island View");trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-haspopup","true");
trigger.innerHTML='<span aria-hidden="true">☰</span><span class="iv-hub-trigger-label">Explorar</span><span class="iv-hub-chevron" aria-hidden="true">⌄</span>';
const menu=document.createElement("nav");menu.className="iv-hub-menu";menu.setAttribute("aria-label","Secciones del geoportal");menu.hidden=true;
const header=document.createElement("div");header.className="iv-hub-menu-head";
const h=document.createElement("strong");h.textContent="ISLAND VIEW · GEOSPATIAL";
const sub=document.createElement("small");sub.textContent="Proyecto: "+project;
header.append(h,sub);menu.append(header);
function section(title){const el=document.createElement("div");el.className="iv-hub-group";el.textContent=title;menu.append(el)}
function item(title,desc,icon,href,active=false,external=false){
 const a=document.createElement("a");a.href=href;if(active)a.setAttribute("aria-current","page");
 if(external){a.target="_blank";a.rel="noopener noreferrer"}
 const symbol=document.createElement("span");symbol.className="iv-hub-icon";symbol.textContent=icon;
 const body=document.createElement("span");body.textContent=title;
 const d=document.createElement("small");d.textContent=desc;body.append(d);a.append(symbol,body);menu.append(a);
}
section("Plataforma");
item("Inicio","Mapa general y proyectos","⌂",root+"index.html",isHome&&!inStudio);
item("Explorador","Archivos y metadatos del proyecto","▤",root+"dataset-explorer.html"+query,isExplorer&&params.get("tab")!=="map");
item("Mapa del proyecto","Capas, mediciones y ortomosaicos","◫",root+"dataset-explorer.html"+query+"&tab=map",isExplorer&&params.get("tab")==="map");
section("Visores especializados");
const productParams=new URLSearchParams();["project","path","hash","type"].forEach(k=>{if(params.has(k))productParams.set(k,params.get(k))});
item("Visor de productos","Abrir archivos desde el explorador","▧",isProduct?location.href:root+"dataset-explorer.html"+query,isProduct);
item("Visor 3D / escenas","Giro3D y modelos geoespaciales","◇",root+"unified-viewer.html"+query,isUnified);
item("Nubes de puntos","Potree / LiDAR desde el catálogo","☷",isCloud?location.href:root+"dataset-explorer.html"+query,isCloud);
section("Herramientas GIS");
item("GIS Studio · Beta","RustGIS Web: entorno externo de pruebas","✣",root+"studio/index.html"+query,isStudio);
hub.append(trigger,menu);
if(isHome&&!inStudio)target.insertAdjacentElement("afterend",hub);
else target.prepend(hub);
const logo="data:image/png;base64,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";
for(const sel of [".db-logo",".uv-mark",".pc-brand > span:first-child",".brand-icon"]){
 const el=document.querySelector(sel);if(el&&!el.querySelector("img")){
  el.textContent="";const img=document.createElement("img");img.className="iv-hub-brand-logo";img.alt="Island View SAS";img.src=logo;el.append(img);
 }
}
function close(){menu.hidden=true;trigger.setAttribute("aria-expanded","false")}
function open(){const rect=trigger.getBoundingClientRect();const width=Math.min(324,innerWidth-24);const left=Math.min(Math.max(12,rect.right-width),innerWidth-width-12);menu.style.setProperty("--iv-menu-left",left+"px");menu.style.setProperty("--iv-menu-top",Math.min(rect.bottom+8,Math.max(12,innerHeight-200))+"px");menu.hidden=false;trigger.setAttribute("aria-expanded","true")}
trigger.addEventListener("click",e=>{e.stopPropagation();menu.hidden?open():close()});
document.addEventListener("click",e=>{if(!hub.contains(e.target))close()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!menu.hidden){close();trigger.focus()}});
window.addEventListener("iv:project",e=>{
 const next=e.detail?.project;
 if(typeof next!=="string"||!/^[a-zA-Z0-9_-]{1,100}$/.test(next))return;
 project=next;sub.textContent="Proyecto: "+project;
 try{sessionStorage.setItem("iv-last-project",project)}catch{}
 menu.querySelectorAll("a").forEach(a=>{
  try{const u=new URL(a.href);if(u.origin!==location.origin||!u.searchParams.has("project"))return;
   u.searchParams.set("project",project);a.href=u.href}catch{}
 });
});
window.addEventListener("resize",close);
})();
