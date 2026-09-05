-- ════════════════════════════════════════════════════════════════
--  MEJORA 01 · Panel de admin: cambiar rol, última conexión y aprobar registros
--  05-sep-2026
--
--  Añade a public.profiles la columna `approved` y tres RPC SOLO-ADMIN:
--    · admin_list_accounts()      → lista con email, rol, alta, ÚLTIMA CONEXIÓN y estado
--    · admin_set_role(id, rol)    → cambiar el rol de una cuenta
--    · admin_set_approved(id, ok) → aprobar / dejar pendiente una cuenta
--  y una puerta de aprobación: una cuenta NO aprobada no puede crear espacios
--  de trabajo (y por tanto nada cuelga de ella), además del bloqueo en la app.
--
--  Requiere: esquema-original-v11.sql + sql/seguridad-02 (is_admin) aplicados.
--  Cómo aplicar: Supabase → SQL Editor → New query → pegar todo → Run. Idempotente.
-- ════════════════════════════════════════════════════════════════

-- 1) Columna de aprobación. Por defecto FALSE (los registros nuevos nacen pendientes).
alter table public.profiles add column if not exists approved boolean not null default false;

-- 2) Las cuentas que YA existían se dan por aprobadas (no dejar a nadie fuera).
--    Se ejecuta solo una vez de facto: las nuevas nacen en false y se aprueban a mano.
update public.profiles set approved = true where approved is not true and created_at < now();

-- 3) ¿La cuenta actual está aprobada? (para las políticas RLS)
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false)
$$;
revoke execute on function public.is_approved() from public, anon;
grant  execute on function public.is_approved() to authenticated;

-- 4) Puerta dura: sin aprobación no se pueden crear/modificar espacios de trabajo.
--    (Todo —shows, episodes, etc.— cuelga del workspace, así que esto los frena.)
drop policy if exists ws_owner on public.workspaces;
create policy ws_owner on public.workspaces for all to authenticated
  using      (owner = auth.uid())
  with check (owner = auth.uid() and (public.is_approved() or public.is_admin()));

-- 5) RPC: lista de cuentas para el admin, con la ÚLTIMA CONEXIÓN de auth.users.
--    Un no-admin recibe 0 filas (el where corta). auth.users solo es legible
--    porque la función es security definer.
create or replace function public.admin_list_accounts()
returns table(id uuid, email text, full_name text, role text,
              approved boolean, created_at timestamptz, last_sign_in_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name, p.role, p.approved, p.created_at, u.last_sign_in_at
    from public.profiles p
    left join auth.users u on u.id = p.id
   where public.is_admin()
   order by p.approved asc, p.created_at asc
$$;
revoke execute on function public.admin_list_accounts() from public, anon;
grant  execute on function public.admin_list_accounts() to authenticated;

-- 6) RPC: cambiar el rol de una cuenta (solo admin).
create or replace function public.admin_set_role(p_target uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar roles.';
  end if;
  if p_role not in ('member','casting','admin') then
    raise exception 'Rol no válido: %', p_role;
  end if;
  -- no dejar la plataforma sin ningún admin
  if p_role <> 'admin' then
    if (select role from public.profiles where id = p_target) = 'admin'
       and (select count(*) from public.profiles where role = 'admin') <= 1 then
      raise exception 'No puedes quitar el único administrador que queda.';
    end if;
  end if;
  update public.profiles set role = p_role where id = p_target;
end $$;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
grant  execute on function public.admin_set_role(uuid, text) to authenticated;

-- 7) RPC: aprobar / dejar pendiente una cuenta (solo admin).
create or replace function public.admin_set_approved(p_target uuid, p_ok boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede aprobar cuentas.';
  end if;
  update public.profiles set approved = coalesce(p_ok, false) where id = p_target;
end $$;
revoke execute on function public.admin_set_approved(uuid, boolean) from public, anon;
grant  execute on function public.admin_set_approved(uuid, boolean) to authenticated;

-- 8) BOOTSTRAP: tu primer administrador (aprobado). Ejecuta esto DESPUÉS de que
--    la cuenta exista (regístrala en la app o créala en Authentication → Users).
--    IMPORTANTE: hay que desactivar trg_lock_role mientras tanto, porque desde el
--    SQL Editor auth.uid() es NULL → is_admin() es falso → el trigger revertiría
--    el rol a 'member'. Se reactiva justo después.
alter table public.profiles disable trigger trg_lock_role;
update public.profiles set role = 'admin', approved = true
 where email = 'joelmarinot@gmail.com';
alter table public.profiles enable trigger trg_lock_role;

-- ── Verificación: la lista tal como la verá el panel ──
select * from public.admin_list_accounts();
