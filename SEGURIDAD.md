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

## Paso 9 · Canales de Realtime privados (revisión del 05-sep-2026)

De la revisión salieron tres cosas del bloque S9. Dos ya están hechas en la app:

| Hallazgo | Estado |
|---|---|
| El contador de conectados publicaba nombre, espacio y dispositivo en un canal de nombre fijo (`ddl:online`), legible por cualquier cuenta | Corregido en **v10.36.0**: ese canal ya no lleva ningún dato, solo cuenta. Los nombres van por `ddl:online:<espacio>` |
| Los mensajes del canal se aplicaban sin validar (marcas, fusiones, páginas grabadas) | Corregido en **v10.36.0** |
| Los canales siguen siendo **públicos**: quien conozca el tema puede unirse | Corregido en **v10.37.0** — SQL aplicado y `RT_PRIVATE = true` |

Y aparte, el esquema base reintroducía la auto-promoción a admin al reejecutarlo
(el trigger leía el rol de `raw_user_meta_data`); corregido en
`esquema-v11-auth.sql` para que coincida con `sql/seguridad-02-rol-admin.sql`.

### Cómo aplicar el paso 9

**El orden importa.** Al revés, la sincronía se corta en seco.

1. Ejecutar `sql/seguridad-09-canales-privados.sql` en **Supabase → SQL Editor**.
   No rompe nada por sí solo: las políticas solo actúan sobre canales marcados
   como privados, y la app todavía no los marca.
2. Poner `RT_PRIVATE = true` en `index.html` y desplegar.
3. Comprobar en sala: chip «Sincronizado», el desplazamiento del director mueve
   al escritorio, y una marca del actor llega a los dos.

Para deshacer basta volver a `RT_PRIVATE = false` y desplegar: los canales
públicos siguen funcionando aunque las políticas estén puestas.

## Paso 10 · CSP abierta para el reconocimiento de voz (v10.45.1)

El karaoke con IA corre **dentro del navegador**: el audio no sale del equipo,
solo se descarga el modelo. Para que pueda funcionar hubo que tocar dos cosas
de la CSP de `vercel.json`:

- `script-src` += `'wasm-unsafe-eval'`. El motor de voz corre sobre
  WebAssembly, y sin esto el navegador se niega a compilarlo. Es **mucho más
  estrecho** que `'unsafe-eval'`: permite compilar módulos wasm y nada más; no
  habilita ejecutar cadenas de texto como código.
- `connect-src` += `https://huggingface.co https://*.hf.co
  https://*.huggingface.co`. De ahí bajan los pesos del modelo; la descarga
  redirige a `us.aws.cdn.hf.co`, por eso hace falta el comodín.

Ambos solo amplían de dónde se puede **descargar**, no qué se puede ejecutar
desde fuera: `script-src` sigue sin admitir orígenes nuevos.

Antes de este cambio la función no podía funcionar en producción, y el
síntoma engañaba: parecía un cortafuegos del estudio. Se detectó sirviendo la
app en local **con la CSP real de `vercel.json`**, que es como hay que probar
cualquier cosa que salga a la red. Probar sin CSP es probar otra aplicación.

## Pendiente

- `ddl:library` sigue siendo un canal **global**: transporta ids de programa y
  capítulo a todas las cuentas. Sin RLS esos ids no sirven de nada, pero
  conviene pasarlo a `ddl:library:<espacio>` y tratarlo como los demás.
- CSP con `script-src 'unsafe-inline'`: la app es un único `<script>` en línea,
  así que la CSP no puede frenar código inyectado. Riesgo aceptado; para
  cerrarlo habría que sacar el script a un archivo aparte y usar nonce o hash.
- Bucket `portadas` listable sin sesión (S12).
- La librería de IA (`transformers.js`) se carga por `import()` dinámico y
  **no lleva hash SRI**, a diferencia de las demás. Solo se descarga si el
  usuario pulsa el botón de IA. Para cerrarlo habría que servirla desde el
  propio dominio.
- Bugs B6–B32 (offline, parser DOCX, service worker que recarga tablets, etc.).
