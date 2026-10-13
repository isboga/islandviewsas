(()=>{"use strict";
if(new URLSearchParams(location.search).get("embedded")==="1")return;
const file=location.pathname.split("/").pop();
const kind=({"dataset-explorer.html":"explorer","product-viewer.html":"product","unified-viewer.html":"scene","pointcloud-viewer.html":"cloud"})[file];
if(!kind)return;
const host=document.querySelector(({explorer:".db-head-actions",product:".pv-head-actions",scene:".uv-actions",cloud:".pc-actions"})[kind]);if(!host)return;
const catalog={
explorer:[
["Navegación",[["Archivos","▤",'[data-tab="files"]'],["Mapa del proyecto","◫",'[data-tab="map"]'],["Capas visibles","▧","#db-map-layers-btn","map"],["Información","ⓘ",'[data-tab="info"]']]],
["Medición y análisis",[["Distancia","↔",'[data-gis="distance"]',"map"],["Área / polígono","⬡",'[data-gis="area"]',"map"],["Perfil","⌁",'[data-gis="profile"]',"map"],["Estadísticas ráster","▥",'[data-gis="stats"]',"map"]]],
["Edición y archivos",[["Editor GIS","✎","#db-gis-editor-btn","map"],["Mediciones guardadas","◎","#db-map-annotations-btn","map"],["Comparador temporal","◧","#db-map-compare-btn","map"],["Importar capa","＋","#db-import-btn"],["Exportar capa","⇩","#db-gis-editor-btn","map"]]]
],
product:[
["Navegación",[["Archivos","▤","#pv-files-open"],["Información y atributos","ⓘ","#pv-info-btn"],["Encuadrar","⌂","#pv-home"],["Pantalla completa","⛶","#pv-full"]]],
["Mediciones",[["Punto / consultar","⌖",'[data-tool="inspect"]'],["Distancia","↔",'[data-tool="distance"]'],["Área / polígono","⬡",'[data-tool="area"]'],["Análisis ráster","▥",'[data-tool="stats"]'],["Limpiar mediciones","⌫",'[data-tool="clear"]']]],
["Productos",[["Descargar archivo","⇩","#pv-download"],["Abrir fuente original","↗","#pv-open-source"]]]
],
scene:[
["Escena",[["Capas y productos","▧","#uv-collapse"],["Vista 2D","◫","#uv-2d"],["Vista 3D","◇","#uv-3d"],["Pantalla completa","⛶","#uv-full"]]],
["Mediciones",[["Punto","⌖",'[data-draw="point"]'],["Distancia","↔",'[data-draw="line"]'],["Área / polígono","⬡",'[data-draw="polygon"]'],["Limpiar","⌫","#uv-clear"]]]
],
cloud:[
["Nube de puntos",[["Encuadrar","⌂","#pc-fit"],["Herramientas Potree","☷","#pc-potree-tools"],["Clasificación","▧","#pc-class-btn"],["Pantalla completa","⛶","#pc-full"]]],
["Mediciones 3D",[["Punto","⌖",'[data-tool="point"]'],["Distancia","↔",'[data-tool="distance"]'],["Área","⬡",'[data-tool="area"]'],["Altura","↕",'[data-tool="height"]'],["Perfil","⌁",'[data-tool="profile"]'],["Volumen","▤",'[data-tool="volume"]'],["Recorte 3D","□",'[data-tool="clip"]']]],
["Resultados",[["Exportar GeoJSON","⇩","#pc-export"],["Limpiar mediciones","⌫","#pc-clear"]]]
]};
const root=document.createElement("div");root.className="iv-workspace";
const trigger=document.createElement("button");trigger.type="button";trigger.className="iv-workspace-trigger";trigger.textContent="⚒ Herramientas";trigger.setAttribute("aria-label","Abrir herramientas del visor");trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-controls","iv-workspace-panel");
const panel=document.createElement("section");panel.id="iv-workspace-panel";panel.className="iv-workspace-panel";panel.hidden=true;panel.setAttribute("aria-label","Herramientas del espacio de trabajo");
const head=document.createElement("div");head.className="iv-workspace-head";
const title=document.createElement("div");const h=document.createElement("strong");h.textContent="Espacio de trabajo";const sub=document.createElement("small");sub.textContent=({explorer:"Explorador y GIS",product:"Visor de productos",scene:"Escena geoespacial 2D/3D",cloud:"Nube de puntos 3D"})[kind];title.append(h,sub);
const close=document.createElement("button");close.type="button";close.textContent="×";close.className="iv-workspace-close";close.setAttribute("aria-label","Cerrar herramientas");head.append(title,close);panel.append(head);
const body=document.createElement("div");body.className="iv-workspace-body";
for(const [group,items] of catalog[kind]){
 const section=document.createElement("section");section.className="iv-workspace-group";
 const caption=document.createElement("h3");caption.textContent=group;section.append(caption);
 const grid=document.createElement("div");grid.className="iv-workspace-grid";
 for(const [label,icon,selector,needMap] of items){
  const b=document.createElement("button");b.type="button";b.className="iv-workspace-action";b.title=label;
  const glyph=document.createElement("span");glyph.className="iv-workspace-glyph";glyph.textContent=icon;
  const name=document.createElement("span");name.textContent=label;b.append(glyph,name);
  b.addEventListener("click",()=>{
   const target=document.querySelector(selector);
   if(!target){announce("La herramienta aún no está disponible.");return}
   if(kind==="explorer"&&needMap&&document.querySelector('[data-tab="map"]:not(.active)'))document.querySelector('[data-tab="map"]')?.click();
   if(selector==="#uv-collapse"){
    const side=document.querySelector(".uv-sidebar");
    if(side&&getComputedStyle(side).display!=="none"&&!document.querySelector(".uv-shell")?.classList.contains("sidebar-collapsed")){announce("Panel de capas visible.");dismiss();return}
   }
   if((selector==="#pv-download"||selector==="#pv-open-source")&&!target.getAttribute("href")){announce("El archivo aún no está listo.");return}
   target.click();announce(label+" · herramienta seleccionada");dismiss();
  });grid.append(b);
 }
 section.append(grid);body.append(section);
}
const foot=document.createElement("div");foot.className="iv-workspace-foot";foot.textContent="Herramientas disponibles en este visor · Island View SAS";
panel.append(body,foot);root.append(trigger,panel);host.prepend(root);
const live=document.createElement("div");live.className="iv-workspace-live";live.setAttribute("role","status");live.setAttribute("aria-live","polite");document.body.append(live);
function announce(msg){live.textContent=msg}
function dismiss(){panel.hidden=true;trigger.setAttribute("aria-expanded","false")}
function show(){
 const r=trigger.getBoundingClientRect(),width=Math.min(380,innerWidth-20);
 panel.style.setProperty("--iv-workspace-left",Math.min(Math.max(10,r.right-width),innerWidth-width-10)+"px");
 panel.style.setProperty("--iv-workspace-top",Math.min(r.bottom+8,Math.max(8,innerHeight-160))+"px");
 panel.hidden=false;trigger.setAttribute("aria-expanded","true");
}
trigger.addEventListener("click",e=>{e.stopPropagation();panel.hidden?show():dismiss()});
close.addEventListener("click",()=>{dismiss();trigger.focus()});
document.addEventListener("click",e=>{if(!root.contains(e.target))dismiss()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){dismiss();trigger.focus()}});
window.addEventListener("resize",dismiss);
})();