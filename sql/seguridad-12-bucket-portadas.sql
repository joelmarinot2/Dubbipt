-- ════════════════════════════════════════════════════════════════
--  SEGURIDAD 12 · Bucket "portadas" aislado por dueño
--  Revisión 05-sep-2026, hallazgo S12
--
--  Problema: las políticas solo comprobaban bucket_id='portadas', así que
--  CUALQUIER usuario con sesión podía sobrescribir o borrar la carátula/portada
--  de CUALQUIER estudio, y subir archivos arbitrarios a un bucket público
--  servido bajo el dominio de la app. Además el bucket era listable sin sesión
--  (la anon key podía enumerar la carpeta 'covers').
--
--  Ruta que usa la app:  covers/<show_id>/<caratula|portada>.<ext>
--  (index.html:5334 y 6861 → sb.storage.from('portadas').upload('covers/'+sh.id+'/...'))
--
--  Cómo aplicar: Supabase → SQL Editor → New query → pegar todo → Run.
--  Idempotente. Requiere el modelo con workspaces (esquema-original-v11.sql).
-- ════════════════════════════════════════════════════════════════

-- El bucket sigue siendo público SOLO para servir las imágenes por URL directa
-- (getPublicUrl). La RLS de abajo gobierna la API de listar/escribir/borrar.
insert into storage.buckets (id, name, public) values ('portadas','portadas', true)
on conflict (id) do nothing;

-- ¿La ruta pertenece a un programa de un workspace del usuario?
create or replace function public.owns_portada_path(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (storage.foldername(p_name))[1] = 'covers'
     and exists (
       select 1
         from public.shows s
         join public.workspaces w on w.id = s.workspace_id
        where s.id::text = (storage.foldername(p_name))[2]
          and w.owner = auth.uid()
     )
$$;
revoke execute on function public.owns_portada_path(text) from public, anon;
grant  execute on function public.owns_portada_path(text) to authenticated;

drop policy if exists portadas_read   on storage.objects;
drop policy if exists portadas_write  on storage.objects;
drop policy if exists portadas_update on storage.objects;
drop policy if exists portadas_delete on storage.objects;

-- Lectura por la API: solo cuentas con sesión y solo sus propias rutas (corta la
-- enumeración anónima). La VISUALIZACIÓN de las imágenes sigue funcionando para
-- todos vía la URL pública directa, porque el bucket es public=true.
create policy portadas_read on storage.objects
  for select to authenticated
  using (bucket_id = 'portadas' and public.owns_portada_path(name));

create policy portadas_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portadas' and public.owns_portada_path(name));

create policy portadas_update on storage.objects
  for update to authenticated
  using      (bucket_id = 'portadas' and public.owns_portada_path(name))
  with check (bucket_id = 'portadas' and public.owns_portada_path(name));

create policy portadas_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'portadas' and public.owns_portada_path(name));

-- ── Verificación 1: 4 políticas, todas con owns_portada_path ──
select policyname, cmd, coalesce(qual, with_check) as condicion
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
   and policyname like 'portadas%'
 order by policyname;

-- ── Verificación 2: archivos cuya carpeta no es un show conocido (huérfanos) ──
select o.name, o.created_at
  from storage.objects o
 where o.bucket_id = 'portadas'
   and not exists (
     select 1 from public.shows s
      where s.id::text = (storage.foldername(o.name))[2]
   )
 order by o.created_at;
