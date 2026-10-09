-- ─────────────────────────────────────────────────────────────────────────────
-- mejora-05-estado-episodios.sql · Marcar cada episodio de Dubbipt como en
-- producción o completado (especificación 09, PRO-31).
--
-- Córrelo UNA vez en el SQL Editor de Supabase (proyecto de Dubbipt). Si no se
-- corre, Dubbipt guarda el estado de cada episodio solo en el equipo donde se
-- marca, y lo dice: funciona igual, pero los demás no lo ven.
--
-- Añade a la tabla de capítulos una columna con su estado: «en_curso» (en
-- producción, lo de siempre) o «completo». No cambia ningún permiso. Correrlo
-- otra vez no hace nada.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.episodes
  add column if not exists estado text not null default 'en_curso';

alter table public.episodes
  drop constraint if exists episodes_estado_valido;
alter table public.episodes
  add constraint episodes_estado_valido check (estado in ('en_curso', 'completo'));
