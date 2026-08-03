-- ============================================================
--  ESQUEMA v11 · Autenticación real + Desglose automático
--  Pega TODO en: Supabase (proyecto NUEVO) → SQL Editor → New query → Run
--  Es idempotente: puedes correrlo varias veces sin romper nada.
-- ============================================================
--
--  NOTA DE SEGURIDAD sobre la tabla "users":
--  En Supabase NO creas tú la tabla de contraseñas. Supabase ya tiene
--  `auth.users` (maneja email + password_hash CIFRADO con bcrypt del lado
--  del servidor, tokens JWT, refresh, etc.). Reimplementar el hash a mano
--  sería inseguro. Lo correcto es:
--    · auth.users  → identidad + password_hash (lo gestiona Supabase)
--    · public.profiles → los campos NUESTROS (role, studio, created_at…)
--  Abajo creamos `profiles` con `id, email, role, created_at` y la
--  llenamos automáticamente cuando alguien se registra.
-- ============================================================

-- ── 0) Utilidad: ¿el usuario actual es admin? ───────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false)
$$;

-- ── 1) PERFILES (extiende auth.users con role/studio) ───────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'member' check (role in ('member','casting','admin')),
  studio     int,                          -- 1..8 · null = ve todos los estudios
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_self    on public.profiles;
drop policy if exists profiles_admin   on public.profiles;

-- cada quien lee su propio perfil; los admin leen todos
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
-- cada quien edita su propio perfil (pero NO puede auto-ascenderse: ver trigger)
create policy profiles_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- los admin pueden todo (cambiar roles, borrar)
create policy profiles_admin on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Evita que un usuario común se cambie el rol a sí mismo por la API.
create or replace function public.lock_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.role := old.role;      -- ignora cualquier intento de subir de rol
  end if;
  return new;
end $$;

drop trigger if exists trg_lock_role on public.profiles;
create trigger trg_lock_role before update on public.profiles
  for each row execute function public.lock_role();

-- Crea el perfil AUTOMÁTICAMENTE al registrarse (Auth → nuevo usuario).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'member')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 2) PROGRAMAS y CAPÍTULOS (igual que antes, por compatibilidad) ──
create table if not exists public.shows (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  studio     int,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists public.episodes (
  id         uuid primary key default gen_random_uuid(),
  show_id    uuid references public.shows(id) on delete cascade,
  name       text not null,
  pdf_name   text,
  pdf_path   text,            -- guion original (PDF/DOCX) en Storage
  progress   jsonb default '{}'::jsonb,
  marks      jsonb default '{}'::jsonb,
  updated_at timestamptz default now(),
  created_by uuid default auth.uid()
);
create index if not exists episodes_show_idx on public.episodes(show_id);

alter table public.shows    enable row level security;
alter table public.episodes enable row level security;

drop policy if exists shows_all on public.shows;
create policy shows_all on public.shows for all to authenticated
  using (true) with check (true);

drop policy if exists eps_all on public.episodes;
create policy eps_all on public.episodes for all to authenticated
  using (true) with check (true);

-- ── 3) GUIONES PROCESADOS (fuente del desglose automático) ──
-- Guarda el texto ya extraído del PDF/DOCX para poder re-desglosar
-- sin volver a subir el archivo.
create table if not exists public.scripts (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid references public.episodes(id) on delete cascade,
  show_id     uuid references public.shows(id)     on delete set null,
  name        text not null,
  source_type text not null check (source_type in ('pdf','docx')),
  source_path text,                         -- ruta en Storage (opcional)
  num_pages   int,
  full_text   text,                         -- texto extraído (fuente de verdad)
  created_by  uuid default auth.uid(),
  created_at  timestamptz default now()
);
create index if not exists scripts_ep_idx on public.scripts(episode_id);

-- ── 4) DESGLOSES GENERADOS (salida estructurada, editable) ──
-- data = { chars:[{key,display,talent,pages:[{p,ints}],scenes:[...],totalInts}],
--          scenes:[...], meta:{engine, model, version} }
create table if not exists public.breakdowns (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid references public.episodes(id) on delete cascade,
  script_id   uuid references public.scripts(id)  on delete set null,
  data        jsonb not null default '{}'::jsonb,
  edited      boolean not null default false,     -- true si el usuario lo corrigió a mano
  created_by  uuid default auth.uid(),
  updated_at  timestamptz default now()
);
create unique index if not exists breakdowns_ep_uidx on public.breakdowns(episode_id);

alter table public.scripts    enable row level security;
alter table public.breakdowns enable row level security;

drop policy if exists scripts_rw on public.scripts;
create policy scripts_rw on public.scripts for all to authenticated
  using (true) with check (true);

drop policy if exists breakdowns_rw on public.breakdowns;
create policy breakdowns_rw on public.breakdowns for all to authenticated
  using (true) with check (true);

-- Sella updated_at en cada cambio del desglose.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_bd_touch on public.breakdowns;
create trigger trg_bd_touch before update on public.breakdowns
  for each row execute function public.touch_updated_at();

-- ── 5) STORAGE: bucket para los guiones originales ──────────
insert into storage.buckets (id, name, public)
values ('guiones', 'guiones', false)
on conflict (id) do nothing;

drop policy if exists guiones_read on storage.objects;
drop policy if exists guiones_ins  on storage.objects;
drop policy if exists guiones_upd  on storage.objects;
drop policy if exists guiones_del  on storage.objects;

create policy guiones_read on storage.objects for select to authenticated
  using (bucket_id = 'guiones');
create policy guiones_ins  on storage.objects for insert to authenticated
  with check (bucket_id = 'guiones');
create policy guiones_upd  on storage.objects for update to authenticated
  using (bucket_id = 'guiones');
create policy guiones_del  on storage.objects for delete to authenticated
  using (bucket_id = 'guiones' and public.is_admin());

-- ── Verificación rápida ─────────────────────────────────────
-- select table_name from information_schema.tables
--   where table_schema='public' and table_name in
--   ('profiles','shows','episodes','scripts','breakdowns');   -- 5 filas
-- select proname from pg_proc where proname in
--   ('is_admin','handle_new_user','lock_role');               -- 3 funciones
