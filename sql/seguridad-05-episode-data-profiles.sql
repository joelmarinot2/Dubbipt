-- ════════════════════════════════════════════════════════════════
--  SEGURIDAD 05 · episode_data por capítulo + profiles solo propio
--  Auditoría 28-ago-2026, hallazgos S5 y S6 (altos)
--
--  Problema 1: la política de episode_data tenía "show_id is null or …":
--  cualquier fila sin programa era legible/escribible por todos, y como
--  ep_id no tiene clave foránea se podían "plantar" datos para el capítulo
--  de otra persona. Además la app a veces guardaba show_id = null.
--  Problema 2: profiles_read using(true) exponía el correo y nombre de
--  todos los usuarios a cualquier cuenta.
--
--  Cómo aplicar: Supabase → SQL Editor → New query → pegar todo → Run.
--  Idempotente. Requiere haber ejecutado seguridad-02 (is_admin).
-- ════════════════════════════════════════════════════════════════

-- 1) ¿El capítulo pertenece a un programa de mis workspaces?
create or replace function public.owns_episode(p_ep uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.episodes e
      join public.shows s      on s.id = e.show_id
      join public.workspaces w on w.id = s.workspace_id
     where e.id = p_ep
       and w.owner = auth.uid()
  )
$$;
revoke execute on function public.owns_episode(uuid) from public, anon;
grant  execute on function public.owns_episode(uuid) to authenticated;

-- 2) episode_data: acceso SOLO por capítulo propio (sin la puerta show_id is null)
drop policy if exists epdata_all on public.episode_data;
drop policy if exists epdata_rw  on public.episode_data;
create policy epdata_rw on public.episode_data
  for all to authenticated
  using      (public.owns_episode(ep_id))
  with check (public.owns_episode(ep_id));

-- 3) show_id siempre coherente con la tabla episodes (la app ya no decide)
create or replace function public.epdata_fill_show()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select e.show_id into new.show_id from public.episodes e where e.id = new.ep_id;
  return new;
end $$;
drop trigger if exists trg_epdata_show on public.episode_data;
create trigger trg_epdata_show
  before insert or update on public.episode_data
  for each row execute function public.epdata_fill_show();

-- 4) Reparar filas existentes con show_id nulo o desactualizado
update public.episode_data d
   set show_id = e.show_id
  from public.episodes e
 where e.id = d.ep_id
   and d.show_id is distinct from e.show_id;

-- 5) profiles: cada usuario ve solo su fila (los admin, todas)
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- ── Verificación 1: políticas (epdata_rw con owns_episode; profiles_read con auth.uid) ──
select tablename, policyname, cmd, coalesce(qual, with_check) as condicion
  from pg_policies
 where schemaname = 'public' and tablename in ('episode_data','profiles')
 order by tablename, policyname;

-- ── Verificación 2: REVISA. Filas de episode_data sin capítulo (huérfanas o
--    plantadas). Nadie puede verlas ya; si no reconoces ninguna, bórralas con:
--      delete from public.episode_data d
--       where not exists (select 1 from public.episodes e where e.id = d.ep_id);
select d.ep_id, d.show_id, d.updated_at, pg_size_pretty(pg_column_size(d.data)::bigint) as tamano
  from public.episode_data d
 where not exists (select 1 from public.episodes e where e.id = d.ep_id)
 order by d.updated_at desc;
