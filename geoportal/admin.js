(() => {
"use strict";
const $=(s,p=document)=>p.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let ready=false,profiles=[],projects=[],memberships=[];
function client(){return window.IVAuth?.getClient?.()}
function me(){return window.IVAuth?.getProfile?.()}
function inject(){
 if($("#iv-admin"))return;
 const actions=$(".appbar-actions");if(!actions)return;
 const b=document.createElement("button");b.id="iv-admin";b.className="appbar-button admin-button";b.textContent="Administración";b.onclick=open;actions.prepend(b);
 document.body.insertAdjacentHTML("beforeend",'<div id="admin-modal" class="modal hidden admin-modal"><div class="modal-card admin-card"><div class="modal-head"><div><strong>Administración del Geoportal</strong><small>Usuarios · proyectos · permisos</small></div><button id="admin-close" aria-label="Cerrar">×</button></div><div class="admin-tabs"><button data-admin-tab="users" class="active">Usuarios</button><button data-admin-tab="projects">Proyectos</button><button data-admin-tab="access">Accesos</button></div><div id="admin-body" class="admin-body"></div></div></div>');
 $("#admin-close").onclick=close;$("#admin-modal").onclick=e=>{if(e.target.id==="admin-modal")close()};
 document.querySelectorAll("[data-admin-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-admin-tab]").forEach(x=>x.classList.toggle("active",x===b));render(b.dataset.adminTab)});
 ready=true;
}
function remove(){ $("#iv-admin")?.remove();$("#admin-modal")?.remove();ready=false }
function close(){$("#admin-modal")?.classList.add("hidden")}
async function open(){window.IVAuth?.close?.();$("#admin-modal")?.classList.remove("hidden");await load();render("users")}
async function load(){
 const c=client();if(!c)return;
 const [p,j,m]=await Promise.all([
  c.from("profiles").select("id,full_name,organization,role,active,created_at").order("created_at"),
  c.from("portal_projects").select("id,slug,name,client_name,is_public,status,created_at").order("name"),
  c.from("project_memberships").select("project_id,user_id,permission,created_at")
 ]);
 if(p.error||j.error||m.error){message("No fue posible cargar la administración.");console.warn(p.error||j.error||m.error);return}
 profiles=p.data||[];projects=j.data||[];memberships=m.data||[];
}
function message(t){const b=$("#admin-body");if(b)b.innerHTML='<div class="admin-message">'+esc(t)+'</div>'}
function render(tab){
 if(tab==="projects")return renderProjects();
 if(tab==="access")return renderAccess();
 renderUsers();
}
function renderUsers(){
 const b=$("#admin-body");if(!b)return;
 b.innerHTML='<div class="admin-toolbar"><div><h3>Usuarios y clientes</h3><p>Invita usuarios y controla su rol y estado.</p></div><button id="admin-invite" class="primary">+ Invitar usuario</button></div><div id="admin-user-list" class="admin-list">'+profiles.map(userCard).join("")+'</div>';
 $("#admin-invite").onclick=inviteForm;
 b.querySelectorAll("[data-save-user]").forEach(x=>x.onclick=()=>saveUser(x.dataset.saveUser));
}
function userCard(p){
 const mine=p.id===me()?.id;
 return '<article class="admin-user"><div class="admin-user-head"><div class="admin-avatar">'+esc((p.full_name||"U")[0].toUpperCase())+'</div><div><strong>'+esc(p.full_name||"Usuario")+'</strong><small>'+esc(p.organization||"Sin organización")+'</small></div><span class="admin-state '+(p.active?"on":"off")+'">'+(p.active?"Activo":"Inactivo")+'</span></div><div class="admin-user-controls"><label>Rol<select data-role="'+p.id+'" '+(mine?"disabled":"")+'><option value="client" '+(p.role==="client"?"selected":"")+'>Cliente</option><option value="editor" '+(p.role==="editor"?"selected":"")+'>Editor</option><option value="admin" '+(p.role==="admin"?"selected":"")+'>Administrador</option></select></label><label>Estado<select data-active="'+p.id+'" '+(mine?"disabled":"")+'><option value="true" '+(p.active?"selected":"")+'>Activo</option><option value="false" '+(!p.active?"selected":"")+'>Inactivo</option></select></label><button data-save-user="'+p.id+'" '+(mine?"disabled":"")+'>Guardar</button></div></article>';
}
function inviteForm(){
 const b=$("#admin-body");b.innerHTML='<form id="admin-invite-form" class="admin-form"><h3>Invitar usuario</h3><p>Supabase enviará el enlace de acceso. El usuario no verá proyectos privados hasta que se los asignes.</p><label>Nombre<input id="ai-name" class="field" required></label><label>Correo<input id="ai-email" class="field" type="email" required></label><label>Organización / cliente<input id="ai-org" class="field"></label><label>Rol<select id="ai-role" class="field"><option value="client">Cliente</option><option value="editor">Técnico / Editor</option></select></label><div id="ai-msg" class="auth-error"></div><div class="admin-actions"><button type="button" id="ai-cancel">Cancelar</button><button class="primary">Enviar invitación</button></div></form>';
 $("#ai-cancel").onclick=()=>renderUsers();$("#admin-invite-form").onsubmit=invite;
}
async function invite(e){
 e.preventDefault();const out=$("#ai-msg");out.textContent="Enviando…";
 const {data,error}=await client().functions.invoke("invite-portal-user",{body:{full_name:$("#ai-name").value.trim(),email:$("#ai-email").value.trim(),organization:$("#ai-org").value.trim(),role:$("#ai-role").value}});
 if(error||data?.error){out.textContent=data?.error||error?.message||"No fue posible invitar.";return}
 await load();renderUsers();
}
async function saveUser(id){
 const role=$('[data-role="'+id+'"]').value,active=$('[data-active="'+id+'"]').value==="true";
 const {data,error}=await client().functions.invoke("manage-portal-user",{body:{user_id:id,role,active}});
 if(error||data?.error){alert(data?.error||error?.message||"No fue posible actualizar.");return}
 await load();renderUsers();
}
function renderProjects(){
 const b=$("#admin-body");if(!b)return;
 b.innerHTML='<div class="admin-toolbar"><div><h3>Proyectos seguros</h3><p>Los proyectos privados creados aquí no se almacenan en el JSON público.</p></div><button id="admin-new-project" class="primary">+ Nuevo proyecto</button></div><div class="admin-list">'+(projects.length?projects.map(p=>'<article class="admin-project"><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.client_name||"Island View")+' · '+(p.is_public?"Público":"Privado")+'</small></div><span>'+esc(p.status||"active")+'</span></article>').join(""):'<div class="admin-empty">Aún no hay proyectos en la base segura.</div>')+'</div>';
 $("#admin-new-project").onclick=projectForm;
}
function projectForm(){
 const b=$("#admin-body");b.innerHTML='<form id="admin-project-form" class="admin-form"><h3>Nuevo proyecto</h3><p>Para clientes, usa Privado. Solo los proyectos marcados Público serán visibles sin iniciar sesión.</p><label>Nombre<input id="ap-name" class="field" required></label><label>Cliente / entidad<input id="ap-client" class="field"></label><label>Ubicación<input id="ap-location" class="field" value="San Andrés Isla"></label><label>Servicio<input id="ap-service" class="field"></label><label>Descripción<textarea id="ap-description" class="field" rows="3"></textarea></label><label>Acceso<select id="ap-public" class="field"><option value="false">Privado</option><option value="true">Público</option></select></label><div id="ap-msg" class="auth-error"></div><div class="admin-actions"><button type="button" id="ap-cancel">Cancelar</button><button class="primary">Crear proyecto</button></div></form>';
 $("#ap-cancel").onclick=()=>renderProjects();$("#admin-project-form").onsubmit=createProject;
}
function slugify(v){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,64)+"-"+Date.now().toString(36)}
async function createProject(e){
 e.preventDefault();const out=$("#ap-msg");out.textContent="Creando…";
 const row={slug:slugify($("#ap-name").value),name:$("#ap-name").value.trim(),client_name:$("#ap-client").value.trim(),location:$("#ap-location").value.trim(),service:$("#ap-service").value.trim(),description:$("#ap-description").value.trim(),is_public:$("#ap-public").value==="true",status:"active"};
 const {error}=await client().from("portal_projects").insert(row);
 if(error){out.textContent=error.message;return}
 await load();await window.IVAuth?.refresh?.();renderProjects();
}
function renderAccess(){
 const b=$("#admin-body");if(!b)return;
 const eligible=profiles.filter(p=>p.active&&p.role!=="admin");
 b.innerHTML='<div class="admin-toolbar"><div><h3>Acceso por proyecto</h3><p>Asigna Viewer para consulta o Editor para gestión técnica.</p></div></div>'+(eligible.length&&projects.length?'<div class="access-grid"><label>Usuario<select id="aa-user" class="field">'+eligible.map(p=>'<option value="'+p.id+'">'+esc(p.full_name||"Usuario")+' · '+esc(p.organization||"")+'</option>').join("")+'</select></label><label>Proyecto<select id="aa-project" class="field">'+projects.map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join("")+'</select></label><label>Permiso<select id="aa-permission" class="field"><option value="viewer">Viewer · solo consulta</option><option value="editor">Editor · gestión técnica</option></select></label><button id="aa-assign" class="primary">Asignar / actualizar</button></div>':'<div class="admin-empty">Necesitas al menos un usuario cliente/editor y un proyecto seguro.</div>')+'<div class="membership-list">'+memberships.map(membershipRow).join("")+'</div>';
 $("#aa-assign")?.addEventListener("click",assignAccess);
 b.querySelectorAll("[data-remove-access]").forEach(x=>x.onclick=()=>removeAccess(x.dataset.user,x.dataset.project));
}
function membershipRow(m){
 const u=profiles.find(x=>x.id===m.user_id),p=projects.find(x=>x.id===m.project_id);
 if(!u||!p)return"";
 return '<article class="membership-row"><div><strong>'+esc(u.full_name||"Usuario")+'</strong><small>'+esc(p.name)+' · '+esc(m.permission)+'</small></div><button data-remove-access data-user="'+m.user_id+'" data-project="'+m.project_id+'">Retirar</button></article>';
}
async function assignAccess(){
 const row={user_id:$("#aa-user").value,project_id:$("#aa-project").value,permission:$("#aa-permission").value};
 const {error}=await client().from("project_memberships").upsert(row,{onConflict:"project_id,user_id"});
 if(error){alert(error.message);return}
 await load();renderAccess();
}
async function removeAccess(user,project){
 const {error}=await client().from("project_memberships").delete().eq("user_id",user).eq("project_id",project);
 if(error){alert(error.message);return}
 await load();renderAccess();
}
window.addEventListener("iv:auth-change",e=>{
 const isAdmin=!!e.detail?.session&&e.detail?.profile?.role==="admin"&&e.detail?.profile?.active!==false;
 if(isAdmin){if(!ready)inject()}else remove();
});
})();