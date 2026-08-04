-- ════════════════════════════════════════════════════════════════
--  ESQUEMA · Desglose Digital de Libreto (app original) + LOGIN real
--  Córrelo en: Supabase (proyecto rdveoxcnrtirhxpmtmck) → SQL Editor → Run
--  Idempotente: seguro correrlo varias veces.
-- ════════════════════════════════════════════════════════════════

-- ---------- PROGRAMAS ----------
create table if not exists public.shows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  studio int,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);
alter table public.shows add column if not exists studio int;

-- ---------- CAPÍTULOS ----------
create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid references public.shows(id) on delete cascade,
  name text not null,
  created_by uuid default auth.uid(),
  updated_at timestamptz default now()
);
-- columnas que usa la app (se agregan si la tabla ya existía sin ellas)
alter table public.episodes add column if not exists xls_name  text;
alter table public.episodes add column if not exists xls_path  text;
alter table public.episodes add column if not exists pdf_name  text;
alter table public.episodes add column if not exists pdf_path  text;
alter table public.episodes add column if not exists json_path text;
alter table public.episodes add column if not exists progress  jsonb default '{}'::jsonb;
alter table public.episodes add column if not exists marks     jsonb default '{}'::jsonb;
create index if not exists episodes_show_idx on public.episodes(show_id);

-- ---------- LIBRETO PROCESADO (apertura rápida) ----------
create table if not exists public.episode_data (
  ep_id uuid primary key,
  show_id uuid,
  data jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists episode_data_show_idx on public.episode_data(show_id);

-- ---------- SEGURIDAD (RLS) compartida entre el estudio ----------
alter table public.shows        enable row level security;
alter table public.episodes     enable row level security;
alter table public.episode_data enable row level security;

drop policy if exists shows_all on public.shows;
create policy shows_all on public.shows for all to authenticated using (true) with check (true);

drop policy if exists eps_all on public.episodes;
create policy eps_all on public.episodes for all to authenticated using (true) with check (true);

drop policy if exists epdata_all on public.episode_data;
create policy epdata_all on public.episode_data for all to authenticated using (true) with check (true);

-- ---------- FUSIÓN CONCURRENTE (progreso/marcas anti-pisado) ----------
create or replace function public.merge_episode_progress(p_id uuid, p_patch jsonb)
returns void language sql security definer set search_path = public as $$
  update episodes set progress = coalesce(progress,'{}'::jsonb) || coalesce(p_patch,'{}'::jsonb),
    updated_at = now() where id = p_id;
$$;
create or replace function public.merge_episode_marks(p_id uuid, p_patch jsonb)
returns void language sql security definer set search_path = public as $$
  update episodes set marks = coalesce(marks,'{}'::jsonb) || coalesce(p_patch,'{}'::jsonb),
    updated_at = now() where id = p_id;
$$;
grant execute on function public.merge_episode_progress(uuid,jsonb) to authenticated;
grant execute on function public.merge_episode_marks(uuid,jsonb)    to authenticated;

-- ---------- ALMACENAMIENTO: bucket "libretos" (PDF/archivos) ----------
insert into storage.buckets (id, name, public)
values ('libretos','libretos', false) on conflict (id) do nothing;

drop policy if exists libretos_read   on storage.objects;
drop policy if exists libretos_write  on storage.objects;
drop policy if exists libretos_update on storage.objects;
drop policy if exists libretos_delete on storage.objects;
create policy libretos_read   on storage.objects for select to authenticated using (bucket_id='libretos');
create policy libretos_write  on storage.objects for insert to authenticated with check (bucket_id='libretos');
create policy libretos_update on storage.objects for update to authenticated using (bucket_id='libretos');
create policy libretos_delete on storage.objects for delete to authenticated using (bucket_id='libretos');

-- ════════════════════════════════════════════════════════════════
--  LOGIN REAL · perfiles de usuario (role) creados al registrarse
-- ════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'member' check (role in ('member','casting','admin')),
  studio int,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_self on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''),
          coalesce(new.raw_user_meta_data->>'role','member'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Verificación:
-- select table_name from information_schema.tables where table_schema='public'
--   and table_name in ('shows','episodes','episode_data','profiles');   -- 4 filas
