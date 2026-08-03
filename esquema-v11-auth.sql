-- ============================================================
--  ESQUEMA v11.1 · Autenticación real + Desglose automático
--  Pega TODO en: Supabase → SQL Editor → New query → Run
--  Idempotente: puedes correrlo varias veces sin romper nada.
--  (v11.1: se crea la tabla profiles ANTES de las funciones que la usan)
-- ============================================================
--
--  Sobre "users": en Supabase NO creas tú la tabla de contraseñas.
--  `auth.users` ya guarda email + password_hash CIFRADO (bcrypt) y emite
--  JWT. Nosotros solo añadimos `public.profiles` con role/studio.
-- ============================================================

-- ── 1) PERFILES (extiende auth.users) — PRIMERO, para que las
--        funciones y políticas de abajo puedan referenciarla ──
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'member' check (role in ('member','casting','admin')),
  studio     int,
  created_at timestamptz not null default now()
);

-- ── 2) Utilidad: ¿el usuario actual es admin? ───────────────
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false)
$$;

-- ── 3) Seguridad (RLS) de profiles ──────────────────────────
alter table public.profiles enable row level security;

drop policy if exists profiles_read  on public.profiles;
drop policy if exists profiles_self  on public.profiles;
drop policy if exists profiles_admin on public.profiles;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Evita que un usuario común se cambie el rol a sí mismo.
create or replace function public.lock_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then new.role := old.role; end if;
  return new;
end $$;

drop trigger if exists trg_lock_role on public.profiles;
create trigger trg_lock_role before update on public.profiles
  for each row execute function public.lock_role();

-- Crea el perfil AUTOMÁTICAMENTE al registrarse.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.raw_user_meta_data->>'role', 'member'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 4) PROGRAMAS y CAPÍTULOS ────────────────────────────────
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
  pdf_path   text,
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

-- ── 5) GUIONES PROCESADOS (texto fuente del desglose) ───────
create table if not exists public.scripts (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid references public.episodes(id) on delete cascade,
  show_id     uuid references public.shows(id)     on delete set null,
  name        text not null,
  source_type text not null check (source_type in ('pdf','docx')),
  source_path text,
  num_pages   int,
  full_text   text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz default now()
);
create index if not exists scripts_ep_idx on public.scripts(episode_id);

-- ── 6) DESGLOSES GENERADOS (salida estructurada, editable) ──
create table if not exists public.breakdowns (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid references public.episodes(id) on delete cascade,
  script_id   uuid references public.scripts(id)  on delete set null,
  data        jsonb not null default '{}'::jsonb,
  edited      boolean not null default false,
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

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_bd_touch on public.breakdowns;
create trigger trg_bd_touch before update on public.breakdowns
  for each row execute function public.touch_updated_at();

-- ── 7) STORAGE: bucket para los guiones originales ──────────
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

-- ── Verificación ────────────────────────────────────────────
-- select table_name from information_schema.tables
--   where table_schema='public'
--   and table_name in ('profiles','shows','episodes','scripts','breakdowns'); -- 5 filas
