-- ════════════════════════════════════════════════════════════════
--  MEJORA 02 · El admin puede ver el contenido de cada usuario
--  05-sep-2026
--
--  La RLS restringe programas/episodios al dueño (owner del workspace), así que
--  ni un admin los ve con las consultas normales. Esta RPC SOLO-ADMIN devuelve,
--  para un usuario dado, el árbol completo:
--      espacios de trabajo → programas (shows) → episodios (episodes).
--
--  Requiere: sql/seguridad-02 (is_admin). Cómo aplicar: SQL Editor → Run. Idempotente.
-- ════════════════════════════════════════════════════════════════

create or replace function public.admin_user_content(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not public.is_admin() then null else coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', w.id, 'name', w.name, 'created_at', w.created_at,
        'shows', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', s.id, 'name', s.name, 'created_at', s.created_at,
              'episodes', coalesce((
                select jsonb_agg(
                  jsonb_build_object('id', e.id, 'name', e.name, 'updated_at', e.updated_at)
                  order by e.updated_at desc
                )
                from public.episodes e where e.show_id = s.id
              ), '[]'::jsonb)
            )
            order by s.name
          )
          from public.shows s where s.workspace_id = w.id
        ), '[]'::jsonb)
      )
      order by w.name
    )
    from public.workspaces w where w.owner = p_user
  ), '[]'::jsonb) end
$$;
revoke execute on function public.admin_user_content(uuid) from public, anon;
grant  execute on function public.admin_user_content(uuid) to authenticated;

-- ── Verificación (desde el SQL Editor devuelve null porque no hay sesión admin;
--    pruébalo desde la app o pasando un uuid con is_admin activo). ──
-- select public.admin_user_content('<uuid-de-un-usuario>');
