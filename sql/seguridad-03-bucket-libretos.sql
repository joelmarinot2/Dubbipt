-- ════════════════════════════════════════════════════════════════
--  SEGURIDAD 03 · Bucket "libretos" aislado por workspace
--  Auditoría 28-ago-2026, hallazgo S4 (crítico)
--
--  Problema: las políticas solo comprobaban bucket_id='libretos', así que
--  cualquier usuario con sesión podía listar, descargar, sustituir y
--  borrar los guiones (PDF/XLSM/JSON/audio) de TODOS los estudios.
--
--  Rutas que usa la app:  <show_id>/<episode_id>/<archivo>
--                         _diag/<user_id>/probe-xxxx.txt   (prueba de nube)
--
--  Cómo aplicar: Supabase → SQL Editor → New query → pegar todo → Run.
--  Idempotente. Requiere la app v10.15.2 o superior (la prueba de nube
--  escribe ahora en _diag/<user_id>/).
-- ════════════════════════════════════════════════════════════════

-- 1) ¿La ruta pertenece a un programa de mis workspaces (o a mi carpeta _diag)?
create or replace function public.owns_libreto_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (storage.foldername(p_name))[1] = '_diag'
      then (storage.foldername(p_name))[2] = auth.uid()::text
    else exists (
      select 1
        from public.shows s
        join public.workspaces w on w.id = s.workspace_id
       where s.id::text = (storage.foldername(p_name))[1]
         and w.owner = auth.uid()
    )
  end
$$;
revoke execute on function public.owns_libreto_path(text) from public, anon;
grant  execute on function public.owns_libreto_path(text) to authenticated;

-- 2) Políticas: mismas 4 operaciones, ahora con comprobación de dueño.
drop policy if exists libretos_read   on storage.objects;
drop policy if exists libretos_write  on storage.objects;
drop policy if exists libretos_update on storage.objects;
drop policy if exists libretos_delete on storage.objects;

create policy libretos_read on storage.objects
  for select to authenticated
  using (bucket_id = 'libretos' and public.owns_libreto_path(name));

create policy libretos_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'libretos' and public.owns_libreto_path(name));

create policy libretos_update on storage.objects
  for update to authenticated
  using      (bucket_id = 'libretos' and public.owns_libreto_path(name))
  with check (bucket_id = 'libretos' and public.owns_libreto_path(name));

create policy libretos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'libretos' and public.owns_libreto_path(name));

-- 3) Limpieza: sondas viejas que quedaron sueltas en _diag/ (2 bytes cada una)
delete from storage.objects
 where bucket_id = 'libretos'
   and name like '_diag/probe-%';

-- ── Verificación 1: 4 políticas, todas con owns_libreto_path ──
select policyname, cmd, coalesce(qual, with_check) as condicion
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname like 'libretos%'
 order by policyname;

-- ── Verificación 2: REVISA. Programas sin workspace: sus archivos quedan
--    inaccesibles hasta asignarles uno. Si sale alguno, asígnalo con:
--      update public.shows set workspace_id = '<uuid del workspace>' where id = '<uuid del show>';
select id, name, created_at
  from public.shows
 where workspace_id is null
 order by created_at;

-- ── Verificación 3: archivos del bucket cuya carpeta no es un show conocido
--    (huérfanos: no los verá nadie; revisa antes de borrarlos) ──
select o.name, o.created_at
  from storage.objects o
 where o.bucket_id = 'libretos'
   and (storage.foldername(o.name))[1] <> '_diag'
   and not exists (select 1 from public.shows s where s.id::text = (storage.foldername(o.name))[1])
 order by o.created_at;
