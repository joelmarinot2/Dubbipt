# Seguridad · Dubbipt

Correcciones derivadas de la auditoría del 28-ago-2026. Cada paso indica qué parte
va en la **app** (ya desplegada por Vercel al hacer push) y qué parte hay que
ejecutar a mano en **Supabase → SQL Editor** o en el **panel**.

Los `.sql` de la carpeta `sql/` son idempotentes: se pueden ejecutar más de una vez.
Este archivo y la carpeta `sql/` **no se despliegan** (ver `.vercelignore`).

| # | Hallazgo | App | Supabase |
|---|---|---|---|
| 1 | RPC ejecutables sin cuenta y sin comprobar dueño | — | `sql/seguridad-01-rpc-marcas-progreso.sql` |
| 2 | Auto-promoción a admin | v10.15.1 | `sql/seguridad-02-rol-admin.sql` |
| 3 | Bucket `libretos` abierto a todos los registrados | v10.15.2 | `sql/seguridad-03-bucket-libretos.sql` |
| 4 | Registro abierto sin verificar correo | — | **Panel** (abajo) |
| 5 | `episode_data` sin programa visible por todos; directorio de perfiles | v10.16.0 | `sql/seguridad-05-episode-data-profiles.sql` |
| 6 | XSS almacenado vía `color` / `page` / `totalInts` | v10.16.0 | — |
| 7 | Sin cabeceras de seguridad; CDN sin fijar; archivos internos publicados | v10.16.0 (`vercel.json`, `.vercelignore`) | — |
| 8 | Pérdida de datos B1–B5 (talento, Limpiar, cambio de capítulo, progreso, dividir/unir) | v10.16.0 | — |

## Paso 4 · Cerrar el registro (panel de Supabase)

Hoy cualquiera puede crear una cuenta con un correo inventado y quedar dentro del
rol `authenticated`. Dos opciones, de más a menos segura:

**Opción A — solo invitaciones (recomendada para un estudio):**
1. Supabase → **Authentication → Sign In / Providers → Email**: desactiva
   **Allow new users to sign up**.
2. Para dar de alta a alguien: **Authentication → Users → Add user → Send invitation**
   (o *Create new user* con contraseña). El perfil se crea solo con rol `member`.

**Opción B — registro abierto pero con correo verificado:**
1. **Authentication → Sign In / Providers → Email**: activa **Confirm email**.
2. **Authentication → Rate Limits**: baja *sign-ups* a algo razonable (p. ej. 5/hora por IP).

En ambos casos, comprueba después desde una ventana privada que
`https://rdveoxcnrtirhxpmtmck.supabase.co/auth/v1/settings` (con la anon key en
`apikey`) devuelve `"disable_signup": true` (A) o `"mailer_autoconfirm": false` (B).

## Cómo verificar que todo quedó aplicado

En el SQL Editor:

```sql
-- funciones: ninguna security definer salvo is_admin/owns_* (helpers), y sin EXECUTE para PUBLIC
select p.proname, p.prosecdef, p.proacl
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' order by 1;

-- políticas: ninguna con "true" en tablas de datos
select tablename, policyname, cmd, coalesce(qual, with_check) as condicion
  from pg_policies where schemaname in ('public','storage') order by 1,2;
```

Desde fuera (sin sesión, solo con la anon key): las tablas devuelven `[]`, los RPC
devuelven `401`, y `dubbipt.vercel.app/esquema-original-v11.sql` devuelve `404`.

## Pendiente (fuera de los 8 pasos)

Del informe completo quedan sin corregir: canales Realtime sin `private:true` ni
validación de payload (S9), bucket `portadas` listable sin sesión (S12), y los
bugs B6–B32 (offline, parser DOCX, service worker que recarga tablets, etc.).
