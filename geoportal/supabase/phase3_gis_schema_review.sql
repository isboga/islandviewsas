-- Island View SAS · Fase 3 — esquema GIS central (BORRADOR PARA REVISIÓN)
-- NO ejecutar sin verificar primero el esquema y las políticas existentes.
-- Este archivo no ha sido aplicado a Supabase: proyecto INACTIVE al 2026-10-13.
-- Requiere ejecutar antes supabase/schema.sql (private.can_access_project / can_edit_project).
-- Solo crea tablas ausentes y políticas con nombres propios; no borra datos existentes.

begin;

create table if not exists public.project_layers (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.portal_projects(id) on delete cascade,
 name text not null,
 geometry_type text not null default 'mixed',
 visibility text not null default 'project' check (visibility in ('project','public')),
 style jsonb not null default '{"color":"#19a6c4","opacity":0.55}'::jsonb,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(project_id,id)
);

create table if not exists public.project_features (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null,
 layer_id uuid not null,
 name text not null default 'Entidad',
 geometry jsonb not null,
 properties jsonb not null default '{}'::jsonb,
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (project_id,layer_id) references public.project_layers(project_id,id) on delete cascade
);

create table if not exists public.project_annotations (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.portal_projects(id) on delete cascade,
 annotation_type text not null,
 title text,
 geometry jsonb,
 measurement jsonb not null default '{}'::jsonb,
 properties jsonb not null default '{}'::jsonb,
 style jsonb not null default '{}'::jsonb,
 visibility text not null default 'project' check (visibility in ('project','public')),
 created_by uuid default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists iv_project_layers_project_idx on public.project_layers(project_id);
create index if not exists iv_project_features_project_idx on public.project_features(project_id);
create index if not exists iv_project_features_layer_idx on public.project_features(layer_id);
create index if not exists iv_project_annotations_project_idx on public.project_annotations(project_id);

alter table public.project_layers enable row level security;
alter table public.project_features enable row level security;
alter table public.project_annotations enable row level security;

revoke all on public.project_layers,public.project_features,public.project_annotations from anon,authenticated;
grant select on public.project_layers,public.project_features,public.project_annotations to anon;
grant select,insert,update,delete on public.project_layers,public.project_features,public.project_annotations to authenticated;

do $policies$
begin
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_layers' and policyname='iv_layers_public_read') then
  create policy iv_layers_public_read on public.project_layers for select to anon
   using (visibility='public' and exists(select 1 from public.portal_projects p where p.id=project_id and p.is_public));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_layers' and policyname='iv_layers_member_read') then
  create policy iv_layers_member_read on public.project_layers for select to authenticated
   using (private.can_access_project(project_id) or (visibility='public' and exists(select 1 from public.portal_projects p where p.id=project_id and p.is_public)));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_layers' and policyname='iv_layers_editor_insert') then
  create policy iv_layers_editor_insert on public.project_layers for insert to authenticated with check (private.can_edit_project(project_id));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_layers' and policyname='iv_layers_editor_update') then
  create policy iv_layers_editor_update on public.project_layers for update to authenticated using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_layers' and policyname='iv_layers_editor_delete') then
  create policy iv_layers_editor_delete on public.project_layers for delete to authenticated using (private.can_edit_project(project_id));
 end if;

 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_features' and policyname='iv_features_public_read') then
  create policy iv_features_public_read on public.project_features for select to anon
   using (exists(select 1 from public.project_layers l join public.portal_projects p on p.id=l.project_id
    where l.id=layer_id and l.project_id=project_id and l.visibility='public' and p.is_public));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_features' and policyname='iv_features_member_read') then
  create policy iv_features_member_read on public.project_features for select to authenticated
   using (private.can_access_project(project_id) or exists(select 1 from public.project_layers l join public.portal_projects p on p.id=l.project_id
    where l.id=layer_id and l.project_id=project_id and l.visibility='public' and p.is_public));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_features' and policyname='iv_features_editor_insert') then
  create policy iv_features_editor_insert on public.project_features for insert to authenticated with check (private.can_edit_project(project_id));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_features' and policyname='iv_features_editor_update') then
  create policy iv_features_editor_update on public.project_features for update to authenticated using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_features' and policyname='iv_features_editor_delete') then
  create policy iv_features_editor_delete on public.project_features for delete to authenticated using (private.can_edit_project(project_id));
 end if;

 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_annotations' and policyname='iv_annotations_public_read') then
  create policy iv_annotations_public_read on public.project_annotations for select to anon
   using (visibility='public' and exists(select 1 from public.portal_projects p where p.id=project_id and p.is_public));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_annotations' and policyname='iv_annotations_member_read') then
  create policy iv_annotations_member_read on public.project_annotations for select to authenticated
   using (private.can_access_project(project_id) or (visibility='public' and exists(select 1 from public.portal_projects p where p.id=project_id and p.is_public)));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_annotations' and policyname='iv_annotations_editor_insert') then
  create policy iv_annotations_editor_insert on public.project_annotations for insert to authenticated with check (private.can_edit_project(project_id));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_annotations' and policyname='iv_annotations_editor_update') then
  create policy iv_annotations_editor_update on public.project_annotations for update to authenticated using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));
 end if;
 if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_annotations' and policyname='iv_annotations_editor_delete') then
  create policy iv_annotations_editor_delete on public.project_annotations for delete to authenticated using (private.can_edit_project(project_id));
 end if;
end
$policies$;

commit;

-- AUDITORÍA OBLIGATORIA DESPUÉS DE REACTIVAR SUPABASE:
-- 1) select table_name,column_name,data_type from information_schema.columns
--    where table_schema='public' and table_name in ('project_layers','project_features','project_annotations');
-- 2) select tablename,policyname,roles,cmd,qual,with_check from pg_policies
--    where schemaname='public' and tablename in ('project_layers','project_features','project_annotations');
-- 3) Probar como anon, miembro viewer, miembro editor y administrador.
-- 4) No ejecutar este archivo sin revisar las tablas/políticas ya instaladas.
