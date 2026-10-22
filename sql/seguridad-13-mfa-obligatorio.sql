-- ════════════════════════════════════════════════════════════════════
--  Seguridad 13 · Verificación en dos pasos OBLIGATORIA también en la nube
--  (especificacion 07, ENT-20)
--
--  La app ya pide el código del autenticador al entrar (v11.81.0). Esto
--  hace que la NUBE tampoco entregue nada a una sesión sin verificar: cada
--  tabla con RLS y los archivos (Storage) exigen que la sesión sea «aal2»,
--  es decir, que se haya puesto el código. Así no basta con saltarse la
--  pantalla del código con la contraseña robada.
--
--  Son políticas RESTRICTIVAS: se suman a las que ya hay (dueño del espacio,
--  administrador…), no las sustituyen.
--
--  Idempotente: se puede ejecutar más de una vez.
--
--  ORDEN DE APLICACIÓN -- IMPORTANTE
--    0) En Supabase -> Authentication -> Multi-Factor: TOTP «Enabled»
--       (viene así por defecto). Es gratis en todos los planes.
--    1) Desplegar la app v11.81.0 o posterior.
--    2) Que cada persona entre una vez: activará su autenticador.
--    3) Ejecutar ESTE archivo en Supabase -> SQL Editor.
--  Si se ejecuta antes del paso 1, nadie ve sus datos hasta tener la app
--  nueva: las sesiones de la app vieja no llevan el código («aal1»).
--
--  Lo que NO cubre: las funciones «security definer» (RPC) se saltan RLS
--  por diseño; las de Dubbipt ya comprueban quién llama.
-- ════════════════════════════════════════════════════════════════════

-- ── 1) Todas las tablas de public con RLS activado ───────────────────
do $$
declare r record;
begin
  for r in select schemaname, tablename from pg_tables where schemaname = 'public' and rowsecurity loop
    execute format('drop policy if exists mfa_aal2 on %I.%I', r.schemaname, r.tablename);
    execute format('create policy mfa_aal2 on %I.%I as restrictive for all to authenticated '
                || 'using ((select auth.jwt() ->> ''aal'') = ''aal2'') '
                || 'with check ((select auth.jwt() ->> ''aal'') = ''aal2'')', r.schemaname, r.tablename);
  end loop;
end $$;

-- ── 2) Los archivos (libretos, portadas…) ────────────────────────────
drop policy if exists mfa_aal2 on storage.objects;
create policy mfa_aal2 on storage.objects as restrictive for all to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

-- ── 3) Los canales privados de Realtime (seguridad-09), si existen ───
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists mfa_aal2 on realtime.messages';
    execute 'create policy mfa_aal2 on realtime.messages as restrictive for all to authenticated '
         || 'using ((select auth.jwt() ->> ''aal'') = ''aal2'') '
         || 'with check ((select auth.jwt() ->> ''aal'') = ''aal2'')';
  end if;
end $$;

-- ── COMPROBAR ────────────────────────────────────────────────────────
-- Dónde quedó puesta (una fila por tabla):
--   select schemaname, tablename from pg_policies where policyname = 'mfa_aal2' order by 1, 2;
-- Tablas de public SIN RLS (esas no las protege ninguna política; deberían ser ninguna):
--   select tablename from pg_tables where schemaname = 'public' and not rowsecurity;

-- ── REINICIAR EL AUTENTICADOR DE UNA PERSONA (perdió el teléfono) ────
-- Al volver a entrar, la app le pedirá activar uno nuevo con un QR:
--   delete from auth.mfa_factors
--    where user_id = (select id from auth.users where email = 'correo@estudio.com');

-- ── DESHACER (solo si hiciera falta) ─────────────────────────────────
--   do $$ declare r record; begin
--     for r in select schemaname, tablename from pg_policies where policyname = 'mfa_aal2' loop
--       execute format('drop policy if exists mfa_aal2 on %I.%I', r.schemaname, r.tablename);
--     end loop; end $$;
