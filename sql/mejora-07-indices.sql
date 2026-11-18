-- ─────────────────────────────────────────────────────────────────────────────
-- mejora-07-indices.sql · Índices para que las consultas de Dubbipt no recorran
-- tablas enteras (especificación 07, ENT-30: «índices en consultas»).
--
-- Córrelo UNA vez en el SQL Editor de Supabase (proyecto de Dubbipt). Sin él,
-- Dubbipt funciona igual; con él, abrir la biblioteca, un programa o un capítulo
-- busca por índice en vez de leer la tabla de arriba abajo, y la base trabaja
-- menos (la instancia pequeña de Supabase se quedó sin memoria una vez, SYN-18).
--
-- Solo crea índices: no cambia datos ni permisos. Correrlo otra vez no hace nada.
--
-- Lo que pregunta Dubbipt, y el índice que lo atiende:
--   · los capítulos de un programa ........... episodes (show_id)
--   · el libreto de cada capítulo de un programa (precarga, sugerencias,
--     reasignar en todos los capítulos) ........ episode_data (show_id)
--   · los programas de un espacio de trabajo
--     (y las políticas de seguridad, que lo miran en CADA consulta) ... shows (workspace_id)
--   · la biblioteca, ordenada por nombre ...... episodes (show_id, name)
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists episodes_show_id_idx       on public.episodes (show_id);
create index if not exists episodes_show_nombre_idx   on public.episodes (show_id, name);
create index if not exists episode_data_show_id_idx   on public.episode_data (show_id);
create index if not exists shows_workspace_id_idx     on public.shows (workspace_id);

-- Que el planificador se entere de los índices nuevos.
analyze public.episodes;
analyze public.episode_data;
analyze public.shows;
