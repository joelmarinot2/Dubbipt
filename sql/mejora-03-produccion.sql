-- ─────────────────────────────────────────────────────────────────────────────
-- mejora-03-produccion.sql · Producción: lo que viene de DublajeCast, guardado
-- por espacio de trabajo y compartido con quien lo tenga.
--
-- Córrelo UNA vez en el SQL Editor de Supabase (proyecto de Dubbipt). Si no se
-- corre, Dubbipt guarda Producción en la carpeta del usuario, en el almacén, y
-- lo dice: funciona igual, pero solo lo ve ese usuario.
--
-- Una fila por espacio de trabajo con el JSON entero y un número de revisión.
-- La ve y la escribe el dueño del espacio, o un administrador.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.produccion (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  data         jsonb       not null default '{}'::jsonb,
  rev          integer     not null default 0,
  updated_at   timestamptz not null default now()
);

alter table public.produccion enable row level security;

drop policy if exists produccion_rw on public.produccion;
create policy produccion_rw on public.produccion
  for all to authenticated
  using (
    exists (select 1 from public.workspaces w
             where w.id = workspace_id and (w.owner = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.workspaces w
             where w.id = workspace_id and (w.owner = auth.uid() or public.is_admin()))
  );

grant select, insert, update, delete on public.produccion to authenticated;

-- Para que PostgREST vea la tabla nueva sin esperar.
notify pgrst, 'reload schema';
