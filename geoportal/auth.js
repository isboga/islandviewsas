(() => {
"use strict";
const cfg=window.IV_AUTH_CONFIG||{}, lib=window.supabase;
const configured=!!(cfg.enabled&&cfg.supabaseUrl&&cfg.supabasePublishableKey&&lib?.createClient);
let client=null,session=null,profile=null,recovery=false;
const $=(s,p=document)=>p.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function inject(){
 const actions=$(".appbar-actions");if(!actions||$("#iv-account"))return;
 const b=document.createElement("button");b.id="iv-account";b.className="appbar-button account-button";b.textContent="Acceso clientes";actions.prepend(b);b.onclick=openAccount;
 document.body.insertAdjacentHTML("beforeend",'<div id="auth-modal" class="modal hidden auth-modal"><div class="modal-card auth-card"><div class="modal-head"><div><strong id="auth-title">Acceso de clientes</strong><small id="auth-subtitle">Island View S.A.S.</small></div><button id="auth-close" aria-label="Cerrar">×</button></div><div id="auth-body" class="auth-body"></div></div></div>');
 $("#auth-close").onclick=close;$("#auth-modal").onclick=e=>{if(e.target.id==="auth-modal")close()};
}
function close(){$("#auth-modal")?.classList.add("hidden")}
function openAccount(){$("#auth-modal")?.classList.remove("hidden");render()}
function render(){
 const body=$("#auth-body");if(!body)return;
 if(!configured){body.innerHTML='<div class="auth-state"><div class="auth-shield">IV</div><h3>Acceso seguro en configuración</h3><p>La interfaz de usuarios ya está preparada. Falta conectar el proyecto de autenticación de Island View para habilitar sesiones privadas.</p><small>El portal público continúa funcionando normalmente.</small></div>';return}
 if(recovery&&session){body.innerHTML='<form id="recovery-form" class="auth-form"><div class="auth-intro"><h3>Nueva contraseña</h3><p>Define una nueva contraseña para tu cuenta.</p></div><label>Nueva contraseña<input id="recovery-password" class="field" type="password" minlength="8" required></label><div id="recovery-error" class="auth-error"></div><button class="primary">Guardar contraseña</button></form>';$("#recovery-form").onsubmit=updatePassword;return}
 if(!session){body.innerHTML='<form id="login-form" class="auth-form"><div class="auth-intro"><h3>Ingresar al portal</h3><p>Consulta únicamente los proyectos y productos asignados a tu cuenta.</p></div><label>Correo electrónico<input id="login-email" class="field" type="email" autocomplete="username" required></label><label>Contraseña<input id="login-password" class="field" type="password" autocomplete="current-password" required minlength="8"></label><div id="login-error" class="auth-error" role="alert"></div><button class="primary" type="submit">Ingresar</button><button id="forgot-password" type="button" class="auth-link">¿Olvidaste tu contraseña?</button><div class="auth-security">Acceso protegido por sesión autenticada y permisos por proyecto.</div></form>';
  $("#login-form").onsubmit=signIn;$("#forgot-password").onclick=resetPassword;return}
 const role=profile?.role||"client",name=profile?.full_name||session.user.email;
 body.innerHTML='<div class="account-panel"><div class="account-avatar">'+esc((name||"U").slice(0,1).toUpperCase())+'</div><h3>'+esc(name)+'</h3><p>'+esc(session.user.email)+'</p><div class="account-meta"><span>Rol</span><strong>'+esc(roleLabel(role))+'</strong><span>Organización</span><strong>'+esc(profile?.organization||"—")+'</strong></div><button id="account-projects" class="primary">Mis proyectos</button>'+(role==="admin"?'<button id="account-invite">Invitar usuario</button>':'')+'<button id="account-signout">Cerrar sesión</button></div>';
 $("#account-projects").onclick=()=>{close();window.IVPortal?.setWorkspace?.("catalog")};
 if(role==="admin")$("#account-invite").onclick=renderInvite;
 $("#account-signout").onclick=signOut;
}
function renderInvite(){
 const body=$("#auth-body");if(!body)return;
 body.innerHTML='<form id="invite-form" class="auth-form"><div class="auth-intro"><h3>Invitar usuario</h3><p>Crea acceso para un cliente o técnico. Los clientes no reciben ningún proyecto hasta que Island View se lo asigne.</p></div><label>Nombre completo<input id="invite-name" class="field" required></label><label>Correo electrónico<input id="invite-email" class="field" type="email" required></label><label>Organización / cliente<input id="invite-org" class="field"></label><label>Rol<select id="invite-role" class="field"><option value="client">Cliente</option><option value="editor">Técnico / Editor</option></select></label><div id="invite-error" class="auth-error" role="alert"></div><button class="primary" type="submit">Enviar invitación</button><button id="invite-back" type="button">Volver a mi cuenta</button></form>';
 $("#invite-form").onsubmit=inviteUser;$("#invite-back").onclick=render;
}
async function inviteUser(e){
 e.preventDefault();const out=$("#invite-error");out.textContent="Enviando invitación…";
 const {data,error}=await client.functions.invoke("invite-portal-user",{body:{full_name:$("#invite-name").value.trim(),email:$("#invite-email").value.trim(),organization:$("#invite-org").value.trim(),role:$("#invite-role").value}});
 if(error||data?.error){out.textContent=humanError(data?.error||error?.message);return}
 out.textContent="Invitación enviada correctamente.";
 e.target.reset();
}
async function signIn(e){
 e.preventDefault();const error=$("#login-error");error.textContent="Verificando…";
 const email=$("#login-email").value.trim(),password=$("#login-password").value;
 const {error:err}=await client.auth.signInWithPassword({email,password});
 if(err){error.textContent=humanError(err.message);return}error.textContent="";
}
async function updatePassword(e){
 e.preventDefault();const out=$("#recovery-error"),password=$("#recovery-password").value;
 if(password.length<8){out.textContent="Usa al menos 8 caracteres.";return}
 out.textContent="Guardando…";const {error}=await client.auth.updateUser({password});
 if(error){out.textContent=humanError(error.message);return}
 recovery=false;out.textContent="Contraseña actualizada.";setTimeout(render,600);
}
async function resetPassword(){
 const email=$("#login-email")?.value.trim();if(!email){$("#login-error").textContent="Escribe primero tu correo.";return}
 const redirectTo=location.origin+location.pathname;
 const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
 $("#login-error").textContent=error?humanError(error.message):"Revisa tu correo para restablecer la contraseña.";
}
async function signOut(){await client.auth.signOut();close()}
function roleLabel(r){return ({admin:"Administrador Island View",editor:"Técnico / Editor",client:"Cliente"})[r]||"Cliente"}
function humanError(m){if(/invalid login/i.test(m))return"Correo o contraseña incorrectos.";if(/email not confirmed/i.test(m))return"Debes confirmar tu correo antes de ingresar.";return m||"No fue posible iniciar sesión."}
async function refreshUser(){
 if(!configured)return;
 const {data}=await client.auth.getSession();session=data.session||null;profile=null;
 if(session){
  const {data:p,error}=await client.from("profiles").select("id,full_name,organization,role,active").eq("id",session.user.id).maybeSingle();
  if(!error)profile=p;
 }
 updateButton();await loadAuthorizedData();window.dispatchEvent(new CustomEvent("iv:auth-change",{detail:{session,profile,configured}}));
}
function updateButton(){
 const b=$("#iv-account");if(!b)return;
 if(!configured){b.textContent="Acceso clientes";b.classList.remove("signed-in");return}
 if(session){b.textContent=(profile?.full_name||session.user.email||"Mi cuenta").split(" ")[0];b.classList.add("signed-in");b.title=roleLabel(profile?.role)}
 else{b.textContent="Acceso clientes";b.classList.remove("signed-in");b.title="Ingresar"}
}
async function loadAuthorizedData(){
 if(!configured)return;
 const {data:projects,error:pe}=await client.from("portal_projects").select("*").order("name");
 const {data:products,error:xe}=await client.from("portal_products").select("*").order("created_at",{ascending:false});
 if(pe||xe){console.warn("Island View auth data",pe||xe);return}
 const byId=new Map((projects||[]).map(p=>[p.id,p.slug]));
 const normalizedProjects=(projects||[]).map(p=>({
  id:p.slug,dbId:p.id,name:p.name,client:p.client_name||"",location:p.location||"",service:p.service||"",
  description:p.description||"",status:p.status||"active",access:p.is_public?"public":"private",
  coordinates:Array.isArray(p.center)?p.center:(p.center?.coordinates||[-81.7006,12.5847]),
  category:p.metadata?.category||"",captureDate:p.metadata?.captureDate||"",
  methods:p.metadata?.methods||[],equipment:p.metadata?.equipment||[],products:p.metadata?.products||[],
  crs:p.metadata?.crs||"EPSG:4326",source:"secure"
 }));
 const normalizedProducts=(products||[]).map(x=>({
  id:x.id,projectId:byId.get(x.project_id)||x.project_id,name:x.name,type:x.product_type,format:x.format,
  access:x.access,status:x.status,source:x.source||{},metadata:x.metadata||{},sourceKind:"secure"
 }));
 window.dispatchEvent(new CustomEvent("iv:auth-data",{detail:{projects:normalizedProjects,products:normalizedProducts,profile,authenticated:!!session}}));
}
async function init(){
 inject();if(!configured){updateButton();return}
 client=lib.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 client.auth.onAuthStateChange((event)=>{if(event==="PASSWORD_RECOVERY"){recovery=true;setTimeout(()=>{openAccount();refreshUser()},0);return}setTimeout(refreshUser,0)});await refreshUser();
}
window.IVAuth={open:openAccount,close,getClient:()=>client,getSession:()=>session,getProfile:()=>profile,isConfigured:()=>configured,refresh:refreshUser};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();