# Poner Dubbipt a funcionar en un PC

## Lo único que hace falta

**Node.js** (versión LTS, de [nodejs.org](https://nodejs.org)). Nada más: Dubbipt
es un solo archivo `index.html` y los datos viven en Supabase, así que no hay
dependencias que instalar ni nada que compilar.

Si no quieres instalar Node en el sistema, vale con dejar una copia portátil en
`%USERPROFILE%\node-portable\node-vXX-win-x64\`: los lanzadores la encuentran
solos.

## Arrancar la app

Doble clic en **`abrir-dubbipt.cmd`**. Levanta la app en `http://localhost:8080`
y abre el navegador.

> **No abras `index.html` con doble clic.** Desde `file://` el navegador no
> registra el service worker y bloquea Supabase y las librerías del CDN por
> origen: la app parece rota sin estarlo. Hay que servirla por http.

El servidor local manda **las mismas cabeceras que Vercel**, leídas de
`vercel.json`. Es a propósito: probar sin la CSP es probar otra aplicación. Ya
pasó una vez — la función de IA funcionaba en local y estaba rota en el sitio
publicado, porque la CSP no dejaba compilar WebAssembly ni llegar a
huggingface.co.

## El overlay de Pro Tools

Doble clic en **`protools-overlay\abrir-overlay.cmd`**. La primera vez se baja
Electron (unos 100 MB); las siguientes arranca directo.

## Trabajar en el proyecto

- **`index.html`** es la aplicación entera: interfaz, lógica y estilos.
- **`config.js`** apunta al proyecto de Supabase. La clave `anon` es pública y
  segura en el navegador; lo que protege los datos son las políticas RLS.
- **`sw.js`** cachea la app. Al cambiar algo hay que subir su `VERSION`, o los
  equipos seguirán con la copia vieja.
- **`sql/`** son los scripts de base de datos, en orden. No se publican
  (`.vercelignore`), porque llegaron a servirse en abierto.
- **`local/`** y los `.cmd` son solo para correrlo aquí: tampoco se publican.

## Publicar

Se despliega en **Vercel** desde la rama `main`. Empujar a GitHub basta.
`.vercelignore` decide qué sale: solo lo que el navegador necesita.
