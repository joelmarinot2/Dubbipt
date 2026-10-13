-- ─────────────────────────────────────────────────────────────────────────────
-- mejora-06-temporadas.sql · Carpetas por temporada dentro de cada programa
-- (especificación 09, PRO-44).
--
-- Córrelo UNA vez en el SQL Editor de Supabase (proyecto de Dubbipt). Si no se
-- corre, Dubbipt guarda las temporadas de cada programa solo en el equipo donde
-- se crean, y lo dice: funciona igual, pero los demás no las ven.
--
-- Añade a la tabla de programas una columna con sus carpetas y en cuál va cada
-- episodio: { "carpetas": [{ "id", "nombre" }], "eps": { "e:<id>": "<carpeta>" } }.
-- No cambia ningún permiso. Correrlo otra vez no hace nada.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.shows
  add column if not exists temporadas jsonb;

notify pgrst, 'reload schema';
