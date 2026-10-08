-- ─────────────────────────────────────────────────────────────────────────────
-- mejora-04-estado-programas.sql · Marcar los programas de Dubbipt como
-- completados (especificación 09, PRO-25).
--
-- Córrelo UNA vez en el SQL Editor de Supabase (proyecto de Dubbipt). Si no se
-- corre, Dubbipt guarda el estado de cada programa solo en el equipo donde se
-- marca, y lo dice: funciona igual, pero los demás no lo ven.
--
-- Añade a la tabla de programas una columna con su estado: «en_curso» (lo de
-- siempre) o «completo». Quien ya podía renombrar un programa puede marcarlo:
-- no cambia ningún permiso. Correrlo otra vez no hace nada.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.shows
  add column if not exists estado text not null default 'en_curso';

alter table public.shows
  drop constraint if exists shows_estado_valido;
alter table public.shows
  add constraint shows_estado_valido check (estado in ('en_curso', 'completo'));
