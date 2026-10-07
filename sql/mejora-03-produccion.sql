-- ─────────────────────────────────────────────────────────────────────────────
-- mejora-03-produccion.sql · Producción: lo que viene de DublajeCast, guardado
-- por espacio de trabajo y compartido con quien lo tenga.
--
-- Córrelo UNA vez en el SQL Editor de Supabase (proyecto de Dubbipt). Si no se
-- corre, Dubbipt guarda Producción en la carpeta del usuario, en el almacén, y
-- lo dice: funciona igual, pero solo lo ve ese usuario.
--
-- Una fila por espacio de trabajo con el JSON entero y un número de revisión.
-- La ve y la escribe SOLO un administrador (pedido de sala: «que solo el
-- administrador pueda verlos»). Ser dueño del espacio no basta.
-- Si ya la habías creado con la versión anterior, córrelo otra vez: cambia la
-- política sin tocar los datos.
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
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.produccion to authenticated;

-- Para que PostgREST vea la tabla nueva sin esperar.
notify pgrst, 'reload schema';
