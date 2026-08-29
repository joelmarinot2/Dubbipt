-- ════════════════════════════════════════════════════════════════
--  SEGURIDAD 01 · RPC merge_episode_marks / merge_episode_progress
--  Auditoría 28-ago-2026, hallazgo S2 (crítico)
--
--  Problema: ambas funciones eran SECURITY DEFINER (saltan RLS), no
--  comprobaban el dueño del capítulo, y Postgres concede EXECUTE a PUBLIC
--  al crear funciones → cualquiera con la anon key, SIN cuenta, podía
--  sobrescribir marcas y progreso de cualquier capítulo por UUID.
--
--  Cómo aplicar: Supabase → SQL Editor → New query → pegar todo → Run.
--  Es idempotente: se puede ejecutar más de una vez sin problema.
-- ════════════════════════════════════════════════════════════════

-- 1) Sin SECURITY DEFINER → la política eps_rw (RLS) decide qué filas
--    puede tocar el usuario. Además, condición explícita de propietario.
create or replace function public.merge_episode_progress(p_id uuid, p_patch jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.episodes
     set progress   = coalesce(progress,'{}'::jsonb) || coalesce(p_patch,'{}'::jsonb),
         updated_at = now()
   where id = p_id
     and show_id in (
           select s.id
             from public.shows s
             join public.workspaces w on w.id = s.workspace_id
            where w.owner = auth.uid()
         );
$$;

create or replace function public.merge_episode_marks(p_id uuid, p_patch jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.episodes
     set marks      = coalesce(marks,'{}'::jsonb) || coalesce(p_patch,'{}'::jsonb),
         updated_at = now()
   where id = p_id
     and show_id in (
           select s.id
             from public.shows s
             join public.workspaces w on w.id = s.workspace_id
            where w.owner = auth.uid()
         );
$$;

-- 2) Solo usuarios con sesión pueden llamarlas (ni anon ni public).
revoke execute on function public.merge_episode_progress(uuid,jsonb) from public, anon;
revoke execute on function public.merge_episode_marks(uuid,jsonb)    from public, anon;
grant  execute on function public.merge_episode_progress(uuid,jsonb) to authenticated;
grant  execute on function public.merge_episode_marks(uuid,jsonb)    to authenticated;

-- 3) Que las funciones nuevas que se creen en el futuro NO nazcan públicas.
alter default privileges in schema public revoke execute on functions from public;

-- ── Verificación (debe devolver 2 filas con secdef = false y
--    acl sin "=X/" para PUBLIC ni "anon=X") ──
select p.proname,
       p.prosecdef                       as secdef,
       pg_get_function_identity_arguments(p.oid) as args,
       p.proacl                          as acl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('merge_episode_progress','merge_episode_marks');
