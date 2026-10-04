-- Island View Geoportal · Auth / client access schema
-- Run once in the Supabase SQL editor for the project used by the geoportal.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  organization text,
  role text not null default 'client' check (role in ('admin','editor','client')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  client_name text,
  location text,
  service text,
  description text,
  status text not null default 'active',
  is_public boolean not null default false,
  center jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_memberships (
  project_id uuid not null references public.portal_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'viewer' check (permission in ('viewer','editor')),
  created_at timestamptz not null default now(),
  primary key(project_id,user_id)
);
create index if not exists project_memberships_user_id_idx on public.project_memberships(user_id);

create table if not exists public.portal_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.portal_projects(id) on delete cascade,
  name text not null,
  product_type text not null check (product_type in ('orthomosaic','3d','pointcloud','elevation','thermal','vector','media','document')),
  format text,
  access text not null default 'private' check (access in ('public','private')),
  status text not null default 'ready',
  source jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists portal_products_project_id_idx on public.portal_products(project_id);

create or replace function private.is_admin()
returns boolean language sql security definer stable set search_path=''
as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and p.role='admin');
$$;

create or replace function private.can_access_project(pid uuid)
returns boolean language sql security definer stable set search_path=''
as $$
 select private.is_admin() or exists(
  select 1 from public.project_memberships m join public.profiles p on p.id=m.user_id
  where m.project_id=pid and m.user_id=(select auth.uid()) and p.active
 );
$$;

create or replace function private.can_edit_project(pid uuid)
returns boolean language sql security definer stable set search_path=''
as $$
 select private.is_admin() or exists(
  select 1 from public.project_memberships m join public.profiles p on p.id=m.user_id
  where m.project_id=pid and m.user_id=(select auth.uid()) and p.active and m.permission='editor'
 );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.can_access_project(uuid) from public;
revoke all on function private.can_edit_project(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.can_access_project(uuid) to authenticated;
grant execute on function private.can_edit_project(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.portal_projects enable row level security;
alter table public.project_memberships enable row level security;
alter table public.portal_products enable row level security;

revoke all on public.profiles, public.portal_projects, public.project_memberships, public.portal_products from anon, authenticated;
grant select on public.portal_projects, public.portal_products to anon;
grant select on public.profiles, public.portal_projects, public.project_memberships, public.portal_products to authenticated;
grant insert, update, delete on public.portal_projects, public.portal_products to authenticated;
grant insert, update, delete on public.project_memberships to authenticated;
grant update (full_name, organization) on public.profiles to authenticated;

create policy "public projects visible anonymously" on public.portal_projects for select to anon using (is_public);
create policy "authenticated projects by membership" on public.portal_projects for select to authenticated using (is_public or private.can_access_project(id));
create policy "admins create projects" on public.portal_projects for insert to authenticated with check (private.is_admin());
create policy "editors update assigned projects" on public.portal_projects for update to authenticated using (private.can_edit_project(id)) with check (private.can_edit_project(id));
create policy "admins delete projects" on public.portal_projects for delete to authenticated using (private.is_admin());

create policy "public products visible anonymously" on public.portal_products for select to anon using (
 access='public' and exists(select 1 from public.portal_projects p where p.id=project_id and p.is_public)
);
create policy "authenticated products by project" on public.portal_products for select to authenticated using (
 (access='public' and exists(select 1 from public.portal_projects p where p.id=project_id and p.is_public))
 or private.can_access_project(project_id)
);
create policy "editors create products" on public.portal_products for insert to authenticated with check (private.can_edit_project(project_id));
create policy "editors update products" on public.portal_products for update to authenticated using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));
create policy "editors delete products" on public.portal_products for delete to authenticated using (private.can_edit_project(project_id));

create policy "users read own profile" on public.profiles for select to authenticated using (id=(select auth.uid()) or private.is_admin());
create policy "users update own profile" on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

create policy "users read own memberships" on public.project_memberships for select to authenticated using (user_id=(select auth.uid()) or private.is_admin());
create policy "admins add memberships" on public.project_memberships for insert to authenticated with check (private.is_admin());
create policy "admins update memberships" on public.project_memberships for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "admins delete memberships" on public.project_memberships for delete to authenticated using (private.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.profiles(id,full_name,organization,role)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'organization',''),'client')
 on conflict(id) do nothing;
 return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Bootstrap after creating the Island View administrator in Supabase Auth:
-- update public.profiles set role='admin' where id='<YOUR_AUTH_USER_UUID>';
