-- ════════════════════════════════════════════════════════════════════
--  Seguridad 14 · Registro de accesos (especificacion 07, ENT-24)
--
--  Para poder responder «quién vio el guion X y cuándo», como piden las
--  auditorías de seguridad de contenido (Netflix, TPN): cada vez que alguien
--  entra, abre un libreto, sube uno, descarga un archivo de Dubbipt o imprime,
--  la app (v11.84.0 o posterior) añade una fila aquí.
--
--    · QUIÉN y CUÁNDO los pone el servidor (trigger): no se pueden falsear.
--    · Solo se AÑADE: nadie puede cambiar ni borrar una fila desde la app.
--    · Solo los ADMINISTRADORES la leen (Dubbipt → Casting → Accesos).
--    · Como las demás tablas, exige la sesión verificada con el código del
--      autenticador (aal2, seguridad-13).
--
--  Idempotente: se puede ejecutar más de una vez.
--  Hasta que se ejecute, la app guarda lo que registra en cada equipo y lo
--  manda cuando la tabla ya existe: no se pierde nada.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.auditoria (
  id           bigint generated always as identity primary key,
  creado       timestamptz not null default now(),
  user_id      uuid,
  email        text,
  workspace_id uuid,
  accion       text not null check (char_length(accion) between 1 and 40),
  show_id      uuid,
  episode_id   uuid,
  recurso      text check (recurso is null or char_length(recurso) <= 300),
  detalle      jsonb,
  agente       text check (agente is null or char_length(agente) <= 300),
  cliente_ts   timestamptz
);

create index if not exists auditoria_creado_idx  on public.auditoria (creado desc);
create index if not exists auditoria_user_idx    on public.auditoria (user_id, creado desc);
create index if not exists auditoria_show_idx    on public.auditoria (show_id, creado desc);
create index if not exists auditoria_episode_idx on public.auditoria (episode_id, creado desc);

-- ── Quién y cuándo: lo pone el servidor, diga lo que diga la app ──────
create or replace function public.auditoria_sellar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.email   := (select email from auth.users where id = auth.uid());
  new.creado  := now();
  return new;
end $$;
revoke execute on function public.auditoria_sellar() from public, anon, authenticated;

drop trigger if exists auditoria_sellar on public.auditoria;
create trigger auditoria_sellar before insert on public.auditoria
  for each row execute function public.auditoria_sellar();

-- ── Permisos: añadir (con sesión), leer (solo administradores), nada más ──
alter table public.auditoria enable row level security;
revoke all on public.auditoria from anon;
revoke update, delete, truncate on public.auditoria from authenticated;
grant insert, select on public.auditoria to authenticated;

drop policy if exists auditoria_insertar on public.auditoria;
create policy auditoria_insertar on public.auditoria for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists auditoria_leer on public.auditoria;
create policy auditoria_leer on public.auditoria for select to authenticated
  using (public.is_admin());

-- Verificación en dos pasos (como el resto, seguridad-13)
drop policy if exists mfa_aal2 on public.auditoria;
create policy mfa_aal2 on public.auditoria as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

-- ── COMPROBAR ────────────────────────────────────────────────────────
-- Lo último:
--   select creado, email, accion, detalle->>'programa' as programa, detalle->>'capitulo' as capitulo, recurso
--     from public.auditoria order by creado desc limit 50;
-- Quién vio un capítulo:
--   select creado, email, accion, recurso from public.auditoria
--    where detalle->>'capitulo' ilike '%101%' order by creado;
--
-- ── CONSERVACIÓN ─────────────────────────────────────────────────────
-- Las filas no se borran solas. Si el cliente pide guardarlas un tiempo
-- (por ejemplo, un año) y después borrarlas, eso lo hace un administrador
-- aquí, en el SQL Editor:
--   delete from public.auditoria where creado < now() - interval '1 year';
