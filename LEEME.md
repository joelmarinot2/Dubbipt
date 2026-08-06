# Desglose Digital de Libreto · login real + desglose automático + espacios de trabajo

Es **tu app de siempre** (teleprómter, karaoke, ventana de grabación, sincronía
tablet↔escritorio, marcación, biblioteca) con estos cambios:
1. **Login real** (iniciar sesión / crear cuenta).
2. **Sin Excel:** subes el **guion (PDF o Word)** y el desglose de personajes se
   genera **automático**.
3. **Espacios de trabajo** (en lugar de los 8 estudios): tú creas los que quieras
   (ej. Netflix, Discovery, Emony), cada uno con sus propios programas y
   capítulos, **privados de tu cuenta**.

## Pasos
1. **Base de datos:** Supabase (proyecto rdveoxcnrtirhxpmtmck) → SQL Editor → pega
   TODO `esquema-original-v11.sql` → Run. Crea tablas, el bucket `libretos`,
   `profiles` (login) y `workspaces` (espacios). Es idempotente.
2. **Bucket:** si al guardar sale *"Bucket not found"*, ve a **Storage → New
   bucket** → nombre exacto **`libretos`** → **Public: OFF** → Create. (El SQL ya
   lo crea, pero si falló, este paso lo arregla en 2 clics.)
3. **Login:** Authentication → Providers → Email → **Confirm email = OFF** y
   **Allow new users to sign up = ON**.
4. **Vercel:** sube **todos** estos archivos a la raíz (mismo nivel que
   index.html) y despliega. Abre con **Ctrl+Shift+R**.
5. Crea tu cuenta y hazte admin:
   `update public.profiles set role='admin' where email='TU_CORREO';`

## Uso
- Al entrar, elige o **crea un espacio de trabajo** (botón 🗂️ arriba).
- Dentro del espacio: **⬆️ Cargar un capítulo** → arrastra el **guion (PDF)** →
  se genera el desglose → **💾 Guardar capítulo**.
- Cambiar de espacio: botón **🗂️** del encabezado.

## Sincronía tablet ↔ escritorio (importante)
Como los espacios son **privados de cada cuenta**, para que la tablet y el
escritorio compartan los mismos programas y se sincronicen, **ambos dispositivos
deben iniciar sesión con la MISMA cuenta**. Luego pulsa **Sincronizar** en cada
uno y elige 📱 Tablet o 💻 Escritorio (el canal va por espacio de trabajo).

## Notas
- El desglose automático deja el **talento vacío**; asígnalos con tu herramienta
  de siempre.
- **Word (.docx)** genera personajes y libreto de texto, pero sin página
  renderizada ni teleprómter por página (eso requiere PDF).
