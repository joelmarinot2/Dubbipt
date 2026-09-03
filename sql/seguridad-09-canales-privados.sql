-- ════════════════════════════════════════════════════════════════════
--  Seguridad 09 · Canales de Realtime PRIVADOS
--  Cierra el hallazgo S9: hoy los canales son publicos y cualquier cuenta
--  registrada puede unirse a un tema si conoce (o adivina) su nombre.
--
--  Idempotente: se puede ejecutar mas de una vez.
--
--  ORDEN DE APLICACION -- IMPORTANTE
--    1) Ejecutar ESTE archivo en Supabase -> SQL Editor.
--       No rompe nada: las politicas solo se aplican a canales marcados
--       como privados, y la app todavia no los marca.
--    2) Avisar para activar la bandera RT_PRIVATE en la app y desplegar.
--    3) Comprobar en sala que la sincronia sigue viva (ver "COMPROBAR").
--  Si se hace al reves -desplegar la app antes que este SQL- la sincronia
--  deja de funcionar en seco.
-- ════════════════════════════════════════════════════════════════════

-- ── 1) ¿Puede la persona conectada usar este espacio de trabajo? ─────
-- Recibe TEXTO y no uuid a proposito: el tema del canal es una cadena y un
-- cast directo reventaria la politica si alguien se inventa un tema.
-- Hoy un espacio tiene un unico dueño. Si mas adelante se añaden miembros,
-- este es el UNICO sitio que hay que tocar.
create or replace function public.rt_ws_ok(p_ws text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v uuid;
begin
  begin
    v := p_ws::uuid;
  exception when others then
    return false;                      -- tema con forma rara: no
  end;
  return exists (
    select 1 from public.workspaces w
     where w.id = v and w.owner = auth.uid()
  );
end $$;

revoke execute on function public.rt_ws_ok(text) from public, anon;
grant  execute on function public.rt_ws_ok(text) to authenticated;

-- ── 2) ¿Es un tema de Dubbipt que esta persona puede usar? ───────────
create or replace function public.rt_dubbipt_ok()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- sala de sincronia de un espacio:  ws:<uuid>
    when realtime.topic() like 'ws:%'
      then public.rt_ws_ok(split_part(realtime.topic(), ':', 2))

    -- nombres de los conectados de un espacio:  ddl:online:<uuid>
    when realtime.topic() like 'ddl:online:%'
      then public.rt_ws_ok(split_part(realtime.topic(), ':', 3))

    -- contador global de conectados. No lleva NINGUN dato: se publica un
    -- objeto vacio y solo sirve para contar cabezas (ver v10.36.0).
    when realtime.topic() = 'ddl:online'   then true

    -- avisos de biblioteca. Sigue siendo global: transporta ids de programa
    -- y capitulo, que sin RLS no sirven de nada, pero conviene pasarlo a
    -- 'ddl:library:<uuid>' mas adelante y tratarlo como los de arriba.
    when realtime.topic() = 'ddl:library'  then true

    else false                          -- cualquier otro tema: no
  end;
$$;

revoke execute on function public.rt_dubbipt_ok() from public, anon;
grant  execute on function public.rt_dubbipt_ok() to authenticated;

-- ── 3) Politicas sobre realtime.messages ────────────────────────────
-- En los canales privados, Realtime consulta esta tabla:
--   SELECT  -> puede ESCUCHAR el tema
--   INSERT  -> puede ENVIAR (broadcast y presencia)
alter table realtime.messages enable row level security;

drop policy if exists dubbipt_rt_leer   on realtime.messages;
drop policy if exists dubbipt_rt_enviar on realtime.messages;

create policy dubbipt_rt_leer on realtime.messages
  for select to authenticated
  using ( public.rt_dubbipt_ok() );

create policy dubbipt_rt_enviar on realtime.messages
  for insert to authenticated
  with check ( public.rt_dubbipt_ok() );

grant select, insert on realtime.messages to authenticated;

-- ── COMPROBAR ───────────────────────────────────────────────────────
-- a) Las dos politicas existen y ninguna dice "true" a secas:
--      select policyname, cmd, coalesce(qual, with_check) as condicion
--        from pg_policies
--       where schemaname = 'realtime' and tablename = 'messages';
--
-- b) Con sesion iniciada, sobre un espacio PROPIO devuelve true y sobre uno
--    ajeno false:
--      select public.rt_ws_ok('<uuid-de-un-espacio-tuyo>');   -- true
--      select public.rt_ws_ok('no-soy-un-uuid');              -- false
--
-- c) Tras activar RT_PRIVATE en la app: abrir la tablet y el escritorio y
--    confirmar que el chip dice "Sincronizado", que el desplazamiento del
--    director mueve al escritorio y que una marca del actor llega a los dos.
--
-- ── DESHACER ────────────────────────────────────────────────────────
-- Si algo va mal, volver a poner RT_PRIVATE en false y desplegar; los
-- canales publicos siguen funcionando con estas politicas puestas. Para
-- quitarlas del todo:
--      drop policy if exists dubbipt_rt_leer   on realtime.messages;
--      drop policy if exists dubbipt_rt_enviar on realtime.messages;
