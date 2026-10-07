/* Trae DublajeCast entero a Dubbipt · especificacion 09, PRO-9
 *
 * Pedido de sala: «quiero traer prácticamente toda la plataforma: que cuando
 * le dé al botón de DublajeCast me abra todas las funciones del programa, y
 * que dentro de los programas estén las herramientas de Dubbipt también».
 *
 * DublajeCast es una app entera en un solo index.html (React + Babel en el
 * navegador, su propia nube). Rehacerla pieza a pieza son meses; aquí se COPIA
 * tal cual en `dublajecast/` y Dubbipt la abre en un marco a pantalla
 * completa. Así están todas sus funciones -dashboard, programas, casting,
 * reparto, talentos, ocupación, tráilers, DUBCARDs, breakdowns, pegado de
 * casting, producción- sin perder ninguna.
 *
 * La copia lleva cuatro retoques, y ninguno más. Cada uno tiene que encontrar
 * su sitio UNA vez: si DublajeCast cambia por dentro, esto se para y lo dice
 * en vez de copiar algo a medias.
 *   1. Sin service worker propio: viviría en el mismo sitio que el de Dubbipt.
 *   2. Su comprobación de versión NO borra cachés ni toca service workers: las
 *      cachés del sitio son las de Dubbipt.
 *   3. Sin manifiesto: no es una app que se instale aparte.
 *   4. Dentro de cada programa, la barra «Herramientas de Dubbipt»
 *      (`dublajecast/puente.js`, que es de Dubbipt y esto no toca).
 *
 * Cómo se usa, desde la carpeta de Dubbipt:
 *     node local/traer-dublajecast.js [carpeta de DublajeCast]
 * Por defecto busca ../dublajecast. Hay que volver a correrlo cada vez que
 * DublajeCast saque versión, y desplegar.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ORIGEN = path.resolve(process.argv[2] || path.join(RAIZ, '..', 'dublajecast'));
const DESTINO = path.join(RAIZ, 'dublajecast');

/** Los retoques: [qué es, qué buscar, qué poner]. */
const RETOQUES = [
  ['sin service worker propio',
   'if("serviceWorker" in navigator&&(location.protocol==="https:"',
   'if(false/* Dubbipt: el service worker del sitio es el suyo */&&"serviceWorker" in navigator&&(location.protocol==="https:"'],
  ['la versión nueva no borra las cachés de Dubbipt',
   '          if(navigator.serviceWorker){\n'
   + '            const regs=await navigator.serviceWorker.getRegistrations();\n'
   + '            for(const reg of regs){await reg.update();if(reg.waiting)reg.waiting.postMessage({type:"SKIP_WAITING"});}\n'
   + '          }\n'
   + '          if(window.caches){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));}\n',
   '          /* Dubbipt: aquí ni service workers ni cachés; las del sitio son de Dubbipt. Solo se recarga. */\n'],
  ['sin manifiesto',
   '<link rel="manifest" href="manifest.webmanifest"/>\n',
   ''],
  ['la barra de Dubbipt dentro de cada programa',
   '        {pasteOpen&&s.curSeries&&ReactDOM.createPortal(<PasteCastingModal series={s.curSeries} onClose={()=>setPasteOpen(false)}/>,document.body)}\n',
   '        {pasteOpen&&s.curSeries&&ReactDOM.createPortal(<PasteCastingModal series={s.curSeries} onClose={()=>setPasteOpen(false)}/>,document.body)}\n'
   + '        {window.DubbiptBarra&&s.curSeries&&React.createElement(window.DubbiptBarra,{serie:s.curSeries,episodios:s.serEps})}\n']
];

/** Aplica los retoques a un texto. Lanza si alguno no encuentra su sitio una sola vez. */
function retocar(html){
  let t = html.replace(/\r\n/g, '\n');
  for(const [que, busca, pone] of RETOQUES){
    const n = t.split(busca).length - 1;
    if(n !== 1) throw new Error('«' + que + '»: lo que se busca aparece ' + n + ' veces (tiene que ser 1). ¿Ha cambiado DublajeCast por dentro?');
    t = t.replace(busca, () => pone);
  }
  /* El puente, al final del cuerpo: lo usa la barra cuando React pinta, que es después. */
  const fin = t.lastIndexOf('\n</body>');
  if(fin < 0) throw new Error('no encuentro el </body> final');
  const version = (t.match(/<meta name="dc-version" content="([^"]+)"/) || [])[1] || '?';
  t = t.slice(0, fin) + '\n<script src="./puente.js"></script>' + t.slice(fin);
  t = t.replace('<head>', () => '<head>\n<!-- Copia de DublajeCast ' + version + ' dentro de Dubbipt (local/traer-dublajecast.js). No editar aquí: se pisa al volver a traerla. -->');
  return { html: t, version: version };
}

function principal(){
  const fuente = path.join(ORIGEN, 'index.html');
  if(!fs.existsSync(fuente)) throw new Error('no encuentro ' + fuente);
  const { html, version } = retocar(fs.readFileSync(fuente, 'utf8'));
  fs.mkdirSync(path.join(DESTINO, 'icons'), { recursive: true });
  fs.writeFileSync(path.join(DESTINO, 'index.html'), html, 'utf8');
  for(const ic of fs.readdirSync(path.join(ORIGEN, 'icons')))
    fs.copyFileSync(path.join(ORIGEN, 'icons', ic), path.join(DESTINO, 'icons', ic));
  /* El atajo a los modelos de IA (NVIDIA no admite llamadas desde el navegador).
     La clave la manda el navegador y solo se reenvía: no hace falta configurar nada en Vercel. */
  fs.mkdirSync(path.join(RAIZ, 'api'), { recursive: true });
  fs.copyFileSync(path.join(ORIGEN, 'api', 'llm.js'), path.join(RAIZ, 'api', 'llm.js'));
  console.log('DublajeCast ' + version + ' traído a dublajecast/ (' + Math.round(html.length / 1024) + ' KB) y api/llm.js');
}

if(require.main === module){
  try{ principal(); }catch(e){ console.error('✗ ' + e.message); process.exit(1); }
}
module.exports = { retocar, RETOQUES };
