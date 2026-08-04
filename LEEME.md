# Desglose Digital de Libreto · tu app original + login real + desglose automático

Es **tu app de siempre** (teleprómter, karaoke, ventana de grabación, sincronía
tablet↔escritorio, estudios, marcación, biblioteca) con dos cambios:
1. **Login real** (iniciar sesión / crear cuenta) en vez del acceso por estudio.
2. **Sin Excel**: subes el **guion (PDF o Word)** y el desglose de personajes se
   genera **automático**.

## Pasos
1. **Base de datos:** Supabase (proyecto rdveoxcnrtirhxpmtmck) → SQL Editor →
   pega TODO `esquema-original-v11.sql` → Run. Crea tablas, bucket `libretos` y
   `profiles` (para el login). Es idempotente.
2. **Login sin verificación de correo:** Authentication → Providers → Email →
   deja **Confirm email = OFF**. Y activa **Allow new users to sign up** para
   poder registrarte.
3. **Subir a Vercel:** arrastra **todos** estos archivos a la raíz del proyecto
   (mismo nivel que index.html) y despliega. Abre con **Ctrl+Shift+R**.
4. Entra, **crea tu cuenta**, y hazte admin en SQL Editor:
   `update public.profiles set role='admin' where email='TU_CORREO';`

## Uso
- Entra a un programa → panel **⬆️ Cargar un capítulo** → arrastra el **guion
  (PDF)** → se genera el desglose (personajes, páginas, intervenciones) → pulsa
  **💾 Guardar capítulo**. Todo lo demás funciona igual que antes.
- **Talentos:** el desglose automático deja el talento vacío; puedes asignarlos
  con la herramienta de siempre. (Si quieres, te agrego edición de talento en la
  tarjeta.)
- **Word (.docx):** también se acepta; genera personajes y libreto de texto, pero
  sin página renderizada ni teleprompter por página (eso necesita PDF).

## Archivos
`index.html` · `config.js` · `sw.js` · `manifest.json` · `manifest.webmanifest` ·
`icon-192.png` · `icon-512.png` · `apple-touch-icon.png` · `vercel.json` ·
`esquema-original-v11.sql`
