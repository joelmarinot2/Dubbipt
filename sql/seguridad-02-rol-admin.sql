-- ════════════════════════════════════════════════════════════════
--  SEGURIDAD 02 · Rol de permisos (profiles.role) no manipulable
--  Auditoría 28-ago-2026, hallazgo S3 (crítico)
--
--  Problema: el trigger de registro copiaba `role` desde los metadatos
--  que envía el cliente (signUp con data:{role:'admin'} creaba un admin),
--  y la política profiles_self permitía a cualquier usuario cambiar su
--  propia columna `role`.
--
--  Cómo aplicar: Supabase → SQL Editor → New query → pegar todo → Run.
--  Idempotente. Los roles de permiso se asignan SOLO desde aquí:
--     update public.profiles set role = 'admin' where email = 'correo@...';
-- ════════════════════════════════════════════════════════════════

-- 1) ¿El usuario actual es admin? (security definer para poder leer
--    profiles desde políticas/triggers sin recursión de RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

-- 2) Registro: el rol de permisos nace SIEMPRE como 'member'.
--    (full_name sí se toma de los metadatos; el "cargo" que el usuario
--    escribe en su perfil vive en user_metadata y no da permisos.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'member')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Nadie cambia su propio rol: solo un admin puede modificar `role`.
create or replace function public.lock_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end $$;

drop trigger if exists trg_lock_role on public.profiles;
create trigger trg_lock_role
  before update on public.profiles
  for each row execute function public.lock_role();

-- 4) Cinturón y tirantes: nadie con sesión puede insertar/borrar filas
--    de profiles a mano (las crea el trigger de registro).
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ── Verificación 1: triggers instalados (2 filas) ──
select tgname, tgrelid::regclass as tabla
  from pg_trigger
 where tgname in ('on_auth_user_created','trg_lock_role');

-- ── Verificación 2: REVISA esta lista. Son las cuentas admin actuales.
--    Si hay alguna que no reconoces, quítala con:
--      update public.profiles set role='member' where email='...';
select email, full_name, role, created_at
  from public.profiles
 where role <> 'member'
 order by created_at;
