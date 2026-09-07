/* Servidor local de Dubbipt.
 *
 * La app NO se puede abrir con doble clic sobre index.html: desde file:// el
 * navegador no registra el service worker, y Supabase y las librerías del CDN
 * se bloquean por origen. Hace falta servirla por http, aunque sea en este
 * mismo equipo.
 *
 * Manda las MISMAS cabeceras que Vercel (las de vercel.json), para que lo que
 * se prueba aquí se comporte como en producción. Probar sin la CSP es probar
 * otra aplicación: ya pasó una vez, y la función de IA parecía funcionar aquí
 * mientras estaba rota en el sitio de verdad.
 */
'use strict';
const http = require('http');
const fs   = require('fs');
const path = require('path');

const RAIZ   = path.join(__dirname, '..');
const PUERTO = Number(process.env.PUERTO || process.argv[2] || 8080);

// las cabeceras salen de vercel.json: una sola fuente de verdad
function cabecerasDeVercel(){
  try{
    const v = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
    const gen = (v.headers || []).find(h => h.source === '/(.*)');
    const out = {};
    for(const h of (gen ? gen.headers : [])) out[h.key] = h.value;
    return out;
  }catch(e){
    console.warn('No pude leer vercel.json, se sirve sin cabeceras:', e.message);
    return {};
  }
}
const CABECERAS = cabecerasDeVercel();

const TIPOS = {
  '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml',
  '.ttf':'font/ttf', '.pdf':'application/pdf', '.webmanifest':'application/manifest+json'
};

http.createServer((req, res) => {
  let ruta = decodeURIComponent(req.url.split('?')[0]);
  if(ruta === '/' || ruta === '') ruta = '/index.html';

  // nadie sale de la carpeta del proyecto
  const destino = path.normalize(path.join(RAIZ, ruta));
  if(!destino.startsWith(RAIZ)){ res.writeHead(403); res.end('fuera del proyecto'); return; }

  fs.readFile(destino, (err, datos) => {
    if(err){ res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('No existe: ' + ruta); return; }
    const ext = path.extname(destino).toLowerCase();
    const cab = Object.assign({}, CABECERAS, { 'Content-Type': TIPOS[ext] || 'application/octet-stream' });
    // el service worker y la config nunca se cachean, igual que en Vercel
    if(/\/(sw|config)\.js$/.test(ruta)) cab['Cache-Control'] = 'no-store, max-age=0';
    if(/\/sw\.js$/.test(ruta)) cab['Service-Worker-Allowed'] = '/';
    res.writeHead(200, cab);
    res.end(datos);
  });
}).listen(PUERTO, () => {
  console.log('');
  console.log('  Dubbipt corriendo en   http://localhost:' + PUERTO);
  console.log('  Carpeta                ' + RAIZ);
  console.log('  Cabeceras de vercel.json: ' + (Object.keys(CABECERAS).length || 'ninguna'));
  console.log('');
  console.log('  Ctrl+C para parar.');
});
