/* Island View: same-origin, non-sensitive workspace state.
   This module never stores private layer URLs, credentials or geometry. */
(()=>{"use strict";
const KEY="iv-workspace-v1", VALID=/^[A-Za-z0-9_-]{1,100}$/;
const clean=v=>typeof v==="string"&&VALID.test(v)?v:null;
function read(){try{const o=JSON.parse(sessionStorage.getItem(KEY)||"{}");return {projectId:clean(o.projectId),viewer:typeof o.viewer==="string"?o.viewer:null,updatedAt:Number(o.updatedAt)||0}}catch{return {projectId:null,viewer:null,updatedAt:0}}}
function setProject(id){id=clean(id);if(!id)return false;const state={projectId:id,viewer:location.pathname,updatedAt:Date.now()};try{sessionStorage.setItem(KEY,JSON.stringify(state));sessionStorage.setItem("iv-last-project",id)}catch{return false}window.dispatchEvent(new CustomEvent("iv:project-changed",{detail:state}));return true}
function project(){const fromUrl=clean(new URLSearchParams(location.search).get("project"));if(fromUrl){setProject(fromUrl);return fromUrl}return read().projectId||(()=>{try{return clean(sessionStorage.getItem("iv-last-project"))}catch{return null}})()}
function link(relative,id){const u=new URL(relative,location.href);const p=clean(id)||project();if(p)u.searchParams.set("project",p);return u.href}
window.IslandViewWorkspace=Object.freeze({read,project,setProject,link});
project();
})();