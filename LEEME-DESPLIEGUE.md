# Desglose Digital de Libreto · v11 (paquete completo, listo para subir)

App web con **login/registro real**, **base de datos nueva** (Supabase),
**sin carga manual de desglose**, y **desglose automático de personajes** desde
un guion **PDF o Word**. Sin paso de compilación: son archivos estáticos.

## Archivos del paquete

| Archivo | Qué hace |
|---|---|
| `index.html` | La app completa (biblioteca + carga de guion + desglose + avance) |
| `auth.js` | Login, registro y guarda de ruta (nada abre sin sesión) |
| `desglose-auto.js` | Motor que lee PDF/DOCX y arma el desglose editable |
| `config.js` | Tus claves de Supabase (ya vienen las actuales) |
| `esquema-v11-auth.sql` | Crea las tablas, seguridad (RLS) y el bucket `guiones` |
| `sw.js`, `manifest.json`, `vercel.json` | PWA + hosting |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Iconos |

## Paso 1 · Base de datos (5 min, una vez)

1. Entra a **Supabase → tu proyecto → SQL Editor → New query**.
2. Pega **todo** `esquema-v11-auth.sql` y pulsa **Run** (debe decir *Success*).
3. **Authentication → Providers → Email:** deja *Confirm email* en **OFF**
   (así el estudio entra sin verificar el correo).
4. Para volverte administrador, corre en el SQL Editor:
   ```sql
   update public.profiles set role='admin' where email='TU_CORREO';
   ```
   (primero regístrate en la app con ese correo, luego corre esta línea).

> **Base nueva (directriz 2):** si quieres una BD desde cero, crea *New project*
> en Supabase, corre ahí el `.sql`, y pega en `config.js` el **Project URL** y la
> **anon key** del proyecto nuevo (Settings → API).

## Paso 2 · Subir a Vercel (3 min)

- **Arrastrar y soltar:** vercel.com → *Add New… → Project* → arrastra **toda la
  carpeta** → *Deploy*. En ~30 s te da la URL.
- **O por terminal:** en la carpeta, `npx vercel` y luego `npx vercel --prod`.

## Paso 3 · Usar la app

1. Abre la URL → **Crear cuenta** (nombre, correo, contraseña ≥ 8) o **Entrar**.
2. **＋ Nuevo programa** → **＋ Nuevo capítulo**.
3. Dentro del capítulo, **arrastra el guion (PDF o Word)**. En segundos aparece el
   desglose: personaje, talento, intervenciones, páginas y escenas.
4. **Revisa y edita** (renombrar une personajes; ✕ elimina) → **💾 Guardar desglose**.
5. En la vista de desglose, toca los números de página para marcar **grabado**;
   el avance se guarda en la nube y lo ve todo el estudio. Clic en un personaje
   abre sus diálogos.

## Cómo se cumplen las 4 directrices

1. **Autenticación:** `auth.js` (Supabase Auth = contraseñas cifradas en el
   servidor + JWT). Interfaz de login/registro con validación en cliente y
   servidor; ruta protegida: la app no arranca sin sesión. Roles en `profiles`.
2. **Base de datos nueva:** capa de acceso centralizada en `config.js` +
   `window.sb`. Esquema relacional con `profiles`, `shows`, `episodes`, `scripts`
   (guion procesado) y `breakdowns` (desglose estructurado), todo con RLS.
3. **Sin carga manual:** no hay caja de `.xlsm` ni endpoints de importación; el
   único ingreso es el guion.
4. **Motor automático:** `pdf.js` + `mammoth.js` extraen el texto; el parser por
   reglas detecta cabeceras de personaje, cuenta intervenciones, agrupa por página
   y por escena, y lo muestra editable antes de guardar.

## Notas

- **LLM opcional:** para que un modelo normalice nombres/talentos, crea en Vercel
  `/api/refinar` (POST `{full_text}` → `{characters:[{name,talent}]}`, con la clave
  del lado del servidor) y en `index.html` añade
  `DDLDesglose.config.llmEndpoint = '/api/refinar';`. Sin esto, funciona por reglas.
- **DOCX y páginas:** Word no tiene páginas fijas; se estiman (~1800 caracteres por
  página). Con PDF las páginas son exactas.
- **Qué NO incluye este paquete** (para mantenerlo limpio y enfocado en tus 4
  directrices): teleprompter, karaoke, sincronía tablet↔escritorio en tiempo real,
  MIDI y modo estudio de la versión anterior. El modelo de datos es compatible, así
  que esos módulos pueden re-añadirse después sobre esta base.
```
```
